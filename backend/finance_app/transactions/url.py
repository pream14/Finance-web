from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoanViewSet, TransactionViewSet, PaymentAnalyticsView
from .dashboard_views import DashboardStatsView
from .report_views import ReportDataView, ReportDownloadView

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('payment-analytics/', PaymentAnalyticsView.as_view(), name='payment-analytics'),
    path('reports/', ReportDataView.as_view(), name='reports'),
    path('reports/download/', ReportDownloadView.as_view(), name='reports-download'),
    path('', include(router.urls)),
]

