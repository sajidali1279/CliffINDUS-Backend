from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to super admin users.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "admin_type", None) == "super_admin"
        )


class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Allows access to both normal admins and super admins.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "admin_type", None) in ["admin", "super_admin"]
        )


class CanRequestRoleUpgrade(permissions.BasePermission):
    """
    Consumers, retailers, and wholesalers can request role upgrade/role change.
    Admins and Super Admins cannot.
    """

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        # Block all admin-types from requesting
        if getattr(user, "admin_type", None) in ["admin", "super_admin"]:
            return False

        # Any non-admin (consumer / retailer / wholesaler) may request
        return True
