"""
URL configuration for finance_app project.

The `urlpatterns` list routes URLs to views. For more information    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken import views as auth_views
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path('sysadmin/', admin.site.urls),
    path('api/organizations/', include('organizations.urls')),
    path('api/customers/', include('customers.url')),
    path('api/transactions/', include('transactions.url')),
    path('api/users/', include('users.urls')),
    path('api/', include('expenses.url')),
    path('api-auth/', include('rest_framework.urls')),
    # Wrap the obtain_auth_token with csrf_exempt
    path('api-auth/token/', csrf_exempt(auth_views.obtain_auth_token)),
]
