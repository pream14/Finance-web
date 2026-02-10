from django.db import models
from django.conf import settings

class Expense(models.Model):
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses_recorded'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    def __str__(self):
        return f"{self.description[:30]} - {self.amount} - {self.created_at.strftime('%Y-%m-%d')}"
    
    class Meta:
        db_table = 'expenses_expense'
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        indexes = [
            models.Index(fields=['created_at']),
        ]