from rest_framework import serializers
from .models import Customer
from transactions.serializers import LoanSerializer

class CustomerSerializer(serializers.ModelSerializer):
    loans = LoanSerializer(many=True, read_only=True)
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone_number', 'address', 'area', 
                 'is_daily', 'is_monthly', 'is_dl', 'loans', 'created_at', 'created_by']
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Get the user from the request
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)