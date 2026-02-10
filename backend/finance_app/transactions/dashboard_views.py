from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q, Max
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .models import Loan, Transaction


class DashboardStatsView(APIView):
    """
    Dashboard statistics API endpoint providing:
    - Monthly interest due today
    - Overdue payments (DC, Monthly Interest, DL loans)
    - Low balance warnings
    - Total outstanding amount
    - Recent activity feed
    - Quick stats
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = date.today()
        today_day = today.day
        
        # Get all active loans
        active_loans = Loan.objects.filter(status='active').select_related('customer')
        
        # 1. Monthly Interest Due Today
        # Loans where interest_cycle_day matches today's date
        monthly_interest_due = active_loans.filter(
            loan_type='Monthly Interest Loan',
            interest_cycle_day=today_day
        ).prefetch_related('transactions')
        
        monthly_interest_due_list = []
        for loan in monthly_interest_due:
            # Calculate interest due
            interest_rate = loan.monthly_interest_rate or Decimal('0')
            interest_due = (loan.principal_amount * interest_rate / 100)
            
            # Check if interest was already collected this month
            month_start = today.replace(day=1)
            interest_collected_this_month = loan.transactions.filter(
                created_at__date__gte=month_start,
                interest_amount__gt=0
            ).exists()
            
            monthly_interest_due_list.append({
                'loan_id': loan.id,
                'customer_id': loan.customer.id,
                'customer_name': loan.customer.name,
                'customer_phone': loan.customer.phone_number,
                'principal_amount': str(loan.principal_amount),
                'remaining_amount': str(loan.remaining_amount),
                'interest_rate': str(interest_rate),
                'interest_due': str(interest_due),
                'is_collected': interest_collected_this_month,
            })
        
        # 2. Overdue Payments - Only Monthly Interest Loans
        overdue_alerts = []
        
        # Monthly Interest: Passed interest cycle day without payment
        monthly_loans = active_loans.filter(loan_type='Monthly Interest Loan')
        for loan in monthly_loans:
            if loan.interest_cycle_day and loan.interest_cycle_day < today_day:
                # Check if interest was paid this month
                month_start = today.replace(day=1)
                interest_paid = loan.transactions.filter(
                    created_at__date__gte=month_start,
                    interest_amount__gt=0
                ).exists()
                
                if not interest_paid:
                    days_overdue = today_day - loan.interest_cycle_day
                    interest_rate = loan.monthly_interest_rate or Decimal('0')
                    interest_due = (loan.principal_amount * interest_rate / 100)
                    overdue_alerts.append({
                        'loan_id': loan.id,
                        'customer_id': loan.customer.id,
                        'customer_name': loan.customer.name,
                        'loan_type': 'Monthly Interest',
                        'days_overdue': days_overdue,
                        'expected_amount': str(interest_due),
                        'remaining_amount': str(loan.remaining_amount),
                    })
        
        # Sort overdue by days_overdue descending
        overdue_alerts.sort(key=lambda x: x.get('days_overdue', 0), reverse=True)
        
        # 3. Low Balance Warnings (remaining < 20% of principal)
        low_balance_loans = []
        for loan in active_loans:
            if loan.remaining_amount < (loan.principal_amount * Decimal('0.2')):
                low_balance_loans.append({
                    'loan_id': loan.id,
                    'customer_id': loan.customer.id,
                    'customer_name': loan.customer.name,
                    'loan_type': loan.loan_type,
                    'principal_amount': str(loan.principal_amount),
                    'remaining_amount': str(loan.remaining_amount),
                    'percentage_remaining': round(
                        float(loan.remaining_amount / loan.principal_amount * 100), 1
                    ) if loan.principal_amount else 0,
                })
        
        # 4. Total Outstanding Amount
        total_outstanding = active_loans.aggregate(
            total=Sum('remaining_amount')
        )['total'] or Decimal('0')
        
        # 5. Recent Activity Feed (last 10 transactions)
        recent_transactions = Transaction.objects.select_related(
            'loan', 'loan__customer', 'created_by'
        ).order_by('-created_at')[:10]
        
        recent_activity = []
        for txn in recent_transactions:
            collected_by = txn.created_by.get_full_name() or txn.created_by.username
            recent_activity.append({
                'id': txn.id,
                'loan_id': txn.loan.id,
                'customer_id': txn.loan.customer.id,
                'customer_name': txn.loan.customer.name,
                'amount': str(txn.amount),
                'asal_amount': str(txn.asal_amount or 0),
                'interest_amount': str(txn.interest_amount or 0),
                'payment_method': txn.payment_method,
                'collected_by': collected_by,
                'created_at': txn.created_at.isoformat(),
                'loan_type': txn.loan.loan_type,
            })
        
        # 6. Quick Stats
        total_active_customers = active_loans.values('customer').distinct().count()
        
        # Average collection per day (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        daily_collections = Transaction.objects.filter(
            created_at__date__gte=thirty_days_ago
        ).values('created_at__date').annotate(
            daily_total=Sum('amount')
        )
        
        if daily_collections:
            total_collected = sum(d['daily_total'] or 0 for d in daily_collections)
            avg_collection_per_day = total_collected / 30
        else:
            avg_collection_per_day = Decimal('0')
        
        # New loans this month
        month_start = today.replace(day=1)
        new_loans_this_month = Loan.objects.filter(
            created_at__date__gte=month_start
        ).select_related('customer').order_by('-created_at')[:10]
        
        new_loans_list = [{
            'loan_id': loan.id,
            'customer_id': loan.customer.id,
            'customer_name': loan.customer.name,
            'loan_type': loan.loan_type,
            'principal_amount': str(loan.principal_amount),
            'created_at': loan.created_at.isoformat(),
        } for loan in new_loans_this_month]
        
        return Response({
            'monthly_interest_due': monthly_interest_due_list,
            'overdue_alerts': overdue_alerts,
            'low_balance_warnings': low_balance_loans,
            'total_outstanding': str(total_outstanding),
            'recent_activity': recent_activity,
            'quick_stats': {
                'total_active_customers': total_active_customers,
                'total_active_loans': active_loans.count(),
                'avg_collection_per_day': str(round(avg_collection_per_day, 2)),
            },
            'new_loans_this_month': new_loans_list,
        })
