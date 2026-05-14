"""
Management command to set up subscriptions for existing organizations.

Usage:
    python manage.py setup_subscriptions              # Set all orgs without a subscription to 'business' plan
    python manage.py setup_subscriptions --plan pro   # Set all orgs without a subscription to 'pro' plan
    python manage.py setup_subscriptions --all        # Reset ALL orgs (even those with existing subscriptions)
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from organizations.models import Organization, Subscription, PLAN_LIMITS


class Command(BaseCommand):
    help = 'Set up subscriptions for existing organizations that do not have one.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--plan',
            type=str,
            default='business',
            choices=['starter', 'pro', 'business'],
            help='Plan to assign (default: business)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Reset ALL subscriptions, not just missing ones',
        )

    def handle(self, *args, **options):
        plan = options['plan']
        reset_all = options['all']
        limits = PLAN_LIMITS[plan]

        orgs = Organization.objects.all()
        created = 0
        updated = 0

        for org in orgs:
            sub, was_created = Subscription.objects.get_or_create(
                organization=org,
                defaults={
                    'plan': plan,
                    'status': 'active',
                    'amount_per_month': limits['price'],
                    'max_users': limits['max_users'],
                    'max_customers': limits['max_customers'],
                    'current_period_start': timezone.now().date(),
                    'current_period_end': timezone.now().date() + timedelta(days=3650),  # 10 years
                },
            )

            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(
                    f'  ✅ Created {plan} subscription for: {org.name}'
                ))
            elif reset_all:
                sub.plan = plan
                sub.status = 'active'
                sub.amount_per_month = limits['price']
                sub.max_users = limits['max_users']
                sub.max_customers = limits['max_customers']
                sub.current_period_start = timezone.now().date()
                sub.current_period_end = timezone.now().date() + timedelta(days=3650)
                sub.save()
                updated += 1
                self.stdout.write(self.style.WARNING(
                    f'  🔄 Updated {org.name} → {plan}'
                ))
            else:
                self.stdout.write(
                    f'  ⏭️  Skipped {org.name} (already has {sub.plan} subscription)'
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done! Created: {created}, Updated: {updated}, Total orgs: {orgs.count()}'
        ))
