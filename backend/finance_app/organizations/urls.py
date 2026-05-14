from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, AllOrganizationsView, get_subscription, upgrade_plan, subscription_stats
from .payments import create_order, verify_payment

router = DefaultRouter()
router.register(r'', OrganizationViewSet, basename='organization')

all_router = DefaultRouter()
all_router.register(r'', AllOrganizationsView, basename='all-organizations')

urlpatterns = [
    path('all/', include(all_router.urls)),
    path('subscription/', get_subscription, name='get_subscription'),
    path('subscription/upgrade/', upgrade_plan, name='upgrade_plan'),
    path('subscription/stats/', subscription_stats, name='subscription_stats'),
    path('payment/create-order/', create_order, name='create_order'),
    path('payment/verify/', verify_payment, name='verify_payment'),
    path('', include(router.urls)),
]
