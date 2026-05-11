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
