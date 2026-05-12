from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, InviteToken
from organizations.serializers import OrganizationMinimalSerializer


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    organization_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
        help_text='List of organization IDs to assign the user to'
    )
    # Read-only fields returned after creation
    invite_token = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'phone_number', 'first_name', 'last_name', 'email', 'role', 'password', 'organization_ids', 'invite_token']
        extra_kwargs = {
            'username': {'required': False},  # We set this automatically
            'phone_number': {'required': True},
        }

    def get_invite_token(self, obj):
        """Return the latest valid invite token for this user."""
        token = obj.invite_tokens.filter(used_at__isnull=True).first()
        if token and token.is_valid:
            return token.token
        return None

    def validate_phone_number(self, value):
        """Ensure phone number is globally unique across all users."""
        if not value:
            raise serializers.ValidationError("Phone number is required.")

        # Strip whitespace/dashes for consistent matching
        cleaned = value.strip()

        existing = User.objects.filter(phone_number=cleaned).first()
        if existing:
            # Build a helpful error message showing who already has this number
            name = existing.get_full_name() or existing.username
            role = existing.role or 'user'
            orgs = list(existing.organizations.values_list('name', flat=True))
            org_info = f" in {', '.join(orgs)}" if orgs else ""

            raise serializers.ValidationError(
                f"This phone number is already registered to {name} ({role}{org_info}). "
                f"Each user must have a unique phone number."
            )

        return cleaned

    def validate(self, attrs):
        if not attrs.get('first_name'):
            raise serializers.ValidationError({"first_name": "First name is required for username generation."})
        return attrs

    def create(self, validated_data):
        phone_number = validated_data.get('phone_number')
        first_name = validated_data.get('first_name')
        organization_ids = validated_data.pop('organization_ids', [])
        role = validated_data.get('role', 'employee')

        # Generate unique username from first_name with counter suffix
        base_username = first_name.lower().strip()
        username = base_username
        counter = 2
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Check if a password was explicitly provided
        password = validated_data.get('password', '').strip()

        if password:
            # Validate password strength if one was provided
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
                role=role,
                must_change_password=False,  # They set a password, no need to change
            )
        else:
            # No password → create with unusable password + invite token
            user = User.objects.create_user(
                username=username,
                password=None,  # Will call set_unusable_password()
                phone_number=phone_number,
                first_name=first_name,
                last_name=validated_data.get('last_name', ''),
                email=validated_data.get('email', ''),
                role=role,
                must_change_password=True,
            )
            user.set_unusable_password()
            user.save()

            # Create invite token (48hr expiry)
            InviteToken.create_for_user(user)

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
    """Used for listing and updating users."""
    organizations = OrganizationMinimalSerializer(many=True, read_only=True)
    organization_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False,
        help_text='List of organization IDs to assign'
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'phone_number', 'email', 'role', 'is_active', 'organizations', 'organization_ids']
        read_only_fields = ['username']

    def validate_phone_number(self, value):
        """Ensure phone number is globally unique (excluding the current user being edited)."""
        if not value:
            return value

        cleaned = value.strip()

        # When editing, exclude the current user from the uniqueness check
        existing = User.objects.filter(phone_number=cleaned)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)

        match = existing.first()
        if match:
            name = match.get_full_name() or match.username
            role = match.role or 'user'
            orgs = list(match.organizations.values_list('name', flat=True))
            org_info = f" in {', '.join(orgs)}" if orgs else ""

            raise serializers.ValidationError(
                f"This phone number is already registered to {name} ({role}{org_info}). "
                f"Each user must have a unique phone number."
            )

        return cleaned

    def update(self, instance, validated_data):
        org_ids = validated_data.pop('organization_ids', None)
        instance = super().update(instance, validated_data)
        if org_ids is not None:
            from organizations.models import Organization
            orgs = Organization.objects.filter(id__in=org_ids)
            instance.organizations.set(orgs)
        return instance
