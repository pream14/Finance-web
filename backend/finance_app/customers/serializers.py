from rest_framework import serializers
from .models import Customer
from transactions.serializers import LoanSerializer

class CustomerSerializer(serializers.ModelSerializer):
    loans = LoanSerializer(many=True, read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True, default=None)
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone_number', 'alternate_phone', 'address', 'area', 
                 'organization', 'organization_name',
                 'loans', 'created_at', 'created_by']
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'organization']
    
    def create(self, validated_data):
        # Get the user from the request
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)