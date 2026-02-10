from rest_framework import serializers
from .models import User

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'phone_number', 'first_name', 'last_name', 'email', 'role', 'password']
        extra_kwargs = {
            'username': {'required': False},  # We set this automatically
            'phone_number': {'required': True},
        }

    def validate(self, attrs):
        if not attrs.get('phone_number'):
            raise serializers.ValidationError({"phone_number": "Phone number is required."})
        return attrs

    def create(self, validated_data):
        phone_number = validated_data.get('phone_number')
        first_name = validated_data.get('first_name')
        
        if not first_name:
             raise serializers.ValidationError({"first_name": "First name is required for username generation."})

        # Determine username: Use first_name as username
        username = first_name
        
        # Check if username already exists to avoid integrity error
        if User.objects.filter(username=username).exists():
             raise serializers.ValidationError({"first_name": "A user with this first name already exists. Please use a different name."})

        # Set default password as phone_number if not provided
        password = validated_data.get('password') or phone_number
        
        user = User.objects.create_user(
            username=username,
            password=password,
            phone_number=phone_number,
            first_name=first_name,
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            role=validated_data.get('role', 'employee')
        )
        return user

class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'phone_number', 'email', 'role', 'is_active']
        read_only_fields = ['username']
