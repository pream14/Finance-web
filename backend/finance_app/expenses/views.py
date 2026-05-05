from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Expense, ExpenseCategory, Income
from .serializers import ExpenseSerializer, ExpenseCategorySerializer, IncomeSerializer


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ExpenseCategory.objects.all().order_by('name')


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Expense.objects.all().select_related('created_by', 'category').order_by('-created_at')
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        category_id = self.request.query_params.get('category', None)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            expense = serializer.save()
            # Owner can set a custom date for the expense
            custom_date = request.data.get('custom_date')
            if custom_date and request.user.role in ('owner', 'admin'):
                from django.utils import timezone
                from datetime import datetime
                try:
                    dt = datetime.strptime(custom_date, '%Y-%m-%d')
                    # Preserve the current time but change the date
                    new_dt = timezone.make_aware(dt.replace(
                        hour=expense.created_at.hour,
                        minute=expense.created_at.minute,
                        second=expense.created_at.second
                    ))
                    Expense.objects.filter(pk=expense.pk).update(created_at=new_dt)
                    expense.refresh_from_db()
                except (ValueError, TypeError):
                    pass
            return Response(ExpenseSerializer(expense, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Income.objects.all().select_related('created_by').order_by('-created_at')
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            income = serializer.save()
            # Owner can set a custom date for the income
            custom_date = request.data.get('custom_date')
            if custom_date and request.user.role in ('owner', 'admin'):
                from django.utils import timezone
                from datetime import datetime
                try:
                    dt = datetime.strptime(custom_date, '%Y-%m-%d')
                    new_dt = timezone.make_aware(dt.replace(
                        hour=income.created_at.hour,
                        minute=income.created_at.minute,
                        second=income.created_at.second
                    ))
                    Income.objects.filter(pk=income.pk).update(created_at=new_dt)
                    income.refresh_from_db()
                except (ValueError, TypeError):
                    pass
            return Response(IncomeSerializer(income).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
