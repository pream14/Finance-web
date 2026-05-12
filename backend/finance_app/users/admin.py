from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SecurityLog


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_primary_owner', 'phone_number', 'area', 'is_active')
    list_filter = BaseUserAdmin.list_filter + ('role', 'is_primary_owner')
    search_fields = BaseUserAdmin.search_fields + ('phone_number',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra', {'fields': ('role', 'is_primary_owner', 'phone_number', 'area')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Extra', {'fields': ('role', 'is_primary_owner', 'phone_number', 'area')}),
    )


@admin.register(SecurityLog)
class SecurityLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'event_type', 'username', 'ip_address', 'details')
    list_filter = ('event_type',)
    search_fields = ('username', 'ip_address', 'details')
    ordering = ('-created_at',)
    readonly_fields = ('event_type', 'username', 'ip_address', 'details', 'created_at')

    def has_add_permission(self, request):
        return False  # Logs are system-generated only

    def has_change_permission(self, request, obj=None):
        return False  # Read-only

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superadmin can purge logs