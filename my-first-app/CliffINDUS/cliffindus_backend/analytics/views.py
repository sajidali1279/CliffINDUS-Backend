from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Count, F
from django.utils import timezone
from datetime import timedelta, datetime
from django.http import HttpResponse
import csv
import io
import json

from cliffindus_backend.products.models import Order, OrderItem, Product
from cliffindus_backend.users.models import User
from cliffindus_backend.products.permissions import IsAdmin


class AdminAnalyticsViewSet(viewsets.ViewSet):
    """
    Enterprise analytics for admins:
    - /overview/
    - /sales/time-series/?days=30 or ?start=YYYY-MM-DD&end=YYYY-MM-DD
    - /users/time-series/?days=30
    - /sales/role-breakdown/
    - /users/role-breakdown/
    - /export/csv/
    - /export/json/
    """
    permission_classes = [IsAdmin]

    # ----------------------------------------------------------
    # 📈 OVERVIEW
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"])
    def overview(self, request):
        now = timezone.now()
        last_30 = now - timedelta(days=30)

        total_sales = (
            Order.objects.filter(status__in=["delivered", "shipped"])
            .aggregate(total=Sum("total_price"))["total"] or 0
        )
        avg_order_value = (
            Order.objects.filter(status__in=["delivered", "shipped"])
            .aggregate(avg=Sum("total_price") / Count("id"))["avg"] or 0
        )
        top_products = (
            OrderItem.objects.values(name=F("product__name"))
            .annotate(total_sold=Sum("quantity"))
            .order_by("-total_sold")[:5]
        )
        new_users = User.objects.filter(date_joined__gte=last_30).count()
        verified_users = User.objects.filter(is_verified=True).count()
        order_status_counts = dict(
            Order.objects.values_list("status").annotate(count=Count("id"))
        )

        data = {
            "total_sales": float(total_sales),
            "average_order_value": float(avg_order_value),
            "top_products": list(top_products),
            "new_users_last_30_days": new_users,
            "verified_users": verified_users,
            "order_status_distribution": order_status_counts,
        }
        return Response(data, status=status.HTTP_200_OK)

    # ----------------------------------------------------------
    # 📆 SALES TIME-SERIES (with flexible time range)
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="sales/time-series")
    def sales_time_series(self, request):
        """
        Returns daily sales within a custom range:
        - ?days=30  (default)
        - ?start=YYYY-MM-DD&end=YYYY-MM-DD
        """
        now = timezone.now()
        days = int(request.query_params.get("days", 30))
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")

        if start_str and end_str:
            try:
                start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            start_date = (now - timedelta(days=days)).date()
            end_date = now.date()

        orders = (
            Order.objects.filter(
                status__in=["delivered", "shipped"],
                created_at__date__range=(start_date, end_date),
            )
            .extra(select={"day": "date(created_at)"})
            .values("day")
            .annotate(total_sales=Sum("total_price"))
            .order_by("day")
        )

        return Response(list(orders), status=status.HTTP_200_OK)

    # ----------------------------------------------------------
    # 👥 USER TIME-SERIES (with custom range)
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="users/time-series")
    def users_time_series(self, request):
        """
        Returns daily new-user registrations for a custom range.
        """
        now = timezone.now()
        days = int(request.query_params.get("days", 30))
        start_str = request.query_params.get("start")
        end_str = request.query_params.get("end")

        if start_str and end_str:
            try:
                start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)
        else:
            start_date = (now - timedelta(days=days)).date()
            end_date = now.date()

        users = (
            User.objects.filter(date_joined__date__range=(start_date, end_date))
            .extra(select={"day": "date(date_joined)"})
            .values("day")
            .annotate(new_users=Count("id"))
            .order_by("day")
        )

        return Response(list(users), status=status.HTTP_200_OK)

    # ----------------------------------------------------------
    # 🧩 SALES BREAKDOWN BY ROLE
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="sales/role-breakdown")
    def sales_role_breakdown(self, request):
        """
        Returns sales distribution by seller role (wholesaler/retailer).
        """
        data = (
            OrderItem.objects.values(role=F("product__owner__role"))
            .annotate(total_sales=Sum(F("price") * F("quantity")))
            .order_by("-total_sales")
        )
        return Response(list(data), status=status.HTTP_200_OK)

    # ----------------------------------------------------------
    # 👥 USER BREAKDOWN BY ROLE
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="users/role-breakdown")
    def users_role_breakdown(self, request):
        """
        Returns verified users by role.
        """
        roles = (
            User.objects.filter(is_verified=True)
            .values("role")
            .annotate(total=Count("id"))
            .order_by("role")
        )
        return Response(list(roles), status=status.HTTP_200_OK)
        # ----------------------------------------------------------
    # 📆 MONTHLY SALES AGGREGATION (Year-wise)
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="sales/monthly")
    def sales_monthly(self, request):
        """
        Returns monthly aggregated sales and order counts for a given year.
        Example:
            /api/analytics/metrics/sales/monthly/?year=2025
        """
        try:
            year = int(request.query_params.get("year", timezone.now().year))
        except ValueError:
            return Response({"detail": "Invalid year value."}, status=status.HTTP_400_BAD_REQUEST)

        # Build month-wise buckets (1-12)
        monthly_data = (
            Order.objects.filter(
                status__in=["delivered", "shipped"],
                created_at__year=year
            )
            .extra(select={"month": "EXTRACT(MONTH FROM created_at)"})
            .values("month")
            .annotate(
                total_sales=Sum("total_price"),
                total_orders=Count("id")
            )
            .order_by("month")
        )

        # Fill missing months with zeros
        results = []
        months_with_data = {int(m["month"]): m for m in monthly_data}
        for m in range(1, 13):
            entry = months_with_data.get(m, {"total_sales": 0, "total_orders": 0})
            results.append({
                "month": m,
                "total_sales": float(entry["total_sales"] or 0),
                "total_orders": entry["total_orders"],
            })

        return Response(
            {"year": year, "monthly_summary": results},
            status=status.HTTP_200_OK,
        )

    # ----------------------------------------------------------
    # 🏆 TOP 10 CUSTOMERS / WHOLESALERS OF THE YEAR
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="top/performers")
    def top_performers(self, request):
        """
        Returns top 10 customers and wholesalers by total order value
        for a given year (?year=YYYY, default current).
        """
        try:
            year = int(request.query_params.get("year", timezone.now().year))
        except ValueError:
            return Response({"detail": "Invalid year format."}, status=400)

        # --- Top 10 Customers (buyers) ---
        top_customers = (
            Order.objects.filter(
                created_at__year=year,
                status__in=["delivered", "shipped"]
            )
            .values("user__username")
            .annotate(total_spent=Sum("total_price"))
            .order_by("-total_spent")[:10]
        )

        # --- Top 10 Wholesalers (sellers) ---
        top_wholesalers = (
            OrderItem.objects.filter(
                order__created_at__year=year,
                order__status__in=["delivered", "shipped"],
                product__owner__role="wholesaler"
            )
            .values("product__owner__username")
            .annotate(total_sales=Sum(F("price") * F("quantity")))
            .order_by("-total_sales")[:10]
        )

        data = {
            "year": year,
            "top_customers": list(top_customers),
            "top_wholesalers": list(top_wholesalers),
        }
        return Response(data, status=200)

    # ----------------------------------------------------------
    # 📤 EXPORT: CSV
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="export/csv")
    def export_csv(self, request):
        now = timezone.now()
        filename = f"cliffindus_metrics_{now.strftime('%Y%m%d')}.csv"
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Orders", Order.objects.count()])
        writer.writerow(["Delivered Orders", Order.objects.filter(status='delivered').count()])
        writer.writerow(["Total Sales", str(
            Order.objects.filter(status__in=["delivered", "shipped"])
            .aggregate(total=Sum("total_price"))["total"] or 0
        )])
        writer.writerow(["Verified Users", User.objects.filter(is_verified=True).count()])
        writer.writerow(["Active Retailers", User.objects.filter(role='retailer', is_verified=True).count()])
        writer.writerow(["Active Wholesalers", User.objects.filter(role='wholesaler', is_verified=True).count()])
        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    # ----------------------------------------------------------
    # 📤 EXPORT: JSON
    # ----------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="export/json")
    def export_json(self, request):
        data = {
            "orders": {
                "total": Order.objects.count(),
                "delivered": Order.objects.filter(status="delivered").count(),
                "cancelled": Order.objects.filter(status="cancelled").count(),
            },
            "sales": {
                "total_sales": float(
                    Order.objects.filter(status__in=["delivered", "shipped"])
                    .aggregate(total=Sum("total_price"))["total"] or 0
                ),
            },
            "users": {
                "verified": User.objects.filter(is_verified=True).count(),
                "retailers": User.objects.filter(role="retailer", is_verified=True).count(),
                "wholesalers": User.objects.filter(role="wholesaler", is_verified=True).count(),
            },
        }
        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type="application/json",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="cliffindus_metrics_{timezone.now().strftime("%Y%m%d")}.json"'
        )
        return response
