from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'phone_number', 'area', 'is_active')
    list_filter = BaseUserAdmin.list_filter + ('role',)
    search_fields = BaseUserAdmin.search_fields + ('phone_number',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra', {'fields': ('role', 'phone_number', 'area')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra', {'fields': ('role', 'phone_number', 'area')}),
    )