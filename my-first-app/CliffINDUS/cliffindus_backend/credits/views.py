from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from cliffindus_backend.products.permissions import IsAdmin, IsAuthenticatedAndVerified
from .models import CreditTransaction

class CreditViewSet(viewsets.ViewSet):
    """
    Manage and view user credit points.
    """
    permission_classes = [IsAuthenticatedAndVerified]

    @action(detail=False, methods=["get"])
    def balance(self, request):
        """Return the current user's balance."""
        balance = CreditTransaction.user_balance(request.user)
        return Response({"username": request.user.username, "points": balance}, status=200)

    @action(detail=False, methods=["get"], permission_classes=[IsAdmin])
    def leaderboard(self, request):
        """Return top 10 users by total points."""
        from django.db.models import Sum
        data = (
            CreditTransaction.objects
            .values("user__username")
            .annotate(total_points=Sum("points"))
            .order_by("-total_points")[:10]
        )
        return Response(list(data), status=200)
