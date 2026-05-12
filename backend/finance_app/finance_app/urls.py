"""
URL configuration for finance_app project.

The `urlpatterns` list routes URLs to views. For more information    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from users.auth import secure_login

urlpatterns = [
    path('sysadmin/', admin.site.urls),  # Non-standard path, requires superuser login
    path('api/organizations/', include('organizations.urls')),
    path('api/customers/', include('customers.url')),
    path('api/transactions/', include('transactions.url')),
    path('api/users/', include('users.urls')),
    path('api/', include('expenses.url')),
    path('api-auth/', include('rest_framework.urls')),
    # Custom secure login with lockout + token rotation + audit logging
    path('api-auth/token/', secure_login),
]
