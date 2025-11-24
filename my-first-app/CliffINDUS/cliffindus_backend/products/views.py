from rest_framework import viewsets, permissions, filters, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from cliffindus_backend.products.models import (
    Product, Category, Cart, CartItem, Order, OrderItem, Shipping
)
from cliffindus_backend.products.serializers import (
    AdminOrderDashboardSerializer, ProductSerializer, CategorySerializer,
    CartSerializer, CartItemSerializer,
    OrderSerializer, OrderItemSerializer,
    ShippingSerializer
)
from cliffindus_backend.products.permissions import (
    IsAdmin,
    IsRetailerOrWholesalerOrReadOnly,
    IsConsumer,
    ReadOnly,
    IsAuthenticatedAndVerified,
    IsAllowedToModifyOrder,
    IsVerifiedOwnerOrAdmin,
    IsOrderParticipant,
)

from cliffindus_backend.products.utils import (
    get_visible_products_for,
    get_visible_carts_for,
    get_visible_shipping_for,
    get_visible_orders_for,
)


# ✅ CATEGORY MANAGEMENT (Admin only)
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAdminUser]


# ✅ PRODUCT MANAGEMENT
class ProductViewSet(viewsets.ModelViewSet):
    """
    Handles product CRUD with role-based visibility:
    - Admin: all products
    - Wholesaler: their own products
    - Retailer: verified wholesalers’ products
    - Consumer: verified retailers’ products
    """
    serializer_class = ProductSerializer
    permission_classes = [IsRetailerOrWholesalerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category__name", "price"]
    search_fields = ["name", "description"]
    ordering_fields = ["price", "created_at"]

    def get_queryset(self):
        return get_visible_products_for(self.request.user).order_by("-created_at")

    def get_permissions(self):
        # Only verified owners or admins can update/delete
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsVerifiedOwnerOrAdmin()]
        return [permission() for permission in self.permission_classes]

    def perform_create(self, serializer):
        user = self.request.user
        if not getattr(user, "is_authenticated", False):
            raise serializers.ValidationError({"detail": "Authentication required to create a product."})
        if getattr(user, "role", None) not in ["wholesaler", "admin", "retailer"]:
            raise serializers.ValidationError({"detail": "Only wholesalers, retailers, or admins can create products."})
        if not getattr(user, "is_verified", False) and getattr(user, "role", None) != "admin":
            raise serializers.ValidationError({"detail": "Your account must be verified to create products."})
        serializer.save(owner=user)



# ✅ CART VIEW (Consumer only)
class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticatedAndVerified, IsVerifiedOwnerOrAdmin]

    def get_queryset(self):
        return get_visible_carts_for(self.request.user).order_by("-id")

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, "role", None) != "consumer":
            raise serializers.ValidationError({"detail": "Only consumers can create carts."})
        serializer.save(user=user)



# ✅ CART ITEM VIEW (Consumer only)
class CartItemViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticatedAndVerified]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        serializer.save(cart=cart)


