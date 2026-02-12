# Generated migration for payment method tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0008_remove_allow_asal_payment_anytime_add_last_interest_payment_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='loan',
            name='payment_method',
            field=models.CharField(
                choices=[('cash', 'Cash'), ('online', 'Online Transfer')], 
                default='cash', 
                help_text='How the loan amount was disbursed', 
                max_length=10
            ),
        ),
    ]
