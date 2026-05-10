from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = ['id', 'name', 'code', 'address', 'phone', 'is_active', 'created_at', 'user_count']
        read_only_fields = ['code', 'created_at']

    def get_user_count(self, obj):
        return obj.users.count()


class OrganizationMinimalSerializer(serializers.ModelSerializer):
    """Lightweight serializer used in user profile / org selector responses."""
    class Meta:
        model = Organization
        fields = ['id', 'name', 'code']
