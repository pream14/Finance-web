from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('expenses', '0003_expense_payment_method'),
    ]

    operations = [
        # 1. Create ExpenseCategory model
        migrations.CreateModel(
            name='ExpenseCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='expense_categories_created',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Expense Category',
                'verbose_name_plural': 'Expense Categories',
                'db_table': 'expenses_expensecategory',
                'ordering': ['name'],
            },
        ),
        # 2. Create Income model
        migrations.CreateModel(
            name='Income',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.TextField()),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('source', models.CharField(help_text='Source of income (e.g., House Rent, Shop Rent)', max_length=200)),
                ('payment_method', models.CharField(choices=[('cash', 'Cash'), ('online', 'Online')], default='cash', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('created_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='incomes_recorded',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Income',
                'verbose_name_plural': 'Incomes',
                'db_table': 'expenses_income',
                'indexes': [models.Index(fields=['created_at'], name='expenses_in_created_idx')],
            },
        ),
        # 3. Add category FK to Expense
        migrations.AddField(
            model_name='expense',
            name='category',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='expenses',
                to='expenses.expensecategory',
            ),
        ),
    ]
