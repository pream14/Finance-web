from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, AllOrganizationsView

router = DefaultRouter()
router.register(r'', OrganizationViewSet, basename='organization')

all_router = DefaultRouter()
all_router.register(r'', AllOrganizationsView, basename='all-organizations')

urlpatterns = [
    path('all/', include(all_router.urls)),
    path('', include(router.urls)),
]
