from django.contrib import admin
from .models import Loan, Transaction


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('customer', 'loan_type', 'principal_amount', 'remaining_amount', 'start_date', 'status', 'created_by', 'created_at')
    list_filter = ('loan_type', 'status', 'created_at')
    search_fields = ('customer__name', 'customer__phone_number')
    readonly_fields = ('created_by', 'created_at', 'updated_at')
    list_select_related = ('customer', 'created_by')

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_customer', 'loan', 'amount', 'asal_amount', 'interest_amount', 'payment_method', 'created_by', 'created_at')
    list_filter = ('payment_method', 'created_at')
    search_fields = ('loan__customer__name', 'loan__customer__phone_number', 'description')
    readonly_fields = ('created_by', 'created_at')
    list_select_related = ('loan', 'loan__customer', 'created_by')

    @admin.display(description='Customer')
    def get_customer(self, obj):
        return obj.loan.customer.name if obj.loan_id else '—'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)