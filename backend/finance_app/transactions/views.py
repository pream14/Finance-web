from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Loan, Transaction
from .serializers import LoanSerializer, LoanDetailSerializer, TransactionSerializer
from customers.models import Customer

class LoanViewSet(viewsets.ModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Loan.objects.all()
        customer_id = self.request.query_params.get('customer_id', None)
        loan_type = self.request.query_params.get('loan_type', None)
        status_filter = self.request.query_params.get('status', None)
        
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        if loan_type:
            queryset = queryset.filter(loan_type=loan_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('customer', 'created_by')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LoanDetailSerializer
        return LoanSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Handle loan updates with remaining_amount sync.
        
        Owner can edit loans even when transactions exist.
        Employees are blocked from editing loans with transactions.
        """
        partial = kwargs.pop('partial', False)
        loan = self.get_object()
        is_owner = request.user.role in ('owner', 'admin')
        
        # Block editing if loan has transactions — unless user is owner
        if loan.transactions.exists() and not is_owner:
            return Response(
                {'error': 'Cannot edit loan with existing transactions.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Track if principal is changing
        new_principal = request.data.get('principal_amount')
        old_principal = loan.principal_amount
        
        serializer = self.get_serializer(loan, data=request.data, partial=partial)
        if serializer.is_valid():
            updated_loan = serializer.save()
            updated_loan.last_edited_by = request.user
            updated_loan.save(update_fields=['last_edited_by'])
            
            # If principal changed, adjust remaining_amount
            if new_principal and float(new_principal) != float(old_principal):
                from decimal import Decimal
                new_principal_decimal = Decimal(str(new_principal))
                
                if loan.transactions.exists():
                    # Option A: recalculate remaining = new_principal - total_paid
                    total_paid = sum(
                        Decimal(str(t.asal_amount or t.amount or 0))
                        for t in loan.transactions.all()
                    )
                    new_remaining = new_principal_decimal - total_paid
                else:
                    # No transactions: remaining = new principal
                    paid_amount = old_principal - loan.remaining_amount
                    new_remaining = new_principal_decimal - paid_amount
                
                updated_loan.remaining_amount = max(Decimal('0'), new_remaining)
                if updated_loan.remaining_amount <= 0:
                    updated_loan.status = 'settled'
                elif updated_loan.status == 'settled':
                    updated_loan.status = 'active'
                updated_loan.save()
            
            return Response(self.get_serializer(updated_loan).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        loan = self.get_object()
        is_owner = request.user.role in ('owner', 'admin')
        
        # Block deletion if loan has transactions — unless user is owner
        if loan.transactions.exists() and not is_owner:
            return Response(
                {'error': 'Cannot delete loan with existing transactions. Please delete all transactions first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If owner is deleting a loan with transactions, delete all transactions first
        if loan.transactions.exists() and is_owner:
            loan.transactions.all().delete()
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='close')
    def close_loan(self, request, pk=None):
        """Manually close/write-off a loan.

        Used when a customer hasn't paid interest for months and
        the admin decides to absorb the loss and close the loan.
        Optionally accepts a final payment amount.
        """
        from decimal import Decimal
        from django.utils import timezone

        loan = self.get_object()

        if loan.status != 'active':
            return Response(
                {'error': f'Cannot close a loan that is already {loan.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        closure_note = request.data.get('closure_note', '')
        final_amount = request.data.get('final_amount')

        # If admin records a final payment at the time of closure
        if final_amount is not None:
            final_amount = Decimal(str(final_amount))
            if final_amount > 0:
                if final_amount > loan.remaining_amount:
                    return Response(
                        {'error': f'Final amount (₹{final_amount}) exceeds remaining balance (₹{loan.remaining_amount}).'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # Create a transaction for the final payment
                Transaction.objects.create(
                    loan=loan,
                    amount=final_amount,
                    asal_amount=final_amount,
                    interest_amount=Decimal('0'),
                    payment_method=request.data.get('payment_method', 'cash'),
                    description=f'Final payment before loan closure',
                    created_by=request.user,
                )
                # The Transaction.save() already reduces remaining_amount,
                # but we need to reload the loan to get the updated value
                loan.refresh_from_db()

        # Close the loan
        loan.status = 'closed'
        loan.closed_at = timezone.now()
        loan.closure_note = closure_note
        loan.save()

        serializer = LoanDetailSerializer(loan)
        return Response({
            'message': 'Loan closed successfully.',
            'loan': serializer.data,
        })

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Transaction.objects.all()
        customer_id = self.request.query_params.get('customer_id', None)
        loan_id = self.request.query_params.get('loan_id', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        # If collector, only show their own transactions unless include_all is requested
        if self.request.user.role == 'employee' and self.request.query_params.get('include_all') != 'true':
            queryset = queryset.filter(created_by=self.request.user)
        
        if customer_id:
            queryset = queryset.filter(loan__customer_id=customer_id)
        if loan_id:
            queryset = queryset.filter(loan_id=loan_id)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        return queryset.select_related('loan', 'loan__customer', 'created_by').order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a transaction and reverse its effect on the loan balance."""
        from decimal import Decimal
        transaction = self.get_object()
        loan = transaction.loan

        # Reverse the principal reduction
        asal = transaction.asal_amount if transaction.asal_amount is not None else transaction.amount
        txn_date = transaction.created_at.date()  # Capture before delete
        if asal:
            loan.remaining_amount += Decimal(str(asal))
            # If loan was settled, reactivate it
            if loan.status == 'settled':
                loan.status = 'active'

        loan.save()

        # Delete the transaction first
        transaction.delete()

        # Recalculate interest tracking from remaining transactions
        if loan.loan_type in ('Monthly Interest Loan', 'DL Loan'):
            all_txns = loan.transactions.order_by('created_at')
            pending = Decimal('0')
            last_interest_date = None

            for txn in all_txns:
                interest_paid = Decimal(str(txn.interest_amount)) if txn.interest_amount else Decimal('0')
                if interest_paid > 0:
                    if loan.loan_type == 'Monthly Interest Loan':
                        monthly_interest = loan.calculate_monthly_interest()
                        expected = monthly_interest + pending
                        if interest_paid < expected:
                            pending = expected - interest_paid
                        else:
                            pending = Decimal('0')
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

        # Invalidate cached cashbook entries after the transaction date
        from transactions.cashbook_views import invalidate_cashbook_from
        invalidate_cashbook_from(txn_date)

        return Response(status=status.HTTP_204_NO_CONTENT)

class PaymentAnalyticsView(APIView):
    """
    Enhanced analytics endpoint for payment method tracking
    Includes both loan disbursement and customer repayment analytics
    """
    def get(self, request):
        from django.db.models import Sum, Count, Q
        from datetime import date, timedelta, datetime
        
        # Get date range from query params
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')
        days = int(request.query_params.get('days', 30))
        
        if start_date_param and end_date_param:
            # Custom date range
            start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
        else:
            # Default to last N days
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
        
        # Filter loans by date range
        loans = Loan.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        # Filter transactions by date range
        transactions = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        # LOAN DISBURSEMENT ANALYTICS (How you give money)
        disbursement_totals = loans.values('payment_method').annotate(
            total_amount=Sum('principal_amount'),
            count=Count('id')
        ).order_by('-total_amount')
        
        total_disbursement = loans.aggregate(total=Sum('principal_amount'))['total'] or 0
        cash_disbursement = loans.filter(payment_method='cash').aggregate(total=Sum('principal_amount'))['total'] or 0
        online_disbursement = loans.filter(payment_method='online').aggregate(total=Sum('principal_amount'))['total'] or 0
        
        # CUSTOMER REPAYMENT ANALYTICS (How customers pay you back)
        repayment_totals = transactions.values('payment_method').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('-total_amount')
        
        total_repaid = transactions.aggregate(total=Sum('amount'))['total'] or 0
        cash_repaid = transactions.filter(payment_method='cash').aggregate(total=Sum('amount'))['total'] or 0
        online_repaid = transactions.filter(payment_method='online').aggregate(total=Sum('amount'))['total'] or 0
        
        # Cash Flow Analysis
        net_cash_flow = cash_disbursement - cash_repaid
        net_online_flow = online_disbursement - online_repaid
        
        # Daily breakdown for both disbursement and repayment
        daily_disbursement = loans.extra({
            'day': 'date(created_at)'
        }).values('day', 'payment_method').annotate(
            total_amount=Sum('principal_amount'),
            count=Count('id')
        ).order_by('day')
        
        daily_repayment = transactions.extra({
            'day': 'date(created_at)'
        }).values('day', 'payment_method').annotate(
            total_amount=Sum('amount'),
            count=Count('id')
        ).order_by('day')
        
        # Collection Method Distribution
        collection_methods = transactions.values('payment_method').annotate(
            total_amount=Sum('amount'),
            count=Count('id'),
            avg_amount=Sum('amount') / Count('id')
        ).order_by('-total_amount')
        
        return Response({
            'summary': {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                },
                'disbursement': {
                    'total_loans': loans.count(),
                    'total_amount': total_disbursement,
                    'cash_amount': cash_disbursement,
                    'online_amount': online_disbursement,
                    'cash_percentage': round((cash_disbursement / total_disbursement * 100) if total_disbursement > 0 else 0, 2),
                    'online_percentage': round((online_disbursement / total_disbursement * 100) if total_disbursement > 0 else 0, 2),
                },
                'repayment': {
                    'total_transactions': transactions.count(),
                    'total_repaid': total_repaid,
                    'cash_repaid': cash_repaid,
                    'online_repaid': online_repaid,
                    'cash_percentage': round((cash_repaid / total_repaid * 100) if total_repaid > 0 else 0, 2),
                    'online_percentage': round((online_repaid / total_repaid * 100) if total_repaid > 0 else 0, 2),
                },
                'cash_flow': {
                    'net_cash_flow': net_cash_flow,
                    'net_online_flow': net_online_flow,
                    'total_flow': net_cash_flow + net_online_flow,
                    'interpretation': self._interpret_cash_flow(net_cash_flow, net_online_flow)
                }
            },
            'disbursement_breakdown': list(disbursement_totals),
            'repayment_breakdown': list(repayment_totals),
        })
    
    def _interpret_cash_flow(self, net_cash, net_online):
        """Provide interpretation of cash flow"""
        if net_cash > 0:
            cash_status = f"Cash out: ₹{net_cash:,.0f}"
        elif net_cash < 0:
            cash_status = f"Cash in: ₹{abs(net_cash):,.0f}"
        else:
            cash_status = "Cash balanced"
            
        if net_online > 0:
            online_status = f"Online out: ₹{net_online:,.0f}"
        elif net_online < 0:
            online_status = f"Online in: ₹{abs(net_online):,.0f}"
        else:
            online_status = "Online balanced"
            
        return f"{cash_status} | {online_status}"
