from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoanViewSet, TransactionViewSet
from .dashboard_views import DashboardStatsView

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]

