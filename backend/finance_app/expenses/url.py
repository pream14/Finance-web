from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'expense-categories', views.ExpenseCategoryViewSet, basename='expense-category')
router.register(r'incomes', views.IncomeViewSet, basename='income')

urlpatterns = [
    path('', include(router.urls)),
]
