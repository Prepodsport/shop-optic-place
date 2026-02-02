from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TopHeaderViewSet, BannerViewSet, ServiceViewSet, SiteSettingsView

router = DefaultRouter()
router.register("top-header", TopHeaderViewSet, basename="top-header")
router.register("banners", BannerViewSet, basename="banners")
router.register("services", ServiceViewSet, basename="services")

urlpatterns = [
    path("settings/", SiteSettingsView.as_view(), name="site-settings"),
    path("", include(router.urls)),
]
