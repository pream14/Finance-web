from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('transactions', '0009_loan_payment_method'),
    ]

    operations = [
        # Add dc_deduction_amount to Loan model
        migrations.AddField(
            model_name='loan',
            name='dc_deduction_amount',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                default=0,
                help_text='Advance interest deducted when giving DC loan (e.g. ₹150 per ₹1000)',
                max_digits=12,
                null=True,
            ),
        ),
        # Create DailyCashBook model
        migrations.CreateModel(
            name='DailyCashBook',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(db_index=True, unique=True)),
                ('opening_balance', models.DecimalField(decimal_places=2, default=0, help_text='Iruppu - cash in hand at start of day', max_digits=12)),
                ('closing_balance', models.DecimalField(decimal_places=2, default=0, help_text='Cash in hand at end of day', max_digits=12)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='cashbook_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Daily Cash Book',
                'verbose_name_plural': 'Daily Cash Book Entries',
                'db_table': 'transactions_dailycashbook',
                'ordering': ['-date'],
            },
        ),
    ]
