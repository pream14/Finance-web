from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Organization
from .serializers import OrganizationSerializer, OrganizationMinimalSerializer


class IsSuperAdmin(permissions.BasePermission):
    """Only allow superusers (platform admins) to access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class OrganizationViewSet(viewsets.ModelViewSet):
    """CRUD for organizations.
    
    - GET list: authenticated users see only their assigned orgs.
    - POST/PUT/DELETE: super admin only.
    """
    serializer_class = OrganizationSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all()
        return user.organizations.all()


class AllOrganizationsView(viewsets.ReadOnlyModelViewSet):
    """Super admin endpoint: list ALL organizations regardless of assignment."""
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    queryset = Organization.objects.all()


# ─── Subscription API ────────────────────────────────────────────────────────
from rest_framework.decorators import api_view, permission_classes as perm_classes
from .models import Subscription, PLAN_LIMITS


@api_view(['GET'])
@perm_classes([permissions.IsAuthenticated])
def get_subscription(request):
    """Get subscription details for the user's organization."""
    org_id = request.GET.get('org')

    if org_id:
        try:
            org = Organization.objects.get(id=int(org_id))
        except (Organization.DoesNotExist, ValueError):
            return Response({'error': 'Organization not found.'}, status=404)
    else:
        orgs = request.user.organizations.all()
        if not orgs.exists():
            return Response({'error': 'No organization found.'}, status=404)
        org = orgs.first()

    try:
        sub = Subscription.objects.get(organization=org)
        sub.check_and_expire()
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found for this organization.'}, status=404)

    # Count current usage
    current_users = org.users.filter(is_active=True).count()
    try:
        from customers.models import Customer
        current_customers = Customer.objects.filter(organization=org).count()
    except Exception:
        current_customers = 0

    return Response({
        'plan': sub.plan,
        'plan_display': sub.get_plan_display(),
        'status': sub.status,
        'status_display': sub.get_status_display(),
        'is_trial': sub.is_trial,
        'is_active': sub.is_active,
        'is_read_only': sub.is_read_only,
        'days_remaining': sub.days_remaining,
        'trial_ends_at': sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        'current_period_start': sub.current_period_start.isoformat() if sub.current_period_start else None,
        'current_period_end': sub.current_period_end.isoformat() if sub.current_period_end else None,
        'amount_per_month': str(sub.amount_per_month),
        'max_users': sub.max_users,
        'max_customers': sub.max_customers,
        'current_users': current_users,
        'current_customers': current_customers,
        'organization': {
            'id': org.id,
            'name': org.name,
        },
        'available_plans': [
            {
                'name': key,
                'display': dict(Subscription.PLAN_CHOICES).get(key, key),
                'price': val['price'],
                'max_users': val['max_users'],
                'max_customers': val['max_customers'],
            }
            for key, val in PLAN_LIMITS.items()
            if key != 'trial'
        ],
    })


@api_view(['POST'])
@perm_classes([permissions.IsAuthenticated])
def upgrade_plan(request):
    """Upgrade the organization's subscription plan.
    
    For now this is a direct upgrade (no Razorpay).
    When Razorpay is integrated, this will verify payment first.
    """
    org_id = request.data.get('org_id')
    plan_name = request.data.get('plan')

    if not org_id or not plan_name:
        return Response({'error': 'org_id and plan are required.'}, status=400)

    if plan_name not in PLAN_LIMITS or plan_name == 'trial':
        return Response({'error': f'Invalid plan: {plan_name}'}, status=400)

    # Verify user owns this org
    try:
        org = Organization.objects.get(id=int(org_id))
    except (Organization.DoesNotExist, ValueError):
        return Response({'error': 'Organization not found.'}, status=404)

    if not request.user.is_superuser:
        if not request.user.organizations.filter(id=org.id).exists():
            return Response({'error': 'You do not have access to this organization.'}, status=403)
        if request.user.role != 'owner':
            return Response({'error': 'Only owners can upgrade plans.'}, status=403)

    # Get or create subscription
    try:
        sub = Subscription.objects.get(organization=org)
    except Subscription.DoesNotExist:
        sub = Subscription.create_trial(org)

    # TODO: When Razorpay is integrated, verify payment_id here before upgrading
    # razorpay_payment_id = request.data.get('razorpay_payment_id')
    # if not verify_payment(razorpay_payment_id): return error

    sub.upgrade_to(plan_name)

    return Response({
        'message': f'Successfully upgraded to {sub.get_plan_display()} plan!',
        'plan': sub.plan,
        'status': sub.status,
        'current_period_end': sub.current_period_end.isoformat() if sub.current_period_end else None,
        'max_users': sub.max_users,
        'max_customers': sub.max_customers,
    })
