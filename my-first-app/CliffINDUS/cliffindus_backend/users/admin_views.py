from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from cliffindus_backend.users.models import User, RoleUpgradeRequest
from cliffindus_backend.products.models import Product, Order
from cliffindus_backend.products.serializers import ProductSerializer, OrderSerializer
from cliffindus_backend.users.permissions import IsAdminOrSuperAdmin


# ---------------------------
# USER SERIALIZER (ADMIN VIEW)
# ---------------------------
class AdminUserSerializer(serializers.ModelSerializer):
    # Map created_at to Django's date_joined
    created_at = serializers.DateTimeField(source="date_joined", read_only=True)

    # Expose verification timestamp & derived info
    verified_at = serializers.DateTimeField(read_only=True, allow_null=True)
    verified_since = serializers.SerializerMethodField()

    # Aggregated counts
    total_products = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()

    # Allow toggling is_active and setting password on create
    is_active = serializers.BooleanField(required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "admin_type",
            "is_verified",
            "is_active",
            "created_at",
            "last_login",
            "verified_at",
            "verified_since",
            "total_products",
            "total_orders",
            "password",  # write-only
        ]
        read_only_fields = ["id", "created_at", "last_login", "verified_since",
                            "total_products", "total_orders", "verified_at"]

    def get_verified_since(self, obj):
        """
        Number of days since verification, or None if not verified.
        """
        if not obj.is_verified or not obj.verified_at:
            return None
        delta = timezone.now() - obj.verified_at
        return delta.days

    def get_total_products(self, obj):
        """
        Count products owned by wholesalers/retailers.
        """
        if obj.role not in ("wholesaler", "retailer"):
            return 0
        return Product.objects.filter(owner=obj).count()

    def get_total_orders(self, obj):
        """
        Count orders related to this user.
        - consumer: orders placed by them
        - retailer: orders containing their products
        - wholesaler: likewise (if/when implemented)
        """
        if obj.role == "consumer":
            return Order.objects.filter(user=obj).count()
        if obj.role in ("retailer", "wholesaler"):
            return (
                Order.objects.filter(items__product__owner=obj)
                .distinct()
                .count()
            )
        return 0


# -----------------------------------------
# ROLE UPGRADE SERIALIZER (MATCHES MODEL!)
# -----------------------------------------
class RoleUpgradeRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleUpgradeRequest
        fields = [
            "id",
            "requested_role",
            "business_name",
            "business_license",
            "status",
            "admin_comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# --------------------------
# ADMIN USER VIEWSET
# --------------------------
class AdminUserViewSet(viewsets.ModelViewSet):
    """
    Admin-level viewset for listing and managing users.
    - list / retrieve
    - (optional) create users
    - per-user related: products, orders, upgrade request
    """
    queryset = User.objects.all().order_by("id")
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    # Optional: custom create so admin can add users from frontend
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        password = data.pop("password", None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if password:
            user.set_password(password)
            user.save(update_fields=["password"])

        out = AdminUserSerializer(user).data
        return Response(out, status=status.HTTP_201_CREATED)

    # ------------------------------------
    # GET USER PRODUCTS
    # ------------------------------------
    @action(detail=True, methods=["get"], url_path="products")
    def products(self, request, pk=None):
        user = self.get_object()
        products = Product.objects.filter(owner=user).order_by("-created_at")
        return Response(ProductSerializer(products, many=True).data)

    # ------------------------------------
    # GET USER ORDERS
    # ------------------------------------
    @action(detail=True, methods=["get"], url_path="orders")
    def orders(self, request, pk=None):
        user = self.get_object()

        if user.role == "consumer":
            qs = Order.objects.filter(user=user).order_by("-created_at")
        elif user.role in ["retailer", "wholesaler"]:
            qs = (
                Order.objects.filter(items__product__owner=user)
                .distinct()
                .order_by("-created_at")
            )
        else:
            qs = Order.objects.none()

        return Response(OrderSerializer(qs, many=True).data)

    # -------------------------------------
    # GET LATEST PENDING UPGRADE REQUEST
    # -------------------------------------
    @action(detail=True, methods=["get"], url_path="upgrade-request")
    def upgrade_request(self, request, pk=None):
        user = self.get_object()
        req = (
            RoleUpgradeRequest.objects.filter(user=user, status="pending")
            .order_by("-created_at")
            .first()
        )

        if not req:
            return Response({"has_pending": False, "request": None})

        return Response(
            {"has_pending": True, "request": RoleUpgradeRequestSerializer(req).data}
        )
    
    # -------------------------------------
    # APPROVE ROLE UPGRADE (per user)
    # -------------------------------------
    @action(detail=True, methods=["post"], url_path="upgrade-request/approve")
    def approve_upgrade(self, request, pk=None):
        user = self.get_object()

        req = (
            RoleUpgradeRequest.objects.filter(user=user, status="pending")
            .order_by("-created_at")
            .first()
        )
        if not req:
            return Response(
                {"detail": "No pending upgrade request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get("admin_comment", "")

        req.approve(admin_user=request.user, comment=comment)

        return Response(
            {
                "detail": "Role upgrade approved.",
                "request": RoleUpgradeRequestSerializer(req).data,
                "user": AdminUserSerializer(user).data,
            }
        )

    # -------------------------------------
    # REJECT ROLE UPGRADE (per user)
    # -------------------------------------
    @action(detail=True, methods=["post"], url_path="upgrade-request/reject")
    def reject_upgrade(self, request, pk=None):
        user = self.get_object()

        req = (
            RoleUpgradeRequest.objects.filter(user=user, status="pending")
            .order_by("-created_at")
            .first()
        )
        if not req:
            return Response(
                {"detail": "No pending upgrade request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get("admin_comment", "")

        req.reject(admin_user=request.user, comment=comment)

        return Response(
            {
                "detail": "Role upgrade rejected.",
                "request": RoleUpgradeRequestSerializer(req).data,
                "user": AdminUserSerializer(user).data,
            }
        )

    # -------------------------------------
    # VERIFY / UNVERIFY USER
    # -------------------------------------
    @action(detail=True, methods=["post"], url_path="verify")
    def verify_user(self, request, pk=None):
        user = self.get_object()
        value = bool(request.data.get("is_verified", True))

        if value:
            user.mark_verified(admin_user=request.user)
        else:
            user.mark_unverified(admin_user=request.user)

        return Response({
            "detail": "Verification updated.",
            "user": AdminUserSerializer(user).data,
        })


    # -------------------------------------
    # SET USER ROLE DIRECTLY (super_admin only)
    # -------------------------------------
    @action(detail=True, methods=["post"], url_path="set-role")
    def set_role(self, request, pk=None):
        user = self.get_object()

        new_role = request.data.get("role")
        new_admin_type = request.data.get("admin_type", "none")

        if not new_role and not new_admin_type:
            return Response(
                {"detail": "No role or admin_type provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.admin_type != "super_admin":
            return Response(
                {"detail": "Only super admin can change user roles."},
                status=status.HTTP_403_FORBIDDEN
            )

        if new_role:
            user.role = new_role

        if new_admin_type:
            user.admin_type = new_admin_type

        user.save()

        return Response({
            "detail": "Role updated successfully.",
            "user": AdminUserSerializer(user).data
        })
