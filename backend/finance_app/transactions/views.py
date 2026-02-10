from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
        """Handle loan updates with remaining_amount sync"""
        partial = kwargs.pop('partial', False)
        loan = self.get_object()
        
        # Block editing if loan has any transactions
        if loan.transactions.exists():
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
            
            # If principal changed, adjust remaining_amount proportionally
            if new_principal and float(new_principal) != float(old_principal):
                from decimal import Decimal
                new_principal_decimal = Decimal(str(new_principal))
                # Calculate how much has been paid off
                paid_amount = old_principal - loan.remaining_amount
                # New remaining = new principal - paid amount
                new_remaining = new_principal_decimal - paid_amount
                # Ensure remaining doesn't go below 0
                updated_loan.remaining_amount = max(Decimal('0'), new_remaining)
                updated_loan.save()
            
            return Response(self.get_serializer(updated_loan).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        loan = self.get_object()
        # Block deletion if loan has any transactions
        if loan.transactions.exists():
            return Response(
                {'error': 'Cannot delete loan with existing transactions. Please delete all transactions first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

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
        transaction = self.get_object()
        loan = transaction.loan

        # Reverse the principal reduction
        asal = transaction.asal_amount if transaction.asal_amount else transaction.amount
        if asal:
            from decimal import Decimal
            loan.remaining_amount += Decimal(str(asal))
            # If loan was settled, reactivate it
            if loan.status == 'settled':
                loan.status = 'active'
            loan.save()

        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
