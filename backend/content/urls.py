from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TopHeaderViewSet, BannerViewSet

router = DefaultRouter()
router.register("top-header", TopHeaderViewSet, basename="top-header")
router.register("banners", BannerViewSet, basename="banners")

urlpatterns = [
    path("", include(router.urls)),
]
