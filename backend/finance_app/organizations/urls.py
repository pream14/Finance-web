from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, AllOrganizationsView, get_subscription, upgrade_plan

router = DefaultRouter()
router.register(r'', OrganizationViewSet, basename='organization')

all_router = DefaultRouter()
all_router.register(r'', AllOrganizationsView, basename='all-organizations')

urlpatterns = [
    path('all/', include(all_router.urls)),
    path('subscription/', get_subscription, name='get_subscription'),
    path('subscription/upgrade/', upgrade_plan, name='upgrade_plan'),
    path('', include(router.urls)),
]
