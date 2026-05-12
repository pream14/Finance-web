from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import secrets


class User(AbstractUser):
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('employee', 'Employee'),
    )
    
    phone_number = models.CharField(max_length=15, unique=True, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employee')
    is_primary_owner = models.BooleanField(
        default=False,
        help_text='Primary owners (created by superadmin) can add other owners. Secondary owners cannot.'
    )
    area = models.CharField(max_length=50, blank=True, null=True)
    must_change_password = models.BooleanField(
        default=True,
        help_text='Force user to change password on next login'
    )
    organizations = models.ManyToManyField(
        'organizations.Organization',
        blank=True,
        related_name='users',
        help_text='Organizations this user has access to'
    )
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"
    
    class Meta:
        db_table = 'users_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'


class InviteToken(models.Model):
    """One-time invite token for new users to set their own password."""
    token = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invite_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    EXPIRY_HOURS = 48

    @property
    def is_valid(self):
        """Token is valid if not used and not expired."""
        return self.used_at is None and self.expires_at > timezone.now()

    @property
    def is_expired(self):
        return self.expires_at <= timezone.now()

    @property
    def is_used(self):
        return self.used_at is not None

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])

    @classmethod
    def create_for_user(cls, user):
        """Create a new invite token for a user. Invalidates any existing tokens."""
        # Mark old tokens as expired
        cls.objects.filter(user=user, used_at__isnull=True).update(
            expires_at=timezone.now()
        )
        return cls.objects.create(
            token=secrets.token_urlsafe(36),
            user=user,
            expires_at=timezone.now() + timezone.timedelta(hours=cls.EXPIRY_HOURS),
        )

    def __str__(self):
        status = 'used' if self.is_used else ('expired' if self.is_expired else 'valid')
        return f"Invite for {self.user.username} ({status})"

    class Meta:
        db_table = 'users_invitetoken'
        ordering = ['-created_at']


class SecurityLog(models.Model):
    """Audit log for security-relevant events."""
    EVENT_TYPES = (
        ('LOGIN_SUCCESS', 'Login Success'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('LOGIN_BLOCKED', 'Login Blocked (Lockout)'),
        ('LOGIN_INACTIVE', 'Login Attempt on Inactive Account'),
        ('PASSWORD_CHANGED', 'Password Changed'),
        ('PASSWORD_RESET', 'Password Reset via Invite'),
        ('USER_CREATED', 'User Created'),
        ('USER_DEACTIVATED', 'User Deactivated'),
        ('TOKEN_ROTATED', 'Token Rotated'),
    )

    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users_securitylog'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['username', 'created_at']),
        ]

    def __str__(self):
        status = self.get_event_type_display()
        return f"[{status}] {self.username} at {self.created_at}"
