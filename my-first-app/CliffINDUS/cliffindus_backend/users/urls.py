from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from cliffindus_backend.users.admin_views import AdminUserViewSet
from cliffindus_backend.users.admin_upgrade_views import AdminUpgradeRequestViewSet

from .views import (
    RoleUpgradeRequestViewSet,
    UserViewSet,
    RegisterUserView,
    AdminRoleDashboardViewSet,
    SendVerificationEmailView,
    MeView,
)



router = DefaultRouter()
router.register(r'upgrade-requests', RoleUpgradeRequestViewSet, basename='upgrade-request')
router.register(r'users', UserViewSet, basename='user')
router.register(r'admin/role-requests', AdminRoleDashboardViewSet, basename='admin-role-requests')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
router.register(r"admin/upgrade-requests", AdminUpgradeRequestViewSet, basename="admin-upgrade-requests")


urlpatterns = [
    path('', include(router.urls)),

    # 🔐 AUTH
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 🧾 Registration + Verification
    path('register/', RegisterUserView.as_view(), name='register'),
    path('send-verification/', SendVerificationEmailView.as_view(), name='send_verification'),

    # 👤 SELF PROFILE
    path('me/', MeView.as_view(), name='me'),
    path("api/admin/", include("cliffindus_backend.admin.urls")),

]
