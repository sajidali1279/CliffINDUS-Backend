from django.db.models.signals import post_save
from django.dispatch import receiver
from cliffindus_backend.products.models import Order
from .models import CreditTransaction

@receiver(post_save, sender=Order)
def award_points_on_delivery(sender, instance, created, **kwargs):
    # Only reward when status changes to delivered
    if not created and instance.status == "delivered":
        points = int(instance.total_price // 10)  # 1 point per $10
        CreditTransaction.objects.create(
            user=instance.user,
            points=points,
            reason="order_completed",
            reference_id=str(instance.id)
        )
