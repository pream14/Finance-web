from django.contrib import admin
from .models import Organization, Subscription


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'phone', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    readonly_fields = ('code', 'created_at')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('organization', 'plan', 'status', 'days_remaining_display', 'max_users', 'max_customers', 'amount_per_month', 'updated_at')
    list_filter = ('plan', 'status')
    search_fields = ('organization__name',)
    readonly_fields = ('created_at', 'updated_at')
    list_editable = ('plan', 'status')

    fieldsets = (
        (None, {
            'fields': ('organization', 'plan', 'status')
        }),
        ('Trial', {
            'fields': ('trial_ends_at',)
        }),
        ('Billing Period', {
            'fields': ('current_period_start', 'current_period_end', 'amount_per_month')
        }),
        ('Limits', {
            'fields': ('max_users', 'max_customers')
        }),
        ('Razorpay', {
            'fields': ('razorpay_subscription_id', 'razorpay_payment_id'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def days_remaining_display(self, obj):
        days = obj.days_remaining
        if obj.status in ('expired', 'cancelled'):
            return '❌ Expired'
        if days == 0:
            return '⚠️ Today'
        return f'{days} days'
    days_remaining_display.short_description = 'Remaining'
