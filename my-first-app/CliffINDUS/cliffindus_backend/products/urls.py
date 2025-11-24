from rest_framework.routers import DefaultRouter
from cliffindus_backend.products.views import (
    CategoryViewSet,
    ProductViewSet,
    CartViewSet,
    CartItemViewSet,
    OrderViewSet,
    ShippingViewSet,
    AdminOrderManagementViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"carts", CartViewSet, basename="cart")
router.register(r"cart-items", CartItemViewSet, basename="cartitem")
router.register(r"orders", OrderViewSet, basename="order")
router.register(r"shipping", ShippingViewSet, basename="shipping")
router.register(r"admin-orders", AdminOrderManagementViewSet, basename="adminorder")

urlpatterns = router.urls
