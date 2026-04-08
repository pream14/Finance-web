from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0010_loan_dc_deduction_amount_dailycashbook'),
    ]

    operations = [
        migrations.AlterField(
            model_name='loan',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('settled', 'Settled')],
                default='active',
                max_length=20,
            ),
        ),
    ]
