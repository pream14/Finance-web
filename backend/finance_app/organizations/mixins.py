from rest_framework.exceptions import ValidationError


class OrgMixin:
    """Mixin for DRF views that auto-filters querysets by the user's assigned organization(s).
    
    Behaviour:
    - Single-org user: always filtered to their one org (no ?org param needed).
    - Multi-org user with ?org=<id>: filtered to that specific org (verified against their list).
    - Multi-org user with ?org=all or no param: returns data from ALL their assigned orgs.
    - Any user trying to access an org they are NOT assigned to: gets empty results (safe).
    """

    # Subclasses can set this to the FK name on the model if it differs from 'organization_id'.
    org_field = 'organization_id'

    def _get_user_org_ids(self):
        """Return a flat list of org IDs the current user is assigned to."""
        return list(
            self.request.user.organizations.values_list('id', flat=True)
        )

    def get_org_filter(self):
        """Return a dict suitable for queryset.filter(**...)."""
        user_org_ids = self._get_user_org_ids()

        if not user_org_ids:
            # User has no orgs assigned — return impossible filter
            return {self.org_field: -1}

        org_param = self.request.query_params.get('org')

        # Specific org requested — verify the user has access
        if org_param and org_param != 'all':
            try:
                org_id = int(org_param)
            except (ValueError, TypeError):
                return {self.org_field: -1}
            if org_id in user_org_ids:
                return {self.org_field: org_id}
            # User doesn't have access to this org
            return {self.org_field: -1}

        # Single-org user — lock to their org automatically
        if len(user_org_ids) == 1:
            return {self.org_field: user_org_ids[0]}

        # Multi-org user with 'all' or no param — show all their orgs
        return {f'{self.org_field}__in': user_org_ids}

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.filter(**self.get_org_filter())

    def _resolve_org_for_create(self):
        """Determine which organization to assign when creating a new record.
        
        - If 'organization' is provided in request data, verify access and use it.
        - If user has exactly one org, use it automatically.
        - If user has multiple orgs and none specified, raise a validation error.
        """
        from organizations.models import Organization

        org_id = self.request.data.get('organization')
        user_org_ids = self._get_user_org_ids()

        if org_id:
            org_id = int(org_id)
            if org_id not in user_org_ids:
                raise ValidationError(
                    {"organization": "You do not have access to this organization."}
                )
            return Organization.objects.get(id=org_id)

        if len(user_org_ids) == 1:
            return Organization.objects.get(id=user_org_ids[0])

        # Check the ?org query param as fallback
        org_param = self.request.query_params.get('org')
        if org_param and org_param != 'all':
            try:
                org_id = int(org_param)
                if org_id in user_org_ids:
                    return Organization.objects.get(id=org_id)
            except (ValueError, TypeError):
                pass

        raise ValidationError(
            {"organization": "Please select an organization."}
        )

    def perform_create(self, serializer):
        org = self._resolve_org_for_create()
        serializer.save(organization=org)
