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
