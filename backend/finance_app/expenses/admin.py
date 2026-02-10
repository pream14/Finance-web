from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'description', 'amount', 'created_by', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('description',)
    readonly_fields = ('created_by', 'created_at')
    list_select_related = ('created_by',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)