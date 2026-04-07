"""
One-time management command to backfill last_interest_payment_date for 
existing Monthly Interest Loans based on their transaction history.

Usage: python manage.py fix_monthly_interest_dates
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from transactions.models import Loan


class Command(BaseCommand):
    help = 'Backfill last_interest_payment_date for Monthly Interest Loans'

    def handle(self, *args, **options):
        loans = Loan.objects.filter(
            loan_type='Monthly Interest Loan',
            last_interest_payment_date__isnull=True,
        )
        
        updated = 0
        for loan in loans:
            # Find the most recent transaction with interest_amount > 0
            last_interest_txn = loan.transactions.filter(
                interest_amount__gt=0
            ).order_by('-created_at').first()
            
            if last_interest_txn:
                loan.last_interest_payment_date = last_interest_txn.created_at.date()
                loan.save(update_fields=['last_interest_payment_date'])
                updated += 1
                self.stdout.write(
                    f'  Updated loan #{loan.id} ({loan.customer.name}): '
                    f'last_interest_payment_date = {loan.last_interest_payment_date}'
                )
            else:
                # No interest transactions found - set to start_date 
                # (assumes first month's interest was collected upfront)
                loan.last_interest_payment_date = loan.start_date
                loan.save(update_fields=['last_interest_payment_date'])
                updated += 1
                self.stdout.write(
                    f'  Updated loan #{loan.id} ({loan.customer.name}): '
                    f'set to start_date = {loan.start_date} (no interest txns found)'
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Updated {updated} Monthly Interest Loans.'
        ))
