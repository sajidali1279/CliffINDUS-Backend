# --------------------------------------------------------
# ✅ ROLE-BASED ACCESS CONTROL (RBAC) PERMISSIONS
# --------------------------------------------------------
from rest_framework import permissions
from django.db.models import Q
from cliffindus_backend.products.models import Order

# --------------------------------------------------------
# ✅ GENERIC PERMISSIONS
# --------------------------------------------------------
class IsAuthenticatedAndVerified(permissions.BasePermission):
    """
    Allows access only to authenticated AND verified users.
    Admins are exempt from verification requirement.
    """
    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "role", None) == "admin":
            return True
        return getattr(user, "is_verified", False)


class ReadOnly(permissions.BasePermission):
    """Allow only safe (read) methods."""
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


# --------------------------------------------------------
# ✅ ROLE-SPECIFIC PERMISSIONS
# --------------------------------------------------------
class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""
    def has_permission(self, request, view):
        return getattr(request.user, "role", None) == "admin"


class IsWholesaler(permissions.BasePermission):
    """Allow access only to verified wholesalers."""
    def has_permission(self, request, view):
        user = request.user
        return getattr(user, "role", None) == "wholesaler" and getattr(user, "is_verified", False)


class IsRetailer(permissions.BasePermission):
    """Allow access only to verified retailers."""
    def has_permission(self, request, view):
        user = request.user
        return getattr(user, "role", None) == "retailer" and getattr(user, "is_verified", False)


class IsConsumer(permissions.BasePermission):
    """Allow access only to verified consumers."""
    def has_permission(self, request, view):
        user = request.user
        return getattr(user, "role", None) == "consumer" and getattr(user, "is_verified", False)


# --------------------------------------------------------
# ✅ MIXED ROLE COMBINATIONS
# --------------------------------------------------------
class IsRetailerOrWholesalerOrReadOnly(permissions.BasePermission):
    """
    Allows retailers and wholesalers (verified) to modify products.
    Others (including consumers) have read-only access.
    """
    def has_permission(self, request, view):
        user = request.user

        # Read-only for safe methods
        if request.method in permissions.SAFE_METHODS:
            return True

        # Must be authenticated
        if not getattr(user, "is_authenticated", False):
            return False

        # Allow only verified wholesalers or retailers
        role = getattr(user, "role", None)
        is_verified = getattr(user, "is_verified", False)
        return role in ["wholesaler", "retailer"] and is_verified


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Allows access if user is object owner or admin.
    Useful for carts, orders, and products.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, "role", None) == "admin":
            return True
        owner = getattr(obj, "owner", None) or getattr(obj, "user", None)
        return owner == user


# --------------------------------------------------------
# ✅ ADVANCED: ROLE + OBJECT OWNERSHIP MIX
# --------------------------------------------------------
class IsAllowedToModifyOrder(permissions.BasePermission):
    """
    - Admin: full access
    - Wholesaler/Retailer: can only view orders containing their products
    - Consumer: can modify only their own orders
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        role = getattr(user, "role", None)
        is_verified = getattr(user, "is_verified", False)

        if role == "admin":
            return True
        if not is_verified:
            return False

        # Consumer → only their own order
        if role == "consumer":
            return obj.user == user

        # Wholesaler/Retailer → if any of their products exist in this order
        if role in ["wholesaler", "retailer"]:
            return obj.items.filter(product__owner=user).exists()

        return False

class IsVerifiedOwnerOrAdmin(permissions.BasePermission):
    """
    Grants access if the user is:
      • the verified owner of the object, or
      • an admin
    Supports both obj.owner and obj.user relationships.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "role", None) == "admin":
            return True
        if not getattr(user, "is_verified", False):
            return False

        owner = getattr(obj, "owner", None) or getattr(obj, "user", None)
        return owner == user


class IsBusinessPartner(permissions.BasePermission):
    """
    Allows access between wholesalers and retailers who share
    at least one order (existing business relationship).
    Expects ?partner_id=<user_id> in query params.
    """
    def has_permission(self, request, view):
        user = request.user
        if getattr(user, "role", None) not in ["wholesaler", "retailer"]:
            return False

        partner_id = request.query_params.get("partner_id")
        if not partner_id:
            return False

        try:
            return Order.objects.filter(
                Q(items__product__owner_id=user.id, user_id=partner_id)
                | Q(items__product__owner_id=partner_id, user_id=user.id)
            ).exists()
        except Exception:
            return False


class IsOrderParticipant(permissions.BasePermission):
    """
    Grants access if:
      • user placed the order (consumer), or
      • owns at least one product in it (wholesaler/retailer), or
      • is an admin.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        role = getattr(user, "role", None)

        if role == "admin":
            return True
        if role == "consumer":
            return obj.user == user
        if role in ["wholesaler", "retailer"]:
            return obj.items.filter(product__owner=user).exists()
        return False


class IsVerifiedAndRole(permissions.BasePermission):
    """
    Generic, dynamic verifier.
    Usage:
        permission_classes = [IsVerifiedAndRole.for_roles("retailer", "wholesaler")]
    """
    allowed_roles = []

    def __init__(self, *roles):
        self.allowed_roles = roles

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "role", None) == "admin":
            return True
        return (
            getattr(user, "role", None) in self.allowed_roles
            and getattr(user, "is_verified", False)
        )

    @classmethod
    def for_roles(cls, *roles):
        return type(
            f"IsVerifiedAndRole_{'_'.join(roles)}",
            (cls,),
            {"allowed_roles": roles},
        )
