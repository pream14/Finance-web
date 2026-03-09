from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='payment_method',
            field=models.CharField(choices=[('cash', 'Cash'), ('online', 'Online')], default='cash', max_length=10),
        ),
    ]
