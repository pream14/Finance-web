"""
Custom authentication view with security features:
- Account lockout after 5 failed attempts (15-minute cooldown)
- Token rotation on every login (old token invalidated)
- Security audit logging for all auth events
"""
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authtoken.models import Token

from users.models import User, SecurityLog


# In-memory lockout tracking (resets on server restart, which is fine)
# For multi-server deployments, use cache backend instead.
_login_failures = {}  # { username: { 'count': int, 'last_attempt': datetime } }

LOCKOUT_THRESHOLD = 5       # Lock after 5 failed attempts
LOCKOUT_DURATION = 15 * 60  # 15 minutes in seconds


def _check_lockout(username):
    """Check if an account is locked out. Returns (is_locked, remaining_seconds)."""
    record = _login_failures.get(username)
    if not record or record['count'] < LOCKOUT_THRESHOLD:
        return False, 0

    elapsed = (timezone.now() - record['last_attempt']).total_seconds()
    remaining = LOCKOUT_DURATION - elapsed
    if remaining <= 0:
        # Lockout expired, reset
        del _login_failures[username]
        return False, 0

    return True, int(remaining)


def _record_failure(username):
    """Record a failed login attempt."""
    now = timezone.now()
    record = _login_failures.get(username)
    if record:
        # Reset count if lockout period has passed
        elapsed = (now - record['last_attempt']).total_seconds()
        if elapsed > LOCKOUT_DURATION:
            _login_failures[username] = {'count': 1, 'last_attempt': now}
        else:
            record['count'] += 1
            record['last_attempt'] = now
    else:
        _login_failures[username] = {'count': 1, 'last_attempt': now}

    return _login_failures[username]['count']


def _clear_failures(username):
    """Clear failure count on successful login."""
    _login_failures.pop(username, None)


def _get_client_ip(request):
    """Extract client IP from request (handles reverse proxy)."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
        return ip if ip else None
    ip = request.META.get('REMOTE_ADDR')
    return ip if ip else None


def _log_security_event(event_type, username, ip_address, details=''):
    """Log a security-relevant event to the SecurityLog model."""
    import logging
    logger = logging.getLogger('security')
    logger.info(f"[{event_type}] user={username} ip={ip_address} {details}")

    try:
        SecurityLog.objects.create(
            event_type=event_type,
            username=username,
            ip_address=ip_address,
            details=details,
        )
    except Exception:
        pass  # Don't crash if model isn't migrated yet


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def secure_login(request):
    """Custom login endpoint with lockout protection and token rotation."""
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    ip = _get_client_ip(request)

    if not username or not password:
        return Response(
            {'error': 'Username and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check lockout
    is_locked, remaining = _check_lockout(username)
    if is_locked:
        minutes = remaining // 60
        _log_security_event('LOGIN_BLOCKED', username, ip, f'Account locked, {remaining}s remaining')
        return Response(
            {'error': f'Account temporarily locked due to too many failed attempts. Try again in {minutes + 1} minutes.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Authenticate
    user = authenticate(request, username=username, password=password)

    if user is None:
        count = _record_failure(username)
        remaining_attempts = max(0, LOCKOUT_THRESHOLD - count)
        _log_security_event('LOGIN_FAILED', username, ip, f'Attempt {count}/{LOCKOUT_THRESHOLD}')

        error_msg = 'Invalid username or password.'
        if remaining_attempts > 0 and count >= 3:
            error_msg += f' {remaining_attempts} attempts remaining before lockout.'
        elif remaining_attempts == 0:
            error_msg = f'Account locked for {LOCKOUT_DURATION // 60} minutes due to too many failed attempts.'

        return Response(
            {'error': error_msg},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not user.is_active:
        _log_security_event('LOGIN_INACTIVE', username, ip)
        return Response(
            {'error': 'This account has been deactivated. Contact your administrator.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Success — clear failures and rotate token
    _clear_failures(username)

    # Delete old token and create a new one (token rotation)
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)

    _log_security_event('LOGIN_SUCCESS', username, ip)

    return Response({
        'token': token.key,
        'user_id': user.id,
        'username': user.username,
        'role': getattr(user, 'role', 'employee'),
        'is_superuser': user.is_superuser,
    })
