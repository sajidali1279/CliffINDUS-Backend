from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import (
    viewsets,
    permissions,
    status,
    serializers,
    filters,
)
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User, RoleUpgradeRequest, AdminPermission
from .serializers import (
    UserSerializer,
    RoleUpgradeRequestSerializer,
    AdminPermissionSerializer,
)
from .utils import send_verification_email, get_visible_users_for
from cliffindus_backend.users.permissions import (
    CanRequestRoleUpgrade,
    IsSuperAdmin,
    IsAdminOrSuperAdmin,
)

# ===================================================================
# 🧩 ROLE UPGRADE REQUEST VIEWSET
# ===================================================================
class RoleUpgradeRequestViewSet(viewsets.ModelViewSet):
    queryset = RoleUpgradeRequest.objects.select_related("user").order_by("-created_at")
    serializer_class = RoleUpgradeRequestSerializer

    def get_permissions(self):
        # Approvals → Super admin only
        if self.action in ["approve", "reject"]:
            return [IsSuperAdmin()]
        # Others → Regular authenticated users
        return [CanRequestRoleUpgrade()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.admin_type in ["admin", "super_admin"]:
            return self.queryset
        return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user

        if not user:
            raise serializers.ValidationError({"detail": "You must be logged in."})

        if user.admin_type in ["admin", "super_admin"]:
            raise serializers.ValidationError({"detail": "Admins cannot request upgrades."})

        serializer.save(user=user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        upgrade_request = self.get_object()
        if upgrade_request.status != "pending":
            return Response(
                {"detail": f"Request already {upgrade_request.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get("admin_comment", "")
        upgrade_request.approve(admin_user=request.user, comment=comment)
        self._send_status_email(upgrade_request, "approved", comment)

        return Response(
            {"detail": f"{upgrade_request.user.username} upgraded & verified."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        upgrade_request = self.get_object()
        if upgrade_request.status != "pending":
            return Response(
                {"detail": f"Request already {upgrade_request.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comment = request.data.get("admin_comment", "")
        upgrade_request.reject(admin_user=request.user, comment=comment)
        self._send_status_email(upgrade_request, "rejected", comment)

        return Response(
            {"detail": f"{upgrade_request.user.username}'s request rejected."},
            status=status.HTTP_200_OK,
        )

    def _send_status_email(self, instance, status_value, admin_comment):
        try:
            subject = f"Your Role Upgrade Request Was {status_value.title()}"
            message = (
                f"Hello {instance.user.username},\n\n"
                f"Your request to upgrade to '{instance.requested_role}' "
                f"has been {status_value}.\n"
                f"Admin comment: {admin_comment or 'None'}\n\n"
                "— CliffINDUS Team"
            )
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [instance.user.email],
                fail_silently=True,
            )
        except Exception:
            pass


# ===================================================================
# 🧑‍💼 USER MANAGEMENT (Admins Only)
# ===================================================================
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        return get_visible_users_for(self.request.user).order_by("-date_joined")


# ===================================================================
# 🧾 PUBLIC USER REGISTRATION
# ===================================================================
class RegisterUserView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"detail": serializer.errors}, status=400)

        user = serializer.save(role="consumer", is_verified=False)
        send_verification_email(user)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "detail": "Account created. Verification pending.",
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=201,
        )


# ===================================================================
# 👤 SELF PROFILE — /api/users/me/
# ===================================================================
# ==========================================================
# 👤 AUTH SELF PROFILE ENDPOINT  — /api/users/me/
# ==========================================================
class MeView(APIView):
    """
    Returns the currently logged-in user.
    Works for ALL roles: consumer, retailer, wholesaler, admin, super_admin.
    Uses JWT authentication explicitly to avoid CSRF/session issues.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "admin_type": getattr(user, "admin_type", "none"),
            "is_verified": user.is_verified,
        }
        return Response(data, status=status.HTTP_200_OK)



# ===================================================================
# ✉️ RESEND VERIFICATION
# ===================================================================
class SendVerificationEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_verified:
            return Response({"detail": "Already verified."}, status=400)

        send_verification_email(user)
        return Response({"detail": "Verification email resent."}, status=200)


# ===================================================================
# 🧩 ROLE REQUEST DASHBOARD (Super Admin Only)
# ===================================================================
class AdminRoleDashboardViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RoleUpgradeRequestSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "requested_role"]
    search_fields = ["user__username", "business_name"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        return RoleUpgradeRequest.objects.select_related("user").order_by("-created_at")

    @action(detail=False, methods=["get"])
    def stats(self, request):
        now = timezone.now()
        last7 = now - timedelta(days=7)
        last30 = now - timedelta(days=30)

        user_stats = {
            "total": User.objects.count(),
            "verified": User.objects.filter(is_verified=True).count(),
            "unverified": User.objects.filter(is_verified=False).count(),
            "admins": User.objects.filter(role="admin").count(),
            "retailers": User.objects.filter(role="retailer").count(),
            "wholesalers": User.objects.filter(role="wholesaler").count(),
            "consumers": User.objects.filter(role="consumer").count(),
            "new_last_7_days": User.objects.filter(date_joined__gte=last7).count(),
            "new_last_30_days": User.objects.filter(date_joined__gte=last30).count(),
        }

        request_stats = {
            "total": RoleUpgradeRequest.objects.count(),
            "pending": RoleUpgradeRequest.objects.filter(status="pending").count(),
            "approved": RoleUpgradeRequest.objects.filter(status="approved").count(),
            "rejected": RoleUpgradeRequest.objects.filter(status="rejected").count(),
        }

        return Response({"users": user_stats, "role_requests": request_stats})


# ===================================================================
# 🛡 ADMIN PERMISSION MANAGEMENT
# ===================================================================
class AdminPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = AdminPermissionSerializer
    queryset = AdminPermission.objects.select_related("admin")

    def get_permissions(self):
        # Approve / Reject → Only super admin
        if self.action in ["approve", "reject"]:
            return [IsSuperAdmin()]

        # List / retrieve → Admin + super admin
        if self.action in ["list", "retrieve"]:
            return [IsAdminOrSuperAdmin()]

        # Create (user submits request) → only normal users
        if self.action == "create":
            return [CanRequestRoleUpgrade()]

        return [permissions.IsAuthenticated()]


    def get_queryset(self):
        user = self.request.user
        if user.admin_type == "super_admin":
            return self.queryset
        return self.queryset.filter(admin=user)


# ===================================================================
# 🧩 ADMIN SELF DASHBOARD (admin + super_admin)
# ===================================================================
class AdminSelfDashboardView(APIView):
    permission_classes = [IsAdminOrSuperAdmin]

    def get(self, request):
        user = request.user
        data = {
            "user": {
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "admin_type": user.admin_type,
                "is_super_admin": user.admin_type == "super_admin",
            },
            "capabilities": {
                "can_manage_users": user.admin_type in ["admin", "super_admin"],
                "can_view_role_requests": user.admin_type in ["admin", "super_admin"],
                "can_approve_role_requests": user.admin_type == "super_admin",
            },
        }
        return Response(data)
