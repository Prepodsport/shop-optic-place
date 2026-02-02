from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from .models import TopHeader, Banner, Service, SiteSettings
from .serializers import (
    TopHeaderSerializer,
    BannerSerializer,
    ServiceSerializer,
    SiteSettingsSerializer,
)


class SiteSettingsView(APIView):
    """API для получения настроек сайта."""

    def get(self, request):
        settings = SiteSettings.get_settings()
        serializer = SiteSettingsSerializer(settings, context={"request": request})
        return Response(serializer.data)


class TopHeaderViewSet(viewsets.ReadOnlyModelViewSet):
    """API для получения сообщений топ-хедера."""

    queryset = TopHeader.objects.filter(is_active=True)
    serializer_class = TopHeaderSerializer

    @action(detail=False, methods=["get"])
    def current(self, request):
        """Получить текущее активное сообщение (первое по порядку)."""
        message = self.get_queryset().first()
        if message:
            serializer = self.get_serializer(message)
            return Response(serializer.data)
        return Response(None)


class BannerViewSet(viewsets.ReadOnlyModelViewSet):
    """API для получения баннеров."""

    queryset = Banner.objects.filter(is_active=True)
    serializer_class = BannerSerializer


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """API для получения услуг."""

    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
