from rest_framework.routers import DefaultRouter
from cliffindus_backend.users.admin_views import AdminUserViewSet

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = router.urls
