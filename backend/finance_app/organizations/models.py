from django.db import models


def generate_org_code(name):
    """Auto-generate a unique organization code from the name.
    
    Tries progressively longer prefixes and numeric suffixes
    to guarantee uniqueness.
    """
    # Try first 3 uppercase letters
    base = name[:3].upper().strip()
    if not Organization.objects.filter(code=base).exists():
        return base

    # Try first 4 letters
    if len(name) >= 4:
        base = name[:4].upper().strip()
        if not Organization.objects.filter(code=base).exists():
            return base

    # Add numeric suffix: SEN2, SEN3, ...
    short = name[:3].upper().strip()
    for i in range(2, 100):
        candidate = f"{short}{i}"
        if not Organization.objects.filter(code=candidate).exists():
            return candidate

    # Fallback: ORG-<next_id>
    return f"ORG{Organization.objects.count() + 1}"


class Organization(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, editable=False)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=15, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = generate_org_code(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'organizations_organization'
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'
        ordering = ['name']


# ─── Plan Limits (centralized config) ────────────────────────────────────────
PLAN_LIMITS = {
    'trial':    {'max_users': 3,   'max_customers': 20,   'price': 0},
    'starter':  {'max_users': 2,   'max_customers': 50,   'price': 499},
    'pro':      {'max_users': 5,   'max_customers': 200,  'price': 999},
    'business': {'max_users': 999, 'max_customers': 9999, 'price': 1500},
}


class Subscription(models.Model):
    """Tracks the billing plan and subscription status for each organization."""

    PLAN_CHOICES = [
        ('trial', 'Free Trial'),
        ('starter', 'Starter'),
        ('pro', 'Professional'),
        ('business', 'Business'),
    ]
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    organization = models.OneToOneField(
        Organization, on_delete=models.CASCADE, related_name='subscription'
    )
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='trial')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')

    # Trial tracking
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Billing period
    current_period_start = models.DateField(null=True, blank=True)
    current_period_end = models.DateField(null=True, blank=True)

    # Plan limits
    amount_per_month = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_users = models.IntegerField(default=3)
    max_customers = models.IntegerField(default=20)

    # Razorpay integration (filled when payment is made)
    razorpay_subscription_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations_subscription'
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'

    def __str__(self):
        return f"{self.organization.name} — {self.get_plan_display()} ({self.get_status_display()})"

    @property
    def is_trial(self):
        return self.status == 'trial'

    @property
    def is_active(self):
        """Subscription is usable (trial or paid active)."""
        return self.status in ('trial', 'active')

    @property
    def is_expired(self):
        """Check if trial or subscription has expired."""
        from django.utils import timezone
        if self.status == 'expired':
            return True
        if self.status == 'trial' and self.trial_ends_at:
            return timezone.now() > self.trial_ends_at
        if self.status == 'active' and self.current_period_end:
            return timezone.now().date() > self.current_period_end
        return False

    @property
    def is_read_only(self):
        """Expired subscriptions become read-only."""
        return self.is_expired or self.status in ('expired', 'cancelled')

    @property
    def days_remaining(self):
        """Days left in trial or current billing period."""
        from django.utils import timezone
        if self.status == 'trial' and self.trial_ends_at:
            delta = self.trial_ends_at - timezone.now()
            return max(0, delta.days)
        if self.status == 'active' and self.current_period_end:
            delta = self.current_period_end - timezone.now().date()
            return max(0, delta.days)
        return 0

    def check_and_expire(self):
        """Auto-expire if trial/period has ended. Returns True if expired."""
        if self.is_expired and self.status not in ('expired', 'cancelled'):
            self.status = 'expired'
            self.save(update_fields=['status', 'updated_at'])
            return True
        return False

    def upgrade_to(self, plan_name):
        """Upgrade subscription to a paid plan."""
        from django.utils import timezone
        from datetime import timedelta

        limits = PLAN_LIMITS.get(plan_name)
        if not limits:
            raise ValueError(f"Unknown plan: {plan_name}")

        self.plan = plan_name
        self.status = 'active'
        self.amount_per_month = limits['price']
        self.max_users = limits['max_users']
        self.max_customers = limits['max_customers']
        self.current_period_start = timezone.now().date()
        self.current_period_end = timezone.now().date() + timedelta(days=30)
        self.save()

    @classmethod
    def create_trial(cls, organization):
        """Create a 10-day free trial for a new organization."""
        from django.utils import timezone
        from datetime import timedelta

        trial_limits = PLAN_LIMITS['trial']
        return cls.objects.create(
            organization=organization,
            plan='trial',
            status='trial',
            trial_ends_at=timezone.now() + timedelta(days=10),
            amount_per_month=0,
            max_users=trial_limits['max_users'],
            max_customers=trial_limits['max_customers'],
        )
