from datetime import date
from decimal import Decimal
from django.db import models
from django.conf import settings
from customers.models import Customer

class Loan(models.Model):
    LOAN_TYPE_CHOICES = (
        ('DC Loan', 'DC Loan'),
        ('Monthly Interest Loan', 'Monthly Interest Loan'),
        ('DL Loan', 'DL Loan'),
    )
    
    customer = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE,
        related_name='loans'
    )
    loan_type = models.CharField(max_length=25, choices=LOAN_TYPE_CHOICES)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField(default=date.today)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('settled', 'Settled'),
        ('overdue', 'Overdue'),
    ], default='active')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loans_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Pending interest tracking (for partial interest payments)
    pending_interest = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Unpaid interest from previous cycles")
    
    # Monthly Interest Loan specific fields
    monthly_interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Monthly interest rate percentage")
    interest_cycle_day = models.PositiveIntegerField(null=True, blank=True, help_text="Day of month when interest is due")
    
    # DC Loan specific fields
    daily_collection_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Daily collection amount")
    expected_total_days = models.PositiveIntegerField(null=True, blank=True, help_text="Expected total days for completion")
    
    # DL Loan specific fields
    daily_interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Daily interest rate percentage")
    max_days = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum days for loan completion")
    last_interest_payment_date = models.DateField(null=True, blank=True, help_text="Last date when interest was paid")
    
    # Payment method tracking
    payment_method = models.CharField(max_length=10, choices=[
        ('cash', 'Cash'),
        ('online', 'Online Transfer'),
    ], default='cash', help_text="How the loan amount was disbursed")
    
    def __str__(self):
        return f"{self.customer.name} - {self.loan_type} - {self.principal_amount}"
    
    def calculate_monthly_interest(self):
        """Calculate monthly interest based on remaining principal and rate"""
        if self.loan_type != 'Monthly Interest Loan' or not self.monthly_interest_rate:
            return Decimal('0')
        interest = self.remaining_amount * (self.monthly_interest_rate / Decimal('100'))
        return interest.quantize(Decimal('0.01'))
    
    def calculate_dl_interest(self, as_of_date=None):
        """Calculate DL loan interest based on days from last interest payment or start date"""
        if self.loan_type != 'DL Loan' or not self.daily_interest_rate:
            return Decimal('0'), 0
        if as_of_date is None:
            as_of_date = date.today()
        
        # Use last interest payment date if available, otherwise use start date
        start_date = self.last_interest_payment_date or self.start_date
        days = (as_of_date - start_date).days
        if days < 0:
            days = 0
        # Interest = principal × (daily_rate / 100) × days
        interest = self.remaining_amount * (self.daily_interest_rate / Decimal('100')) * days
        return interest.quantize(Decimal('0.01')), days
    
    def get_total_pending_interest(self):
        """Get total pending interest including current cycle"""
        if self.loan_type == 'Monthly Interest Loan':
            return self.pending_interest + self.calculate_monthly_interest()
        elif self.loan_type == 'DL Loan':
            dl_interest, _ = self.calculate_dl_interest()
            return self.pending_interest + dl_interest
        return self.pending_interest
    
    class Meta:
        db_table = 'transactions_loan'
        verbose_name = 'Loan'
        verbose_name_plural = 'Loans'
        indexes = [
            models.Index(fields=['customer']),
        ]


class Transaction(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('cash', 'Cash'),
        ('online', 'Online'),
    )
    
    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    asal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    interest_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True, blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions_recorded'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    def __str__(self):
        return f"{self.loan.customer.name} - {self.amount} - {self.created_at.strftime('%Y-%m-%d')}"
    
    def save(self, *args, **kwargs):
        # Calculate total amount from asal and interest if not provided
        if not self.amount:
            self.amount = (self.asal_amount or Decimal('0')) + (self.interest_amount or Decimal('0'))

        # Only for new transactions
        if not self.pk:
            loan = self.loan
            
            # Update the loan's remaining amount: only principal (asal) reduces the balance
            if self.asal_amount is not None:
                principal_reduction = Decimal(str(self.asal_amount))
            else:
                principal_reduction = Decimal(str(self.amount)) if self.amount else Decimal('0')
            
            loan.remaining_amount -= principal_reduction
            
            # Handle pending interest for Monthly and DL loans
            if loan.loan_type == 'Monthly Interest Loan':
                expected_interest = loan.calculate_monthly_interest() + loan.pending_interest
                interest_paid = Decimal(str(self.interest_amount)) if self.interest_amount else Decimal('0')
                # If paid less than expected, add to pending
                if interest_paid < expected_interest:
                    loan.pending_interest = expected_interest - interest_paid
                else:
                    loan.pending_interest = Decimal('0')
            
            elif loan.loan_type == 'DL Loan':
                expected_interest, _ = loan.calculate_dl_interest()
                expected_interest = expected_interest + loan.pending_interest
                interest_paid = Decimal(str(self.interest_amount)) if self.interest_amount else Decimal('0')
                # If paid less than expected, add to pending
                if interest_paid < expected_interest:
                    loan.pending_interest = expected_interest - interest_paid
                else:
                    loan.pending_interest = Decimal('0')
                    # Update last interest payment date when interest is fully paid
                    loan.last_interest_payment_date = self.created_at.date()
            
            # Check if loan is fully paid
            if loan.remaining_amount <= 0:
                loan.remaining_amount = Decimal('0')
                loan.status = 'settled'
            
            loan.save()
        
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'transactions_transaction'
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        indexes = [
            models.Index(fields=['loan']),
            models.Index(fields=['created_at']),
            models.Index(fields=['created_by']),
        ]