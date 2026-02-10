from django.db import models
from django.conf import settings

class Customer(models.Model):
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15, db_index=True)
    address = models.TextField()
    area = models.CharField(max_length=50, db_index=True)
    is_daily = models.BooleanField(default=False)
    is_monthly = models.BooleanField(default=False)
    is_dl = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.phone_number})"
    
    class Meta:
        db_table = 'customers_customer'
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['area']),
        ]