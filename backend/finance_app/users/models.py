from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('owner', 'Owner'),
        ('employee', 'Employee'),
    )
    
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employee')
    area = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"
    
    class Meta:
        db_table = 'users_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'