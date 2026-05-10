from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Organization
from .serializers import OrganizationSerializer, OrganizationMinimalSerializer


class IsSuperAdmin(permissions.BasePermission):
    """Only allow superusers (platform admins) to access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class OrganizationViewSet(viewsets.ModelViewSet):
    """CRUD for organizations.
    
    - GET list: authenticated users see only their assigned orgs.
    - POST/PUT/DELETE: super admin only.
    """
    serializer_class = OrganizationSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all()
        return user.organizations.all()


class AllOrganizationsView(viewsets.ReadOnlyModelViewSet):
    """Super admin endpoint: list ALL organizations regardless of assignment."""
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    queryset = Organization.objects.all()
