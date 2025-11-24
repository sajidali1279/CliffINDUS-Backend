from django.db import models
from django.conf import settings
from django.utils import timezone

class CreditTransaction(models.Model):
    """
    Tracks point transactions for users.
    Positive = earned; Negative = spent.
    """
    REASON_CHOICES = [
        ("order_completed", "Order Completed"),
        ("referral", "Referral Bonus"),
        ("manual_adjustment", "Manual Adjustment"),
        ("redeem", "Redeem / Spent"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="credit_transactions")
    points = models.IntegerField()
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        sign = "+" if self.points > 0 else ""
        return f"{self.user.username}: {sign}{self.points} ({self.reason})"

    @staticmethod
    def user_balance(user):
        """Current point balance."""
        total = CreditTransaction.objects.filter(user=user).aggregate(total=models.Sum("points"))["total"]
        return total or 0
