from django.contrib import admin
from .models import Expense, ExpenseCategory, Income


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name',)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'description', 'amount', 'category', 'payment_method', 'created_by', 'created_at')
    list_filter = ('created_at', 'category', 'payment_method')
    search_fields = ('description',)
    readonly_fields = ('created_by', 'created_at')
    list_select_related = ('created_by', 'category')

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ('id', 'source', 'description', 'amount', 'payment_method', 'created_by', 'created_at')
    list_filter = ('created_at', 'payment_method')
    search_fields = ('description', 'source')
    readonly_fields = ('created_by', 'created_at')
    list_select_related = ('created_by',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)