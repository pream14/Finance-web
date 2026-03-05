from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import Loan, Transaction, DailyCashBook
from expenses.models import Expense


class DailyCashBookView(APIView):
    """
    Daily Cash Book (Iruppu) API
    GET: Calculate cash book for a given date
    POST: Save/update opening balance for a date
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = date.today()

        # Get or calculate opening balance (iruppu)
        # First check if there's a saved record for this date
        cashbook_entry, _ = DailyCashBook.objects.get_or_create(
            date=target_date,
            defaults={'opening_balance': Decimal('0'), 'closing_balance': Decimal('0')}
        )

        # If opening balance is 0, try to get previous day's closing balance
        if cashbook_entry.opening_balance == 0:
            previous_entry = DailyCashBook.objects.filter(
                date__lt=target_date,
                closing_balance__gt=0
            ).order_by('-date').first()
            if previous_entry:
                cashbook_entry.opening_balance = previous_entry.closing_balance
                cashbook_entry.save()

        opening_balance = cashbook_entry.opening_balance

        # Today's cash collections (customer repayments via cash)
        cash_collections = Transaction.objects.filter(
            created_at__date=target_date,
            payment_method='cash'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Today's online collections
        online_collections = Transaction.objects.filter(
            created_at__date=target_date,
            payment_method='online'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # New cash loans given today (money going out)
        cash_loans_given = Loan.objects.filter(
            created_at__date=target_date,
            payment_method='cash'
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        # New online loans given today
        online_loans_given = Loan.objects.filter(
            created_at__date=target_date,
            payment_method='online'
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        # Today's expenses
        expenses_total = Expense.objects.filter(
            created_at__date=target_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # DC deduction revenue (advance interest from new DC loans today)
        dc_deduction_revenue = Loan.objects.filter(
            created_at__date=target_date,
            loan_type='DC Loan',
            dc_deduction_amount__gt=0
        ).aggregate(total=Sum('dc_deduction_amount'))['total'] or Decimal('0')

        # Interest revenue collected today broken down by loan type
        monthly_interest = Transaction.objects.filter(
            created_at__date=target_date,
            loan__loan_type='Monthly Interest Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dl_interest = Transaction.objects.filter(
            created_at__date=target_date,
            loan__loan_type='DL Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dc_interest = Transaction.objects.filter(
            created_at__date=target_date,
            loan__loan_type='DC Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        total_interest_collected = monthly_interest + dl_interest + dc_interest

        # Calculate closing balance
        # Closing = Opening + Cash Collections - Cash Loans Given - Expenses
        closing_balance = opening_balance + cash_collections - cash_loans_given - expenses_total

        # Save closing balance
        cashbook_entry.closing_balance = closing_balance
        cashbook_entry.save()

        # Total revenue = DC deductions + all interest collected
        total_revenue = dc_deduction_revenue + total_interest_collected

        # Get expense details
        expense_list = list(Expense.objects.filter(
            created_at__date=target_date
        ).values('id', 'description', 'amount'))

        # Get new loans given today
        new_loans_list = list(Loan.objects.filter(
            created_at__date=target_date
        ).select_related('customer').values(
            'id', 'customer__name', 'loan_type', 'principal_amount',
            'payment_method', 'dc_deduction_amount'
        ))

        return Response({
            'date': target_date.isoformat(),
            'opening_balance': str(opening_balance),
            'cash_collections': str(cash_collections),
            'online_collections': str(online_collections),
            'total_collections': str(cash_collections + online_collections),
            'cash_loans_given': str(cash_loans_given),
            'online_loans_given': str(online_loans_given),
            'total_loans_given': str(cash_loans_given + online_loans_given),
            'expenses': str(expenses_total),
            'closing_balance': str(closing_balance),
            'revenue': {
                'dc_deduction': str(dc_deduction_revenue),
                'monthly_interest': str(monthly_interest),
                'dl_interest': str(dl_interest),
                'dc_interest': str(dc_interest),
                'total_interest_collected': str(total_interest_collected),
                'total': str(total_revenue),
            },
            'details': {
                'expenses': expense_list,
                'new_loans': new_loans_list,
            },
            'notes': cashbook_entry.notes or '',
        })

    def post(self, request):
        """Save or update opening balance for a date"""
        date_str = request.data.get('date')
        opening_balance = request.data.get('opening_balance')

        if not date_str:
            return Response({'error': 'Date is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

        if opening_balance is None:
            return Response({'error': 'opening_balance is required'}, status=status.HTTP_400_BAD_REQUEST)

        cashbook_entry, created = DailyCashBook.objects.get_or_create(
            date=target_date,
            defaults={
                'opening_balance': Decimal(str(opening_balance)),
                'closing_balance': Decimal('0'),
                'created_by': request.user,
            }
        )

        if not created:
            cashbook_entry.opening_balance = Decimal(str(opening_balance))
            cashbook_entry.save()

        # Update notes if provided
        notes = request.data.get('notes')
        if notes is not None:
            cashbook_entry.notes = notes
            cashbook_entry.save()

        return Response({
            'message': 'Opening balance saved',
            'date': target_date.isoformat(),
            'opening_balance': str(cashbook_entry.opening_balance),
        })


class RevenueReportView(APIView):
    """
    Revenue report with date range filtering (weekly, monthly, custom)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Get date range
        range_type = request.query_params.get('range', 'today')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        today = date.today()

        if start_date_str and end_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
                end_date = date.fromisoformat(end_date_str)
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)
        elif range_type == 'today':
            start_date = today
            end_date = today
        elif range_type == 'week':
            start_date = today - timedelta(days=today.weekday())  # Monday
            end_date = today
        elif range_type == 'month':
            start_date = today.replace(day=1)
            end_date = today
        elif range_type == 'last_month':
            first_of_this_month = today.replace(day=1)
            last_month_end = first_of_this_month - timedelta(days=1)
            start_date = last_month_end.replace(day=1)
            end_date = last_month_end
        else:
            start_date = today
            end_date = today

        # DC deduction revenue
        dc_deduction_revenue = Loan.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan_type='DC Loan',
            dc_deduction_amount__gt=0
        ).aggregate(total=Sum('dc_deduction_amount'))['total'] or Decimal('0')

        # Interest collected (from transactions)
        interest_collected = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        # Break down interest by loan type
        dc_interest = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan__loan_type='DC Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        monthly_interest = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan__loan_type='Monthly Interest Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        dl_interest = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            loan__loan_type='DL Loan',
            interest_amount__gt=0
        ).aggregate(total=Sum('interest_amount'))['total'] or Decimal('0')

        # Total collections
        total_collections = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        # Total loans given
        total_loans_given = Loan.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('principal_amount'))['total'] or Decimal('0')

        # Total expenses
        total_expenses = Expense.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        total_revenue = dc_deduction_revenue + interest_collected

        return Response({
            'range': range_type,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
            'revenue': {
                'dc_deduction': str(dc_deduction_revenue),
                'dc_interest': str(dc_interest),
                'monthly_interest': str(monthly_interest),
                'dl_interest': str(dl_interest),
                'total_interest_collected': str(interest_collected),
                'total': str(total_revenue),
            },
            'summary': {
                'total_collections': str(total_collections),
                'total_loans_given': str(total_loans_given),
                'total_expenses': str(total_expenses),
            }
        })
