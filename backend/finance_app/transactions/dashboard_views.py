import calendar
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Count, Q, Max
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .models import Loan, Transaction


def _last_day_of_month(dt):
    """Return the last day number of the month for the given date."""
    return calendar.monthrange(dt.year, dt.month)[1]


def _effective_cycle_day(cycle_day, dt):
    """Clamp cycle_day to the last day of the month if it exceeds it.
    E.g. cycle_day=31 in April (30 days) returns 30."""
    last_day = _last_day_of_month(dt)
    return min(cycle_day, last_day)


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
        last_day = _last_day_of_month(today)
        is_last_day = today_day == last_day
        
        # Get all active loans
        active_loans = Loan.objects.filter(status='active').select_related('customer')
        
        # 1. Monthly Interest Due Today
        # Match loans whose effective cycle day is today.
        # If today is the last day of the month, also include loans with
        # interest_cycle_day > last_day (e.g. day 31 in a 30-day month).
        if is_last_day:
            cycle_day_filter = Q(interest_cycle_day=today_day) | Q(interest_cycle_day__gt=last_day)
        else:
            cycle_day_filter = Q(interest_cycle_day=today_day)

        monthly_interest_due = active_loans.filter(
            Q(loan_type='Monthly Interest Loan') & cycle_day_filter
        ).prefetch_related('transactions')
        
        monthly_interest_due_list = []
        for loan in monthly_interest_due:
            # Calculate interest due
            interest_rate = loan.monthly_interest_rate or Decimal('0')
            interest_due = (loan.remaining_amount * interest_rate / 100)
            
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
        
        # Monthly Interest: Check for unpaid interest using the model's
        # cycle-tracking logic, which works correctly across month boundaries.
        monthly_loans = active_loans.filter(loan_type='Monthly Interest Loan')
        for loan in monthly_loans:
            if not loan.interest_cycle_day:
                continue
            effective_day = _effective_cycle_day(loan.interest_cycle_day, today)
            
            # Skip loans whose interest is due today (shown in "Today's Interest")
            if effective_day == today_day:
                continue
            
            # Use the model's method to check if interest is current
            if not loan.is_current_cycle_interest_paid():
                # Count how many cycles are unpaid
                unpaid_cycles = loan._count_unpaid_cycles()
                
                # Calculate days overdue from the first missed cycle day
                if loan.last_interest_payment_date:
                    covered_until = loan._get_interest_covered_until()
                else:
                    covered_until = loan.start_date
                days_overdue = (today - covered_until).days
                if days_overdue < 0:
                    days_overdue = 0
                
                interest_rate = loan.monthly_interest_rate or Decimal('0')
                interest_per_cycle = (loan.remaining_amount * interest_rate / 100)
                total_interest_due = interest_per_cycle * unpaid_cycles
                overdue_alerts.append({
                    'loan_id': loan.id,
                    'customer_id': loan.customer.id,
                    'customer_name': loan.customer.name,
                    'loan_type': 'Monthly Interest',
                    'days_overdue': days_overdue,
                    'unpaid_cycles': unpaid_cycles,
                    'expected_amount': str(total_interest_due),
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
        
        # 4. Total Outstanding Amount (overall + per loan type)
        total_outstanding = active_loans.aggregate(
            total=Sum('remaining_amount')
        )['total'] or Decimal('0')
        
        outstanding_by_type = active_loans.aggregate(
            dc=Sum('remaining_amount', filter=Q(loan_type='DC Loan')),
            monthly=Sum('remaining_amount', filter=Q(loan_type='Monthly Interest Loan')),
            dl=Sum('remaining_amount', filter=Q(loan_type='DL Loan')),
        )
        outstanding_breakdown = {
            'dc_loan': str(outstanding_by_type['dc'] or Decimal('0')),
            'monthly_interest_loan': str(outstanding_by_type['monthly'] or Decimal('0')),
            'dl_loan': str(outstanding_by_type['dl'] or Decimal('0')),
        }
        
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
        
        # 7. Interest Calendar — group all active ML loans by cycle day
        from collections import defaultdict
        calendar_data = defaultdict(list)
        ml_loans = active_loans.filter(
            loan_type='Monthly Interest Loan',
            interest_cycle_day__isnull=False,
        )
        for loan in ml_loans:
            cycle_day = loan.interest_cycle_day
            interest_rate = loan.monthly_interest_rate or Decimal('0')
            interest_amount = (loan.remaining_amount * interest_rate / 100)
            calendar_data[cycle_day].append({
                'loan_id': loan.id,
                'customer_id': loan.customer.id,
                'customer_name': loan.customer.name,
                'customer_phone': loan.customer.phone_number,
                'remaining_amount': str(loan.remaining_amount),
                'interest_rate': str(interest_rate),
                'interest_amount': str(interest_amount.quantize(Decimal('0.01'))),
            })
        
        interest_calendar = []
        for day in sorted(calendar_data.keys()):
            customers = calendar_data[day]
            total_interest = sum(Decimal(c['interest_amount']) for c in customers)
            interest_calendar.append({
                'cycle_day': day,
                'count': len(customers),
                'total_interest': str(total_interest.quantize(Decimal('0.01'))),
                'customers': customers,
            })
        
        return Response({
            'monthly_interest_due': monthly_interest_due_list,
            'overdue_alerts': overdue_alerts,
            'low_balance_warnings': low_balance_loans,
            'total_outstanding': str(total_outstanding),
            'outstanding_breakdown': outstanding_breakdown,
            'recent_activity': recent_activity,
            'quick_stats': {
                'total_active_customers': total_active_customers,
                'total_active_loans': active_loans.count(),
                'avg_collection_per_day': str(round(avg_collection_per_day, 2)),
            },
            'new_loans_this_month': new_loans_list,
            'interest_calendar': interest_calendar,
        })
