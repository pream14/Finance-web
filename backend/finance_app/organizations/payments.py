"""
Razorpay payment integration for subscription upgrades.

Flow:
1. Frontend calls create_order → gets Razorpay order_id
2. Frontend opens Razorpay checkout modal with that order_id
3. User pays → Razorpay returns payment_id + signature
4. Frontend calls verify_payment with those details
5. Backend verifies signature → activates subscription
"""
import hashlib
import hmac
import json

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Organization, Subscription, PLAN_LIMITS


def _get_razorpay_client():
    """Get Razorpay client. Returns None if keys aren't configured."""
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET
    if not key_id or not key_secret:
        return None
    try:
        import razorpay
        return razorpay.Client(auth=(key_id, key_secret))
    except ImportError:
        return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Create a Razorpay order for subscription payment.
    
    POST body: { org_id: int, plan: str }
    Returns: { order_id, amount, currency, key_id, ... }
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

    if not request.user.is_superuser and not request.user.organizations.filter(id=org.id).exists():
        return Response({'error': 'Access denied.'}, status=403)

    plan = PLAN_LIMITS[plan_name]
    amount_inr = plan['price']
    amount_paise = int(amount_inr * 100)  # Razorpay uses paise

    client = _get_razorpay_client()
    if client is None:
        return Response({
            'error': 'Payment gateway is not configured. Please contact support.',
        }, status=503)

    try:
        order = client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'notes': {
                'org_id': str(org.id),
                'org_name': org.name,
                'plan': plan_name,
                'user_id': str(request.user.id),
            }
        })
    except Exception as e:
        return Response({'error': f'Failed to create payment order: {str(e)}'}, status=500)

    return Response({
        'order_id': order['id'],
        'amount': amount_paise,
        'amount_display': amount_inr,
        'currency': 'INR',
        'key_id': settings.RAZORPAY_KEY_ID,
        'plan': plan_name,
        'plan_display': dict(Subscription.PLAN_CHOICES).get(plan_name, plan_name),
        'org_name': org.name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """Verify Razorpay payment and activate subscription.
    
    POST body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, org_id, plan }
    """
    order_id = request.data.get('razorpay_order_id', '')
    payment_id = request.data.get('razorpay_payment_id', '')
    signature = request.data.get('razorpay_signature', '')
    org_id = request.data.get('org_id')
    plan_name = request.data.get('plan')

    if not all([order_id, payment_id, signature, org_id, plan_name]):
        return Response({'error': 'Missing payment details.'}, status=400)

    # Verify signature
    key_secret = settings.RAZORPAY_KEY_SECRET
    if not key_secret:
        return Response({'error': 'Payment gateway not configured.'}, status=503)

    # Razorpay signature verification
    message = f"{order_id}|{payment_id}"
    expected_signature = hmac.new(
        key_secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    if expected_signature != signature:
        return Response({'error': 'Payment verification failed. Invalid signature.'}, status=400)

    # Payment verified — activate subscription
    try:
        org = Organization.objects.get(id=int(org_id))
    except (Organization.DoesNotExist, ValueError):
        return Response({'error': 'Organization not found.'}, status=404)

    try:
        sub = Subscription.objects.get(organization=org)
    except Subscription.DoesNotExist:
        sub = Subscription.create_trial(org)

    # Upgrade the plan
    sub.upgrade_to(plan_name)
    sub.razorpay_payment_id = payment_id
    sub.razorpay_subscription_id = order_id
    sub.save()

    # Log the event
    try:
        from users.auth import _log_security_event, _get_client_ip
        _log_security_event(
            'USER_CREATED',  # Reusing event type for audit
            request.user.username,
            _get_client_ip(request),
            f'Subscription upgraded: org={org.name} plan={plan_name} payment={payment_id}'
        )
    except Exception:
        pass

    return Response({
        'message': f'Payment successful! Your plan has been upgraded to {sub.get_plan_display()}.',
        'plan': sub.plan,
        'status': sub.status,
        'current_period_end': sub.current_period_end.isoformat() if sub.current_period_end else None,
    })
