from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_number', 'area', 'address', 'created_by', 'created_at')
    list_filter = ('area', 'created_at')
    search_fields = ('name', 'phone_number', 'address', 'area')
    readonly_fields = ('created_by', 'created_at', 'updated_at')
    list_select_related = ('created_by',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)