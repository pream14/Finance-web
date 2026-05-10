from rest_framework import serializers
from .models import Expense, ExpenseCategory, Income


class ExpenseCategorySerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True, default=None)

    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name', 'organization', 'organization_name', 'created_at']
        read_only_fields = ['created_at', 'organization']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    payment_method = serializers.CharField(default='cash', required=False)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category = serializers.PrimaryKeyRelatedField(
        queryset=ExpenseCategory.objects.all(),
        required=False,
        allow_null=True
    )
    last_edited_by_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True, default=None)

    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'payment_method', 'category', 'category_name',
                  'organization', 'organization_name',
                  'created_by_name', 'created_at', 'updated_at', 'last_edited_by_name']
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'last_edited_by_name', 'organization']

    def get_last_edited_by_name(self, obj):
        if obj.last_edited_by:
            return obj.last_edited_by.get_full_name() or obj.last_edited_by.username
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        try:
            return super().create(validated_data)
        except Exception:
            validated_data.pop('payment_method', None)
            validated_data.pop('category', None)
            return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['last_edited_by'] = self.context['request'].user
        return super().update(instance, validated_data)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get('payment_method'):
            data['payment_method'] = 'cash'
        return data


class IncomeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    last_edited_by_name = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True, default=None)

    class Meta:
        model = Income
        fields = ['id', 'description', 'amount', 'source', 'payment_method',
                  'organization', 'organization_name',
                  'created_by_name', 'created_at', 'updated_at', 'last_edited_by_name']
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'last_edited_by_name', 'organization']

    def get_last_edited_by_name(self, obj):
        if obj.last_edited_by:
            return obj.last_edited_by.get_full_name() or obj.last_edited_by.username
        return None

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['last_edited_by'] = self.context['request'].user
        return super().update(instance, validated_data)
