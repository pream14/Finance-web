from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return the authenticated user's profile (for role-based redirect after login)."""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email or '',
        'first_name': user.first_name or '',
        'last_name': user.last_name or '',
        'full_name': user.get_full_name() or user.username,
        'role': getattr(user, 'role', 'employee'),
    })

from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from .serializers import UserCreateSerializer, UserListSerializer
from .models import User

class UserCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [IsAdminUser] 

class UserListView(generics.ListAPIView):
    queryset = User.objects.filter(role='employee').order_by('-date_joined')
    serializer_class = UserListSerializer
    permission_classes = [IsAdminUser]

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsAdminUser]

    def perform_destroy(self, instance):
        # Soft delete: just block them
        instance.is_active = False
        instance.save()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(old_password):
        return Response({'old_password': ['Wrong password.']}, status=400)
    
    user.set_password(new_password)
    user.save()
    return Response({'status': 'password set'}, status=200)
