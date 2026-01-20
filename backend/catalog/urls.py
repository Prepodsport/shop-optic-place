from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, BrandViewSet, ProductViewSet, AttributeViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"brands", BrandViewSet, basename="brands")
router.register(r"products", ProductViewSet, basename="products")
router.register(r"attributes", AttributeViewSet, basename="attributes")

urlpatterns = router.urls