# ✅ ORDER VIEW — with lifecycle + stock checks
class OrderViewSet(viewsets.ModelViewSet):
    """
    Secure order checkout process with RBAC visibility and lifecycle:
    - Admin: all orders; can change any status
    - Wholesaler/Retailer: orders containing their products; can move status along fulfillment
    - Consumer: their own orders; can create & cancel (while pending)
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticatedAndVerified]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        # Visibility now fully RBAC-aware
        return get_visible_orders_for(self.request.user).order_by("-created_at")

    # ------------------------------------------------------
    # 🔐 PERMISSIONS PER ACTION
    # ------------------------------------------------------
    def get_permissions(self):
        """
        - retrieve/update/delete → only participants (buyer, seller, or admin)
        - transition actions (process, ship, deliver, cancel) → order-modification rules
        - other actions (list/create) → authenticated & verified users
        """
        if self.action in ["retrieve", "update", "partial_update", "destroy"]:
            return [IsOrderParticipant()]
        if self.action in ["process", "ship", "deliver", "cancel"]:
            return [IsAuthenticatedAndVerified(), IsAllowedToModifyOrder()]
        return [permission() for permission in self.permission_classes]

    # ------------------------------------------------------
    # 🧾 ORDER CREATION — TRANSACTION SAFE
    # ------------------------------------------------------
    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user

        # Only verified consumers can create orders
        if getattr(user, "role", None) != "consumer":
            raise serializers.ValidationError({"detail": "Only consumers can place orders."})
        if not getattr(user, "is_verified", False):
            raise serializers.ValidationError({"detail": "Your account must be verified before placing orders."})

        # Ensure cart exists and not empty
        cart, _ = Cart.objects.get_or_create(user=user)
        if not cart.items.exists():
            raise serializers.ValidationError({"detail": "Your cart is empty."})

        # 🔒 Validate stock and compute total
        total_price = 0
        for item in cart.items.select_related("product"):
            product = item.product
            if item.quantity > product.stock:
                raise serializers.ValidationError({
                    "detail": f"Insufficient stock for '{product.name}'. "
                              f"Available: {product.stock}, requested: {item.quantity}"
                })
            total_price += product.price * item.quantity

        # Create the order
        order = serializer.save(user=user, total_price=total_price)

        # 🧾 Copy cart items → order items & decrement stock
        for item in cart.items.select_related("product"):
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price,
            )
            item.product.stock = max(0, item.product.stock - item.quantity)
            item.product.save(update_fields=["stock"])

        # 🧹 Empty the cart after checkout
        cart.items.all().delete()
        return order


    # ------------------------------------------------------
    # 🔁 Status transitions (explicit endpoints)
    # ------------------------------------------------------
    def _can_transition(self, user, order, to_status):
        """
        RBAC rules for status transitions:
        - Admin: any transition
        - Consumer: may cancel only while pending and only their own order
        - Retailer/Wholesaler: can move orders containing their products through
          pending->processing->shipped->delivered, and cancel while pending/processing
        """
        role = getattr(user, "role", None)

        current = order.status
        allowed_chain = ["pending", "processing", "shipped", "delivered"]
        allowed_pairs = set(zip(allowed_chain, allowed_chain[1:]))

        if role == "admin":
            return True

        # Consumer: only own order, cancel from pending
        if role == "consumer":
            return order.user_id == user.id and current == "pending" and to_status == "cancelled"

        # Seller roles: must own at least one product in the order
        if role in ["retailer", "wholesaler"]:
            owns_any = order.items.filter(product__owner=user).exists()
            if not owns_any:
                return False
            # forward transitions along the chain
            if (current, to_status) in allowed_pairs:
                return True
            # cancellation before shipped
            if to_status == "cancelled" and current in ["pending", "processing"]:
                return True
            return False

        return False

    def _apply_transition_side_effects(self, order, to_status, request):
        """
        Side effects on transitions:
        - shipped: ensure Shipping object exists; set shipped_date and optional tracking fields
        - delivered: set delivery_date
        - cancelled: restock (only if not shipped)
        """
        if to_status == "shipped":
            shipping, created = Shipping.objects.get_or_create(order=order)
            # allow passing shipping fields in request for convenience
            fields = ["address", "city", "state", "postal_code", "tracking_number"]
            updated = False
            for f in fields:
                val = request.data.get(f)
                if val:
                    setattr(shipping, f, val)
                    updated = True
            if shipping.shipped_date is None:
                shipping.shipped_date = timezone.now()
                updated = True
            if updated:
                shipping.save()

        elif to_status == "delivered":
            shipping, _ = Shipping.objects.get_or_create(order=order)
            if shipping.delivery_date is None:
                shipping.delivery_date = timezone.now()
                shipping.save(update_fields=["delivery_date"])

        elif to_status == "cancelled":
            # Restock only if the order hasn't shipped yet
            if order.status in ["pending", "processing"]:
                for item in order.items.select_related("product"):
                    product = item.product
                    product.stock = product.stock + item.quantity
                    product.save(update_fields=["stock"])

    def _transition(self, request, order, to_status):
        user = request.user
        if not self._can_transition(user, order, to_status):
            return Response({"detail": "You are not allowed to perform this transition."},
                            status=status.HTTP_403_FORBIDDEN)

        # Prevent moving backwards / invalids for consumers
        if order.status == to_status:
            return Response({"detail": f"Order already in '{to_status}'."}, status=status.HTTP_400_BAD_REQUEST)

        # Disallow delivering before shipped, etc.
        invalid_pairs = {
            ("pending", "delivered"),
            ("pending", "shipped"),
            ("processing", "delivered"),
            ("shipped", "processing"),
            ("delivered", "processing"),
            ("delivered", "shipped"),
        }
        if (order.status, to_status) in invalid_pairs and getattr(request.user, "role", None) != "admin":
            return Response({"detail": "Invalid transition for current state."}, status=status.HTTP_400_BAD_REQUEST)

        # Apply side effects first (so timestamps align), then persist status
        self._apply_transition_side_effects(order, to_status, request)
        order.status = to_status
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedAndVerified, IsAllowedToModifyOrder])
    def process(self, request, pk=None):
        order = self.get_object()
        return self._transition(request, order, "processing")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedAndVerified, IsAllowedToModifyOrder])
    def ship(self, request, pk=None):
        order = self.get_object()
        return self._transition(request, order, "shipped")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedAndVerified, IsAllowedToModifyOrder])
    def deliver(self, request, pk=None):
        order = self.get_object()
        return self._transition(request, order, "delivered")

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedAndVerified, IsAllowedToModifyOrder])
    def cancel(self, request, pk=None):
        order = self.get_object()
        # Do not allow cancel after shipped unless admin
        if order.status in ["shipped", "delivered"] and getattr(request.user, "role", None) != "admin":
            return Response({"detail": "Cannot cancel an order that has already shipped."},
                            status=status.HTTP_400_BAD_REQUEST)
        return self._transition(request, order, "cancelled")


# ✅ SHIPPING VIEW (Consumer only for own orders; Admin full)
class ShippingViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingSerializer
    permission_classes = [IsAuthenticatedAndVerified]

    def get_queryset(self):
        return get_visible_shipping_for(self.request.user).order_by("-id")

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, "role", None) != "consumer" and getattr(user, "role", None) != "admin":
            raise serializers.ValidationError({"detail": "Only consumers (for their orders) or admins can create shipping records."})
        serializer.save()
# ✅ ADMIN DASHBOARD FOR ORDERS & SHIPPING
class AdminOrderManagementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Provides consolidated view of orders + shipping info for admins.
    Supports filtering by status, role, and fulfillment state.
    """
    serializer_class = AdminOrderDashboardSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "user__role", "user__is_verified", "shipping__isnull"]
    search_fields = ["user__username", "items__product__name"]
    ordering_fields = ["created_at", "status", "total_price"]

    def get_queryset(self):
        return (
            Order.objects.all()
            .select_related("user")
            .prefetch_related("items__product__owner", "shipping")
            .order_by("-created_at")
        )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """
        Returns summarized admin stats:
        - total orders
        - total pending
        - total shipped/delivered
        - active consumers, retailers, wholesalers
        """
        from cliffindus_backend.users.models import User

        data = {
            "total_orders": Order.objects.count(),
            "pending_orders": Order.objects.filter(status="pending").count(),
            "processing_orders": Order.objects.filter(status="processing").count(),
            "shipped_orders": Order.objects.filter(status="shipped").count(),
            "delivered_orders": Order.objects.filter(status="delivered").count(),
            "cancelled_orders": Order.objects.filter(status="cancelled").count(),
            "active_consumers": User.objects.filter(role="consumer", is_verified=True).count(),
            "active_retailers": User.objects.filter(role="retailer", is_verified=True).count(),
            "active_wholesalers": User.objects.filter(role="wholesaler", is_verified=True).count(),
        }
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def bulk_update_status(self, request):
        """
        Allows admin to bulk update multiple orders’ statuses.
        Example body:
        {
            "order_ids": [1, 2, 3],
            "new_status": "shipped"
        }
        """
        order_ids = request.data.get("order_ids", [])
        new_status = request.data.get("new_status")

        if not order_ids or not new_status:
            return Response(
                {"detail": "Both 'order_ids' and 'new_status' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_statuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Choose from {valid_statuses}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = Order.objects.filter(id__in=order_ids).update(status=new_status)
        return Response({"updated_orders": updated}, status=status.HTTP_200_OK)
