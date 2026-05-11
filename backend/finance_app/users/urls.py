from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.current_user),
    path('register/', views.UserCreateView.as_view(), name='register'),
    path('', views.UserListView.as_view(), name='user_list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('change-password/', views.change_password, name='change_password'),
    # Invite token endpoints
    path('invite/<str:token>/', views.validate_invite, name='validate_invite'),
    path('invite/<str:token>/accept/', views.accept_invite, name='accept_invite'),
    path('<int:user_id>/resend-invite/', views.resend_invite, name='resend_invite'),
]
