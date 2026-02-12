from decimal import Decimal
from rest_framework import serializers
from .models import Loan, Transaction
from customers.models import Customer


class CustomerMinimalSerializer(serializers.ModelSerializer):
    """Minimal customer for LoanDetailSerializer; avoids circular import with customers.serializers."""
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone_number', 'address', 'area']


class LoanSerializer(serializers.ModelSerializer):
    expected_interest = serializers.SerializerMethodField()
    total_pending_interest = serializers.SerializerMethodField()
    days_since_start = serializers.SerializerMethodField()
    has_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Loan
        fields = ['id', 'customer', 'loan_type', 'principal_amount', 'remaining_amount',
                 'start_date', 'status', 'pending_interest', 'created_at', 'updated_at',
                 # Monthly Interest Loan fields
                 'monthly_interest_rate', 'interest_cycle_day',
                 # DC Loan fields
                 'daily_collection_amount', 'expected_total_days',
                 # DL Loan fields
                 'daily_interest_rate', 'max_days', 'last_interest_payment_date',
                 # Calculated fields
                 'expected_interest', 'total_pending_interest', 'days_since_start', 'has_transactions']
        read_only_fields = ['remaining_amount', 'pending_interest', 'start_date', 'status', 'created_by', 'created_at', 'updated_at']
    
    def get_has_transactions(self, obj):
        """Check if loan has any transactions"""
        return obj.transactions.exists()
    
    def get_expected_interest(self, obj):
        """Get current cycle's expected interest"""
        result = '0.00'
        if obj.loan_type == 'Monthly Interest Loan':
            result = str(obj.calculate_monthly_interest())
        elif obj.loan_type == 'DL Loan':
            interest, _ = obj.calculate_dl_interest()
            result = str(interest)
        print(f"DEBUG get_expected_interest: Loan {obj.id}, Type: {obj.loan_type}, monthly_rate: {obj.monthly_interest_rate}, daily_rate: {obj.daily_interest_rate}, result: {result}")
        return result
    
    def get_total_pending_interest(self, obj):
        """Get total pending interest including past unpaid"""
        return str(obj.get_total_pending_interest())
    
    def get_days_since_start(self, obj):
        """Get days since loan start (for DL loans)"""
        if obj.loan_type == 'DL Loan':
            from datetime import date
            return (date.today() - obj.start_date).days
        return 0

    def validate(self, data):
        loan_type = data.get('loan_type')
        
        # Validate Monthly Interest Loan fields
        if loan_type == 'Monthly Interest Loan':
            if not data.get('monthly_interest_rate'):
                raise serializers.ValidationError("Monthly interest rate is required for Monthly Interest Loan")
            if not data.get('interest_cycle_day'):
                raise serializers.ValidationError("Interest cycle day is required for Monthly Interest Loan")
            if data.get('interest_cycle_day', 0) < 1 or data.get('interest_cycle_day', 0) > 31:
                raise serializers.ValidationError("Interest cycle day must be between 1 and 31")
        
        # Validate DC Loan fields
        elif loan_type == 'DC Loan':
            if not data.get('daily_collection_amount'):
                raise serializers.ValidationError("Daily collection amount is required for DC Loan")
        
        # Validate DL Loan fields
        elif loan_type == 'DL Loan':
            if not data.get('daily_interest_rate'):
                raise serializers.ValidationError("Daily interest rate is required for DL Loan")
        
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['remaining_amount'] = validated_data.get('principal_amount', 0)
        return super().create(validated_data)


class LoanDetailSerializer(serializers.ModelSerializer):
    customer = CustomerMinimalSerializer(read_only=True)
    expected_interest = serializers.SerializerMethodField()
    total_pending_interest = serializers.SerializerMethodField()
    days_since_start = serializers.SerializerMethodField()
    
    class Meta:
        model = Loan
        fields = ['id', 'customer', 'loan_type', 'principal_amount', 'remaining_amount', 
                 'start_date', 'status', 'pending_interest', 'created_at', 'updated_at',
                 # Monthly Interest Loan fields
                 'monthly_interest_rate', 'interest_cycle_day',
                 # DC Loan fields
                 'daily_collection_amount', 'expected_total_days',
                 # DL Loan fields
                 'daily_interest_rate', 'max_days', 'last_interest_payment_date',
                 # Calculated fields
                 'expected_interest', 'total_pending_interest', 'days_since_start']
    
    def get_expected_interest(self, obj):
        """Get current cycle's expected interest"""
        if obj.loan_type == 'Monthly Interest Loan':
            return str(obj.calculate_monthly_interest())
        elif obj.loan_type == 'DL Loan':
            interest, _ = obj.calculate_dl_interest()
            return str(interest)
        return '0.00'
    
    def get_total_pending_interest(self, obj):
        """Get total pending interest including past unpaid"""
        return str(obj.get_total_pending_interest())
    
    def get_days_since_start(self, obj):
        """Get days since loan start (for DL loans)"""
        if obj.loan_type == 'DL Loan':
            from datetime import date
            return (date.today() - obj.start_date).days
        return 0

class TransactionSerializer(serializers.ModelSerializer):
    loan_type = serializers.CharField(source='loan.loan_type', read_only=True)
    customer_name = serializers.CharField(source='loan.customer.name', read_only=True)
    customer_id = serializers.IntegerField(source='loan.customer.id', read_only=True)
    collected_by_name = serializers.SerializerMethodField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    
    def get_collected_by_name(self, obj):
        user = obj.created_by
        if user.get_full_name():
            return user.get_full_name()
        return user.username
    
    class Meta:
        model = Transaction
        fields = ['id', 'loan', 'loan_type', 'customer_id', 'customer_name', 'amount', 
                 'asal_amount', 'interest_amount', 'payment_method', 'description',
                 'collected_by_name', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']
    
    def validate(self, data):
        # Calculate amount if not provided but asal_amount or interest_amount are
        asal = data.get('asal_amount') or 0
        interest = data.get('interest_amount') or 0
        amount = data.get('amount')
        
        # If no amount but we have asal or interest, calculate it
        if not amount and (asal or interest):
            data['amount'] = asal + interest
        elif not amount and not asal and not interest:
            raise serializers.ValidationError("Either 'amount' or 'asal_amount'/'interest_amount' is required")
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # When updating a transaction, we need to adjust the loan balance
        old_asal = instance.asal_amount or instance.amount or 0
        new_asal = validated_data.get('asal_amount', instance.asal_amount)
        if new_asal is None:
            new_asal = validated_data.get('amount', instance.amount) or 0
        
        # Calculate the difference and adjust loan balance
        difference = new_asal - old_asal
        if difference != 0:
            loan = instance.loan
            loan.remaining_amount -= difference
            if loan.remaining_amount <= 0:
                loan.status = 'settled'
            elif loan.status == 'settled':
                loan.status = 'active'
            loan.save()
        
        return super().update(instance, validated_data)

