from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User
from organizations.serializers import OrganizationMinimalSerializer


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organization_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
        help_text='List of organization IDs to assign the user to'
    )

    class Meta:
        model = User
        fields = ['username', 'phone_number', 'first_name', 'last_name', 'email', 'role', 'password', 'organization_ids']
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
        organization_ids = validated_data.pop('organization_ids', [])
        role = validated_data.get('role', 'employee')
        
        if not first_name:
             raise serializers.ValidationError({"first_name": "First name is required for username generation."})

        # Check phone number uniqueness — only block if same phone exists for a non-employee
        # (allows same person to be employee in one org and owner in another is handled by org assignment)
        existing_by_phone = User.objects.filter(phone_number=phone_number)
        if existing_by_phone.exists():
            existing_user = existing_by_phone.first()
            # If the existing user is NOT an employee, block creation
            # (two owners/admins with same phone = conflict)
            if existing_user.role != 'employee' and role != 'employee':
                raise serializers.ValidationError({
                    "phone_number": f"A user with this phone number already exists ({existing_user.first_name}, role: {existing_user.role})."
                })

        # Generate unique username from first_name with counter suffix
        base_username = first_name.lower().strip()
        username = base_username
        counter = 2
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Set default password as phone_number if not provided
        password = validated_data.get('password') or phone_number

        # Validate password strength using Django's AUTH_PASSWORD_VALIDATORS
        try:
            validate_password(password)
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        
        user = User.objects.create_user(
            username=username,
            password=password,
            phone_number=phone_number,
            first_name=first_name,
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            role=role
        )

        # Assign organizations
        if organization_ids:
            from organizations.models import Organization
            orgs = Organization.objects.filter(id__in=organization_ids)
            user.organizations.set(orgs)
        else:
            # If no org specified, assign to the creating user's orgs
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                user_orgs = request.user.organizations.all()
                if user_orgs.exists():
                    user.organizations.set(user_orgs)

        return user


class UserListSerializer(serializers.ModelSerializer):
    organizations = OrganizationMinimalSerializer(many=True, read_only=True)
    organization_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
        help_text='List of organization IDs to assign'
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'phone_number', 'email', 'role', 'is_active', 'organizations', 'organization_ids']
        read_only_fields = ['username']

    def update(self, instance, validated_data):
        org_ids = validated_data.pop('organization_ids', None)
        instance = super().update(instance, validated_data)
        if org_ids is not None:
            from organizations.models import Organization
            orgs = Organization.objects.filter(id__in=org_ids)
            instance.organizations.set(orgs)
        return instance

