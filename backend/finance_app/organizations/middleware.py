"""
Subscription enforcement middleware.

Checks subscription status on every API request:
- Active trial/subscription → Allow everything (within plan limits)
- Expired → Read-only mode (block POST/PUT/PATCH/DELETE)
- User/customer limits → Block adding new users/customers when exceeded
"""
from django.http import JsonResponse
from django.utils import timezone


# Paths that are ALWAYS allowed (no subscription check)
EXEMPT_PATHS = (
    '/api-auth/',          # Login endpoint
    '/api/users/signup/',  # Self-service signup
    '/api/users/me/',      # User profile (needed for frontend to load)
    '/api/users/invite/',  # Invite acceptance
    '/api/users/change-password/',
    '/sysadmin/',          # Django admin
    '/api/organizations/subscription/',  # Billing page (must work even when expired)
    '/api/organizations/payment/',  # Payment (must work even when expired)
    '/api/organizations/',  # Org listing (needed for org selector) — must be last
)

# Paths where we enforce user/customer limits
USER_CREATE_PATHS = ('/api/users/register/',)
CUSTOMER_CREATE_PATHS = ('/api/customers/',)


class SubscriptionMiddleware:
    """Enforce subscription status and plan limits on every API request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip non-API requests and exempt paths
        if not request.path.startswith('/api') or self._is_exempt(request.path):
            return self.get_response(request)

        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return self.get_response(request)

        # Superusers bypass all checks
        if request.user.is_superuser:
            return self.get_response(request)

        # GET requests are always allowed (read-only access)
        if request.method == 'GET':
            return self.get_response(request)

        # Find the user's active organization subscription
        subscription = self._get_subscription(request)
        if subscription is None:
            # No subscription found — allow (legacy orgs without subscription)
            return self.get_response(request)

        # Auto-expire if trial/period has ended
        subscription.check_and_expire()

        # Check if subscription is read-only (expired/cancelled)
        if subscription.is_read_only:
            if request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
                plan_label = subscription.get_plan_display()
                if subscription.is_trial:
                    msg = 'Your 10-day free trial has expired. Please upgrade to a paid plan to continue.'
                else:
                    msg = f'Your {plan_label} subscription has expired. Please renew to continue.'

                return JsonResponse({
                    'error': msg,
                    'subscription_expired': True,
                    'plan': subscription.plan,
                    'status': subscription.status,
                }, status=403)

        # Check user limit on user creation
        if request.method == 'POST' and any(request.path.startswith(p) for p in USER_CREATE_PATHS):
            current_users = subscription.organization.users.filter(is_active=True).count()
            if current_users >= subscription.max_users:
                return JsonResponse({
                    'error': f'Your {subscription.get_plan_display()} plan allows {subscription.max_users} users. '
                             f'You currently have {current_users}. Please upgrade to add more.',
                    'limit_exceeded': 'users',
                    'current': current_users,
                    'max': subscription.max_users,
                }, status=403)

        # Check customer limit on customer creation
        if request.method == 'POST' and any(request.path.startswith(p) for p in CUSTOMER_CREATE_PATHS):
            from customers.models import Customer
            current_customers = Customer.objects.filter(
                organization=subscription.organization
            ).count()
            if current_customers >= subscription.max_customers:
                return JsonResponse({
                    'error': f'Your {subscription.get_plan_display()} plan allows {subscription.max_customers} customers. '
                             f'You currently have {current_customers}. Please upgrade to add more.',
                    'limit_exceeded': 'customers',
                    'current': current_customers,
                    'max': subscription.max_customers,
                }, status=403)

        return self.get_response(request)

    def _is_exempt(self, path):
        """Check if the path is exempt from subscription checks."""
        return any(path.startswith(p) for p in EXEMPT_PATHS)

    def _get_subscription(self, request):
        """Get the subscription for the user's selected organization."""
        from organizations.models import Subscription

        # Check if org is specified in the request
        org_id = request.GET.get('org') or request.POST.get('org')

        if org_id and org_id != 'all':
            try:
                return Subscription.objects.select_related('organization').get(
                    organization_id=int(org_id)
                )
            except (Subscription.DoesNotExist, ValueError):
                pass

        # Fall back to the user's first organization
        user_orgs = request.user.organizations.all()
        if user_orgs.exists():
            try:
                return Subscription.objects.select_related('organization').get(
                    organization=user_orgs.first()
                )
            except Subscription.DoesNotExist:
                pass

        return None
