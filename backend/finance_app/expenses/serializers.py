from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    payment_method = serializers.CharField(default='cash', required=False)

    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'payment_method', 'created_by_name', 'created_at']
        read_only_fields = ['created_by', 'created_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        # If payment_method column doesn't exist yet, remove it to avoid DB error
        try:
            return super().create(validated_data)
        except Exception:
            validated_data.pop('payment_method', None)
            return super().create(validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure payment_method has a value even if column doesn't exist
        if not data.get('payment_method'):
            data['payment_method'] = 'cash'
        return data
