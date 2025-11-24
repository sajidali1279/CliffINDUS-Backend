from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta

from cliffindus_backend.products.models import Product, Order, OrderItem
from cliffindus_backend.users.models import User, RoleUpgradeRequest
from cliffindus_backend.products.permissions import IsAdmin


class AdminMetricsView(APIView):
    """
    Provides summarized metrics and time-based analytics for the admin dashboard.
    Accessible only by admin users.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        # --------------------------------------------------------
        # 🧩 USER STATISTICS
        # --------------------------------------------------------
        total_users = User.objects.count()
        verified_users = User.objects.filter(is_verified=True).count()
        unverified_users = total_users - verified_users

        users_by_role = User.objects.values("role").annotate(count=Count("id"))
        role_breakdown = {u["role"]: u["count"] for u in users_by_role}

        # Monthly user growth
        users_by_month = (
            User.objects.annotate(month=TruncMonth("date_joined"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        user_growth = [
            {"month": u["month"].strftime("%Y-%m") if u["month"] else None, "count": u["count"]}
            for u in users_by_month
        ]

        # --------------------------------------------------------
        # 🧩 ROLE UPGRADE REQUESTS
        # --------------------------------------------------------
        upgrade_stats = RoleUpgradeRequest.objects.values("status").annotate(count=Count("id"))
        upgrades = {u["status"]: u["count"] for u in upgrade_stats}

        # --------------------------------------------------------
        # 🧩 PRODUCT STATISTICS
        # --------------------------------------------------------
        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()

        # --------------------------------------------------------
        # 🧩 ORDER STATISTICS
        # --------------------------------------------------------
        total_orders = Order.objects.count()
        order_stats = Order.objects.values("status").annotate(count=Count("id"))
        orders_by_status = {o["status"]: o["count"] for o in order_stats}

        # Monthly orders
        orders_by_month = (
            Order.objects.annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        orders_trend = [
            {"month": o["month"].strftime("%Y-%m") if o["month"] else None, "count": o["count"]}
            for o in orders_by_month
        ]

        # --------------------------------------------------------
        # 💰 REVENUE STATISTICS
        # --------------------------------------------------------
        total_revenue = OrderItem.objects.aggregate(total=Sum("price"))["total"] or 0

        # Monthly revenue
        revenue_by_month = (
            OrderItem.objects.annotate(month=TruncMonth("order__created_at"))
            .values("month")
            .annotate(total=Sum("price"))
            .order_by("month")
        )
        revenue_trend = [
            {"month": r["month"].strftime("%Y-%m") if r["month"] else None, "total": float(r["total"] or 0)}
            for r in revenue_by_month
        ]

        # --------------------------------------------------------
        # 📊 COMPOSE RESPONSE
        # --------------------------------------------------------
        metrics = {
            "summary": {
                "users": {
                    "total": total_users,
                    "verified": verified_users,
                    "unverified": unverified_users,
                    "by_role": role_breakdown,
                },
                "upgrade_requests": upgrades,
                "products": {
                    "total": total_products,
                    "active": active_products,
                },
                "orders": {
                    "total": total_orders,
                    "by_status": orders_by_status,
                },
                "revenue": float(total_revenue),
            },
            "trends": {
                "user_growth": user_growth,
                "orders_trend": orders_trend,
                "revenue_trend": revenue_trend,
            },
        }

        return Response(metrics)
