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
    amount_given_to_customer = serializers.SerializerMethodField()
    first_month_interest_paid = serializers.BooleanField(write_only=True, required=False, default=True)
    
    class Meta:
        model = Loan
        fields = ['id', 'customer', 'loan_type', 'principal_amount', 'remaining_amount',
                 'start_date', 'status', 'pending_interest', 'created_at', 'updated_at',
                 # Monthly Interest Loan fields
                 'monthly_interest_rate', 'interest_cycle_day',
                 # DC Loan fields
                 'daily_collection_amount', 'expected_total_days', 'dc_deduction_amount',
                 # DL Loan fields
                 'daily_interest_rate', 'max_days', 'last_interest_payment_date',
                 # Payment method
                 'payment_method',
                 # Closure fields
                 'closed_at', 'closure_note',
                 # Calculated fields
                 'expected_interest', 'total_pending_interest', 'days_since_start', 'has_transactions',
                 'amount_given_to_customer',
                 # Write-only fields
                 'first_month_interest_paid']
        read_only_fields = ['remaining_amount', 'pending_interest', 'status', 'created_by', 'created_at', 'updated_at']
    
    def get_has_transactions(self, obj):
        """Check if loan has any transactions"""
        return obj.transactions.exists()
    
    def get_amount_given_to_customer(self, obj):
        """Amount given to customer after DC deduction"""
        if obj.loan_type == 'DC Loan' and obj.dc_deduction_amount:
            return str(obj.amount_given_to_customer)
        return str(obj.principal_amount)
    
    def get_expected_interest(self, obj):
        """Get current cycle's expected interest"""
        result = '0.00'
        if obj.loan_type == 'Monthly Interest Loan':
            # If interest already paid for this cycle, show 0
            if obj.is_current_cycle_interest_paid():
                result = '0.00'
            else:
                result = str(obj.calculate_monthly_interest())
        elif obj.loan_type == 'DL Loan':
            interest, _ = obj.calculate_dl_interest()
            result = str(interest)
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
        from datetime import date as date_cls
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data['remaining_amount'] = validated_data.get('principal_amount', 0)
        # Pop the flag before creating (not a model field)
        first_month_paid = validated_data.pop('first_month_interest_paid', True)
        # For Monthly Interest Loans, only mark interest as paid if first month was collected
        if validated_data.get('loan_type') == 'Monthly Interest Loan' and first_month_paid:
            validated_data['last_interest_payment_date'] = validated_data.get('start_date', date_cls.today())
        return super().create(validated_data)


class LoanDetailSerializer(serializers.ModelSerializer):
    customer = CustomerMinimalSerializer(read_only=True)
    expected_interest = serializers.SerializerMethodField()
    total_pending_interest = serializers.SerializerMethodField()
    days_since_start = serializers.SerializerMethodField()
    amount_given_to_customer = serializers.SerializerMethodField()
    
    class Meta:
        model = Loan
        fields = ['id', 'customer', 'loan_type', 'principal_amount', 'remaining_amount', 
                 'start_date', 'status', 'pending_interest', 'created_at', 'updated_at',
                 # Monthly Interest Loan fields
                 'monthly_interest_rate', 'interest_cycle_day',
                 # DC Loan fields
                 'daily_collection_amount', 'expected_total_days', 'dc_deduction_amount',
                 # DL Loan fields
                 'daily_interest_rate', 'max_days', 'last_interest_payment_date',
                 # Payment method
                 'payment_method',
                 # Closure fields
                 'closed_at', 'closure_note',
                 # Calculated fields
                 'expected_interest', 'total_pending_interest', 'days_since_start',
                 'amount_given_to_customer']
    
    def get_expected_interest(self, obj):
        """Get current cycle's expected interest"""
        if obj.loan_type == 'Monthly Interest Loan':
            if obj.is_current_cycle_interest_paid():
                return '0.00'
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
    
    def get_amount_given_to_customer(self, obj):
        """Amount given to customer after DC deduction"""
        if obj.loan_type == 'DC Loan' and obj.dc_deduction_amount:
            return str(obj.amount_given_to_customer)
        return str(obj.principal_amount)

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
        from decimal import Decimal
        from datetime import date

        # When updating a transaction, we need to adjust the loan balance
        old_asal = instance.asal_amount if instance.asal_amount is not None else (instance.amount or 0)
        new_asal = validated_data.get('asal_amount', instance.asal_amount)
        if new_asal is None:
            new_asal = validated_data.get('amount', instance.amount) or 0
        
        # Calculate the difference and adjust loan balance
        difference = new_asal - old_asal
        if difference != 0:
            loan = instance.loan
            # Validate: new asal shouldn't exceed remaining balance + old asal (what was already paid)
            max_allowed = loan.remaining_amount + Decimal(str(old_asal))
            if Decimal(str(new_asal)) > max_allowed:
                from rest_framework import serializers as drf_serializers
                raise drf_serializers.ValidationError({
                    'asal_amount': f'Principal amount (₹{new_asal}) exceeds remaining balance (₹{max_allowed}).'
                })
            loan.remaining_amount -= difference
            if loan.remaining_amount <= 0:
                loan.status = 'settled'
            elif loan.status == 'settled':
                loan.status = 'active'
            loan.save()
        
        # Save the updated transaction first
        updated = super().update(instance, validated_data)
        
        # Recalculate interest tracking for Monthly Interest and DL loans
        loan = instance.loan
        if loan.loan_type in ('Monthly Interest Loan', 'DL Loan'):
            self._recalculate_interest_from_transactions(loan)
        
        # Invalidate cached cashbook entries after the transaction date
        from transactions.cashbook_views import invalidate_cashbook_from
        invalidate_cashbook_from(instance.created_at.date())
        
        return updated
    
    def _recalculate_interest_from_transactions(self, loan):
        """Replay all transactions to recalculate pending_interest and last_interest_payment_date."""
        from decimal import Decimal

        all_txns = loan.transactions.order_by('created_at')
        pending = Decimal('0')
        last_interest_date = None

        for txn in all_txns:
            interest_paid = Decimal(str(txn.interest_amount)) if txn.interest_amount else Decimal('0')
            if interest_paid > 0:
                if loan.loan_type == 'Monthly Interest Loan':
                    monthly_interest = loan.calculate_monthly_interest()
                    expected = monthly_interest + max(Decimal('0'), pending)
                    # Allow pending to go negative (advance credit)
                    pending = expected - interest_paid
                    # Only update last_interest_date for non-advance payments
                    # (when there was actual debt to cover)
                    if expected > 0:
                        last_interest_date = txn.created_at.date()
                elif loan.loan_type == 'DL Loan':
                    dl_interest, _ = loan.calculate_dl_interest(as_of_date=txn.created_at.date())
                    expected = dl_interest + pending
                    if interest_paid < expected:
                        pending = expected - interest_paid
                    else:
                        pending = Decimal('0')
                        last_interest_date = txn.created_at.date()

        loan.pending_interest = pending
        loan.last_interest_payment_date = last_interest_date
        loan.save()

