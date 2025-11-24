from rest_framework import serializers
from cliffindus_backend.products.models import (
    Category, Product, Cart, CartItem, Order, OrderItem, Shipping
)


# --------------------------------------------------------
# ✅ CATEGORY
# --------------------------------------------------------
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description"]


# --------------------------------------------------------
# ✅ PRODUCT
# --------------------------------------------------------
class ProductOwnerMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    role = serializers.CharField()


class ProductSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField(read_only=True)
    can_edit = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "price", "category",
            "stock", "is_active", "created_at", "updated_at",
            "owner", "can_edit"
        ]
        read_only_fields = ["owner", "created_at", "updated_at", "can_edit"]

    def get_owner(self, obj):
        """Return owner info depending on viewer role."""
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return None

        user = request.user
        role = getattr(user, "role", None)
        owner = obj.owner

        # Admin or self → full details
        if role == "admin" or owner == user:
            return {
                "id": owner.id,
                "username": owner.username,
                "email": owner.email,
                "role": owner.role,
                "verified": owner.is_verified,
            }

        # Retailer sees wholesaler name only; consumer sees retailer name only
        if (role == "retailer" and owner.role == "wholesaler") or \
           (role == "consumer" and owner.role == "retailer"):
            return {"username": owner.username, "role": owner.role}

        return None  # hide owner for everyone else

    def get_can_edit(self, obj):
        """Boolean: can current user edit this product?"""
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return False
        user = request.user
        return getattr(user, "role", None) in ["admin", "wholesaler", "retailer"] and obj.owner == user

    def validate(self, attrs):
        """Restrict editing is_active/stock to owner/admin."""
        request = self.context.get("request")
        if request and request.method in ["PUT", "PATCH"]:
            user = request.user
            if getattr(user, "role", None) not in ["admin"] and not obj.owner == user:
                attrs.pop("is_active", None)  # silently ignore unauthorized field
        return attrs


# --------------------------------------------------------
# ✅ CART / CART ITEM
# --------------------------------------------------------
class CartItemProductMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "price"]


class CartItemSerializer(serializers.ModelSerializer):
    product_detail = CartItemProductMiniSerializer(source="product", read_only=True)
    subtotal = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_detail", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        return str(obj.subtotal)  # return as string for decimal safety

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value


class CartSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_price = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "user", "items", "total_items", "total_price", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at", "user", "items", "total_items", "total_price"]

    def get_total_price(self, obj):
        return str(obj.total_price)


# --------------------------------------------------------
# ✅ ORDER / ORDER ITEM
# --------------------------------------------------------
class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    line_total = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "price", "line_total"]

    def get_line_total(self, obj):
        return str(obj.quantity * obj.price)


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField(read_only=True)
    items = serializers.SerializerMethodField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = ["id", "user", "status", "status_display", "total_price", "created_at", "items"]
        read_only_fields = ["user", "created_at", "items", "total_price", "status_display"]

    def get_user(self, obj):
        """Mask user details based on viewer role."""
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return None

        viewer = request.user
        user = obj.user

        if viewer.role == "admin" or viewer == user:
            return {"id": user.id, "username": user.username, "email": user.email}
        # Seller roles see only username and id
        if viewer.role in ["retailer", "wholesaler"]:
            return {"id": user.id, "username": user.username}
        return None

    def get_items(self, obj):
        """Return filtered order items depending on viewer."""
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return []
        viewer = request.user
        items = obj.items.select_related("product", "product__owner")

        # Consumers see all their items
        if viewer == obj.user or viewer.role == "admin":
            return [
                {
                    "product": item.product.name,
                    "seller": item.product.owner.username,
                    "quantity": item.quantity,
                    "price": str(item.price),
                }
                for item in items
            ]
        # Sellers see only items for their products
        elif viewer.role in ["retailer", "wholesaler"]:
            owned = items.filter(product__owner=viewer)
            return [
                {
                    "product": i.product.name,
                    "buyer": obj.user.username,
                    "quantity": i.quantity,
                    "price": str(i.price),
                }
                for i in owned
            ]
        return []



# --------------------------------------------------------
# ✅ SHIPPING
# --------------------------------------------------------
class ShippingSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    is_delivered = serializers.BooleanField(read_only=True)
    is_shipped = serializers.BooleanField(read_only=True)

    class Meta:
        model = Shipping
        fields = [
            "id", "order", "order_id",
            "address", "city", "state", "postal_code",
            "tracking_number", "shipped_date", "delivery_date",
            "is_shipped", "is_delivered",
        ]
        read_only_fields = ["is_shipped", "is_delivered"]

    def validate(self, attrs):
        """
        Enforce both data consistency and RBAC write restrictions.
        - Admin: full access
        - Consumer: may edit only address fields
        - Sellers (retailer/wholesaler): read-only
        """
        request = self.context.get("request")
        if not request or not hasattr(request, "user"):
            return attrs

        user = request.user
        role = getattr(user, "role", None)

        # --- RBAC: restrict writable fields ---
        if role == "consumer":
            allowed = {"address", "city", "state", "postal_code"}
            attrs = {k: v for k, v in attrs.items() if k in allowed}

        elif role in ["retailer", "wholesaler"]:
            # Sellers cannot modify shipping records directly
            raise serializers.ValidationError(
                {"detail": "You are not allowed to modify shipping information."}
            )

        # --- existing chronological sanity check ---
        shipped_date = attrs.get("shipped_date")
        delivery_date = attrs.get("delivery_date")
        if delivery_date and not shipped_date:
            raise serializers.ValidationError(
                {"delivery_date": "Cannot set delivery date before shipped_date."}
            )

        return attrs
# --------------------------------------------------------
# ✅ ADMIN DASHBOARD SERIALIZER
# --------------------------------------------------------
class AdminOrderDashboardSerializer(serializers.ModelSerializer):
    buyer = serializers.SerializerMethodField()
    sellers = serializers.SerializerMethodField()
    shipping_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "total_price",
            "created_at",
            "buyer",
            "sellers",
            "shipping_status",
        ]

    def get_buyer(self, obj):
        """Buyer (consumer) summary."""
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "email": obj.user.email,
            "role": obj.user.role,
            "verified": obj.user.is_verified,
        }

    def get_sellers(self, obj):
        """List of distinct sellers in this order."""
        sellers = obj.items.values_list("product__owner__username", flat=True).distinct()
        return list(sellers)

    def get_shipping_status(self, obj):
        """Include key fulfillment information."""
        if hasattr(obj, "shipping"):
            shipping = obj.shipping
            return {
                "id": shipping.id,
                "shipped": shipping.is_shipped,
                "delivered": shipping.is_delivered,
                "tracking_number": shipping.tracking_number,
                "city": shipping.city,
                "state": shipping.state,
            }
        return {"shipped": False, "delivered": False, "tracking_number": None}
