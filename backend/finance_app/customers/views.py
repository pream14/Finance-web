from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework import status
from .models import Customer
from .serializers import CustomerSerializer
from organizations.mixins import OrgMixin


class CustomerViewSet(OrgMixin, viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Customer.objects.all()
    
    def get_queryset(self):
        # OrgMixin.get_queryset() applies org filtering on top of self.queryset
        return super().get_queryset()
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            org = self._resolve_org_for_create()
            serializer.save(organization=org)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
