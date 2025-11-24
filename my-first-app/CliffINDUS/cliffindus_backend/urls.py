from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from cliffindus_backend.users.admin_dashboard import cliffindus_admin_site
from cliffindus_backend.users.admin_views import AdminUserViewSet



# --------------------------------------------------------
# 🌍 Developer-Friendly Root View
# --------------------------------------------------------
def root_view(request):
    """
    Welcome route for API discovery. Lists key endpoints dynamically
    so developers can explore available modules easily.
    """
    available_endpoints = {
        "users": "/api/users/",
        "products": "/api/products/",
        "auth": {
            "login": "/api/users/auth/login/",
            "refresh": "/api/users/auth/refresh/",
            "token_obtain": "/api/token/",
            "token_refresh": "/api/token/refresh/",
        },
        "admin_panel": "/admin/",
    }

    # Optional modules (future expansion)
    optional_modules = {}
    try:
        # 🧩 Optional analytics module
        import cliffindus_backend.analytics.urls  # noqa: F401
        optional_modules["analytics"] = "/api/analytics/"
    except ModuleNotFoundError:
        pass

    try:
        # 💬 Optional support/ticketing module
        import cliffindus_backend.support.urls  # noqa: F401
        optional_modules["support"] = "/api/support/"
    except ModuleNotFoundError:
        pass

    try:
        # 📊 Optional admin metrics module
        import cliffindus_backend.metrics.urls  # noqa: F401
        optional_modules["metrics"] = "/api/admin/metrics/"
    except ModuleNotFoundError:
        pass

    available_endpoints.update(optional_modules)

    return JsonResponse(
        {
            "project": "CliffINDUS Marketplace Backend",
            "version": "1.0.0",
            "message": "Welcome to the CliffINDUS API 🚀",
            "available_endpoints": available_endpoints,
        },
        json_dumps_params={"indent": 2},
    )


# --------------------------------------------------------
# ✅ Core URL Routes
# --------------------------------------------------------
urlpatterns = [
    # 🧭 Custom Admin Dashboard
    path("admin/", cliffindus_admin_site.urls),

    # 🔐 JWT Authentication (global fallback)
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # 🧩 App-specific APIs
    path("api/users/", include("cliffindus_backend.users.urls")),
    path("api/products/", include("cliffindus_backend.products.urls")),
    path("api/admin/metrics/", include("cliffindus_backend.metrics.urls")),

    # 🧩 Optional modules (add them when ready)
    # path("api/analytics/", include("cliffindus_backend.analytics.urls")),
    # path("api/support/", include("cliffindus_backend.support.urls")),
    # path("api/admin/metrics/", include("cliffindus_backend.metrics.urls")),

    # 🌍 Root welcome route
    path("", root_view),

    path("api/analytics/", include("cliffindus_backend.analytics.urls")),
    path("api/", include("cliffindus_backend.credits.urls")),
    path("api/admin/", include("cliffindus_backend.admin.urls")),


]


# --------------------------------------------------------
# 🧰 Static / Media Serving (Dev Mode Only)
# --------------------------------------------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
