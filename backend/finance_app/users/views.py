from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.response import Response
from organizations.serializers import OrganizationMinimalSerializer


class IsOwnerOrSuperUser(BasePermission):
    """Allow access to owners, admins, and superusers."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or
            getattr(request.user, 'role', '') in ('owner', 'admin')
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return the authenticated user's profile including organization info."""
    user = request.user
    orgs = user.organizations.all()
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email or '',
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'full_name': user.get_full_name() or user.username,
        'role': getattr(user, 'role', 'employee'),
        'is_superuser': user.is_superuser,
        'is_primary_owner': getattr(user, 'is_primary_owner', False),
        'must_change_password': getattr(user, 'must_change_password', False),
        'organizations': OrganizationMinimalSerializer(orgs, many=True).data,
    })

from rest_framework import generics
from .serializers import UserCreateSerializer, UserListSerializer
from .models import User

class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsOwnerOrSuperUser]

class UserListView(generics.ListAPIView):
    serializer_class = UserListSerializer
    permission_classes = [IsOwnerOrSuperUser]

    def get_queryset(self):
        user = self.request.user
        org_param = self.request.query_params.get('org')
        global_param = self.request.query_params.get('global')

        # Only the Super Admin panel passes ?global=true — show ALL users
        if user.is_superuser and global_param == 'true':
            return User.objects.all().order_by('-date_joined')

        # For everyone else (including superusers on Add Staff):
        # filter employees by the selected org or user's own orgs
        if org_param and org_param != 'all':
            try:
                org_ids = [int(org_param)]
            except (ValueError, TypeError):
                org_ids = []
        else:
            org_ids = list(user.organizations.values_list('id', flat=True))

        return User.objects.filter(
            organizations__id__in=org_ids, role='employee'
        ).distinct().order_by('-date_joined')

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsOwnerOrSuperUser]

    def perform_destroy(self, instance):
        # Soft delete: just block them
        instance.is_active = False
        instance.save()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError

    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(old_password):
        return Response({'old_password': ['Wrong password.']}, status=400)
    
    # Validate the new password meets strength requirements
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response({'new_password': list(e.messages)}, status=400)
    
    user.set_password(new_password)
    user.must_change_password = False
    user.save()
    return Response({'status': 'password set'}, status=200)


# ─── Invite Token Endpoints ──────────────────────────────────────────────────
from rest_framework.permissions import AllowAny
from rest_framework.decorators import authentication_classes
from .models import InviteToken


@api_view(['GET'])
@authentication_classes([])  # No auth needed — skip CSRF enforcement
@permission_classes([AllowAny])
def validate_invite(request, token):
    """Check if an invite token is valid. Returns user info if valid.
    
    No authentication required — the token IS the authentication.
    """
    try:
        invite = InviteToken.objects.select_related('user').get(token=token)
    except InviteToken.DoesNotExist:
        return Response(
            {'error': 'Invalid invite link. Please contact your manager.'},
            status=404
        )

    if invite.is_used:
        return Response(
            {'error': 'This invite link has already been used. Please login with your password.'},
            status=410  # 410 Gone
        )

    if invite.is_expired:
        return Response(
            {'error': 'This invite link has expired. Please contact your manager for a new one.'},
            status=410
        )

    user = invite.user
    return Response({
        'valid': True,
        'user': {
            'username': user.username,
            'first_name': user.first_name,
            'full_name': user.get_full_name() or user.username,
        }
    })


@api_view(['POST'])
@authentication_classes([])  # No auth needed — skip CSRF enforcement
@permission_classes([AllowAny])
def accept_invite(request, token):
    """Accept an invite: set the user's password and mark token as used.
    
    No authentication required — the token IS the authentication.
    """
    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError

    try:
        invite = InviteToken.objects.select_related('user').get(token=token)
    except InviteToken.DoesNotExist:
        return Response(
            {'error': 'Invalid invite link. Please contact your manager.'},
            status=404
        )

    if invite.is_used:
        return Response(
            {'error': 'This invite link has already been used.'},
            status=410
        )

    if invite.is_expired:
        return Response(
            {'error': 'This invite link has expired. Please contact your manager for a new one.'},
            status=410
        )

    new_password = request.data.get('password', '').strip()
    if not new_password:
        return Response({'error': 'Password is required.'}, status=400)

    # Validate password strength
    user = invite.user
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response({'password': list(e.messages)}, status=400)

    # Set the password and activate the account
    user.set_password(new_password)
    user.must_change_password = False
    user.is_active = True
    user.save()

    # Mark token as used
    invite.mark_used()

    return Response({
        'status': 'success',
        'message': 'Password set successfully! You can now login.',
        'username': user.username,
    })


@api_view(['POST'])
@permission_classes([IsOwnerOrSuperUser])
def resend_invite(request, user_id):
    """Regenerate an invite token for a user. Owner/SuperAdmin only.
    
    Used when the original invite expired or needs to be re-sent.
    """
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)

    # Create new token (automatically invalidates old ones)
    invite = InviteToken.create_for_user(target_user)

    return Response({
        'invite_token': invite.token,
        'username': target_user.username,
        'expires_at': invite.expires_at.isoformat(),
    })

