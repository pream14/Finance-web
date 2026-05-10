"""
Management command to set up the initial organization and assign all existing data.

Run after migrations:
    python manage.py setup_organizations --name "Senthoor"

This command:
1. Creates the organization (if it doesn't exist)
2. Assigns ALL existing customers, loans, cashbook entries, expenses, and incomes to it
3. Assigns ALL existing users to it
4. Makes the first owner user a superuser (platform admin)
"""
from django.core.management.base import BaseCommand
from organizations.models import Organization
from users.models import User
from customers.models import Customer
from transactions.models import Loan, DailyCashBook
from expenses.models import Expense, ExpenseCategory, Income


class Command(BaseCommand):
    help = 'Create initial organization and assign all existing data to it'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name', type=str, default='Senthoor',
            help='Name of the initial organization (default: Senthoor)'
        )

    def handle(self, *args, **options):
        org_name = options['name']

        # 1. Create or get the organization
        org, created = Organization.objects.get_or_create(name=org_name)
        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ Created organization: {org.name} (code: {org.code})'))
        else:
            self.stdout.write(f'ℹ️  Organization "{org.name}" already exists (code: {org.code})')

        # 2. Assign all customers without an org
        count = Customer.objects.filter(organization__isnull=True).update(organization=org)
        if count:
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {count} customers to {org.name}'))

        # 3. Assign all loans without an org
        count = Loan.objects.filter(organization__isnull=True).update(organization=org)
        if count:
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {count} loans to {org.name}'))

        # 4. Assign all cashbook entries without an org
        count = DailyCashBook.objects.filter(organization__isnull=True).update(organization=org)
        if count:
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {count} cashbook entries to {org.name}'))

        # 5. Assign all expense categories without an org
        count = ExpenseCategory.objects.filter(organization__isnull=True).update(organization=org)
        if count:
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {count} expense categories to {org.name}'))

        # 6. Assign all expenses without an org
        count = Expense.objects.filter(organization__isnull=True).update(organization=org)
        if count:
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {count} expenses to {org.name}'))

        # 7. Assign all incomes without an org
        count = Income.objects.filter(organization__isnull=True).update(organization=org)
        if count:
            self.stdout.write(self.style.SUCCESS(f'✅ Assigned {count} incomes to {org.name}'))

        # 8. Assign all users to this org (M2M — won't duplicate)
        users = User.objects.all()
        for user in users:
            if not user.organizations.filter(id=org.id).exists():
                user.organizations.add(org)
        self.stdout.write(self.style.SUCCESS(f'✅ Assigned {users.count()} users to {org.name}'))

        # 9. Make the first owner a superuser
        first_owner = User.objects.filter(role='owner').first()
        if first_owner and not first_owner.is_superuser:
            first_owner.is_superuser = True
            first_owner.is_staff = True
            first_owner.save(update_fields=['is_superuser', 'is_staff'])
            self.stdout.write(self.style.SUCCESS(
                f'✅ Made "{first_owner.get_full_name() or first_owner.username}" a superuser'
            ))

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Setup complete! Organization "{org.name}" is ready.'))
        self.stdout.write(f'   Run the app and log in to access the Super Admin panel.')
