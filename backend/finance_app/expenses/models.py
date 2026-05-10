from django.db import models
from django.conf import settings


class ExpenseCategory(models.Model):
    """Categories for expenses (e.g., Shop Expense, House Expense)"""
    name = models.CharField(max_length=100)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='expense_categories',
        null=True,  # Will be set to False after data migration
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expense_categories_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'expenses_expensecategory'
        verbose_name = 'Expense Category'
        verbose_name_plural = 'Expense Categories'
        ordering = ['name']
        unique_together = [('name', 'organization')]


class Expense(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('online', 'Online'),
    ]

    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='cash')
    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='expenses',
        null=True,  # Will be set to False after data migration
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses_recorded'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='expenses_edited'
    )
    
    def __str__(self):
        return f"{self.description[:30]} - {self.amount} - {self.created_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        db_table = 'expenses_expense'
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        indexes = [
            models.Index(fields=['created_at']),
        ]


class Income(models.Model):
    """Income from other sources (rent, shop income, etc.)"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('online', 'Online'),
    ]

    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    source = models.CharField(max_length=200, help_text="Source of income (e.g., House Rent, Shop Rent)")
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='cash')
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='incomes',
        null=True,  # Will be set to False after data migration
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='incomes_recorded'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='incomes_edited'
    )

    def __str__(self):
        return f"{self.source} - {self.amount} - {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        db_table = 'expenses_income'
        verbose_name = 'Income'
        verbose_name_plural = 'Incomes'
        indexes = [
            models.Index(fields=['created_at']),
        ]