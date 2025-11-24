# --------------------------------------------------------
# ✅ RBAC VISIBILITY UTILITIES (Enterprise + Public Catalog)
# --------------------------------------------------------
from django.db.models import Q
from cliffindus_backend.users.models import User
from cliffindus_backend.products.models import Product, Order, Cart, Shipping

# --------------------------------------------------------
# ✅ ROLE HIERARCHY
# --------------------------------------------------------
ROLE_HIERARCHY = {
    "admin": 4,
    "wholesaler": 3,
    "retailer": 2,
    "consumer": 1,
    "public": 0,
}

# --------------------------------------------------------
# ✅ PRODUCT VISIBILITY (Public + RBAC)
# --------------------------------------------------------
def get_visible_products_for(user):
    """
    Returns a queryset of products visible to the given user based on:
    - Role hierarchy
    - Verification status
    - Public catalog exposure
    """

    # Anonymous (public visitor)
    if not getattr(user, "is_authenticated", False):
        verified_retailers = User.objects.filter(role="retailer", is_verified=True)
        return Product.objects.filter(owner__in=verified_retailers).select_related("owner", "category")

    role = getattr(user, "role", None)
    is_verified = getattr(user, "is_verified", False)

    # Admin → full access
    if role == "admin":
        return Product.objects.select_related("owner", "category")

    # Wholesaler → own products only
    if role == "wholesaler":
        return Product.objects.filter(owner=user).select_related("category")

    # Retailer → verified wholesalers’ products
    if role == "retailer":
        verified_wholesalers = User.objects.filter(role="wholesaler", is_verified=True)
        return Product.objects.filter(owner__in=verified_wholesalers).select_related("owner", "category")

    # Consumer (verified) → verified retailers’ products
    if role == "consumer" and is_verified:
        verified_retailers = User.objects.filter(role="retailer", is_verified=True)
        return Product.objects.filter(owner__in=verified_retailers).select_related("owner", "category")

    # Unverified logged-in user → public-level access
    verified_retailers = User.objects.filter(role="retailer", is_verified=True)
    return Product.objects.filter(owner__in=verified_retailers).select_related("owner", "category")

# --------------------------------------------------------
# ✅ ORDER VISIBILITY
# --------------------------------------------------------
def get_visible_orders_for(user):
    """
    Returns orders visible to the given user.
    - Admin: All
    - Wholesaler/Retailer: Orders containing their products
    - Consumer: Own orders only
    """
    if not getattr(user, "is_authenticated", False):
        return Order.objects.none()

    role = getattr(user, "role", None)
    is_verified = getattr(user, "is_verified", False)

    if role == "admin":
        return Order.objects.select_related("user").prefetch_related("items__product")

    if not is_verified:
        return Order.objects.none()

    if role in ["wholesaler", "retailer"]:
        return (
            Order.objects.filter(items__product__owner=user)
            .select_related("user")
            .prefetch_related("items__product")
            .distinct()
        )

    if role == "consumer":
        return (
            Order.objects.filter(user=user)
            .select_related("user")
            .prefetch_related("items__product")
        )

    return Order.objects.none()

# --------------------------------------------------------
# ✅ CART VISIBILITY
# --------------------------------------------------------
def get_visible_carts_for(user):
    """
    Carts visible to a user:
    - Admin: All carts
    - Consumer: Their own only
    """
    if not getattr(user, "is_authenticated", False):
        return Cart.objects.none()

    role = getattr(user, "role", None)
    is_verified = getattr(user, "is_verified", False)

    if role == "admin":
        return Cart.objects.select_related("user")

    if role == "consumer" and is_verified:
        return Cart.objects.filter(user=user).select_related("user")

    return Cart.objects.none()

# --------------------------------------------------------
# ✅ SHIPPING VISIBILITY
# --------------------------------------------------------
def get_visible_shipping_for(user):
    """
    Shipping details visible based on:
    - Admin: All
    - Consumer: Their own orders only
    """
    if not getattr(user, "is_authenticated", False):
        return Shipping.objects.none()

    role = getattr(user, "role", None)
    is_verified = getattr(user, "is_verified", False)

    if role == "admin":
        return Shipping.objects.select_related("order", "order__user")

    if role == "consumer" and is_verified:
        return Shipping.objects.filter(order__user=user).select_related("order", "order__user")

    return Shipping.objects.none()

# --------------------------------------------------------
# ✅ CENTRALIZED DISPATCHER
# --------------------------------------------------------
def get_visible_queryset(model_name: str, user):
    """
    Unified visibility entrypoint:
    Example:
        get_visible_queryset("product", request.user)
    """
    model_name = model_name.lower()
    if model_name in ["product", "products"]:
        return get_visible_products_for(user)
    if model_name in ["order", "orders"]:
        return get_visible_orders_for(user)
    if model_name in ["cart", "carts"]:
        return get_visible_carts_for(user)
    if model_name in ["shipping", "shippings"]:
        return get_visible_shipping_for(user)
    raise ValueError(f"Unsupported model for visibility: {model_name}")
