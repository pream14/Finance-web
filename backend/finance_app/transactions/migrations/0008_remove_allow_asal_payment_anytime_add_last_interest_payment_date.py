# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0007_loan_last_interest_date'),
    ]

    operations = [
        # Remove allow_asal_payment_anytime field
        migrations.RemoveField(
            model_name='loan',
            name='allow_asal_payment_anytime',
        ),
        # Add last_interest_payment_date field
        migrations.AddField(
            model_name='loan',
            name='last_interest_payment_date',
            field=models.DateField(blank=True, help_text='Last date when interest was paid', null=True),
        ),
    ]
