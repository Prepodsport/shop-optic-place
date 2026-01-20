from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import TopHeader, Banner
from .serializers import TopHeaderSerializer, BannerSerializer


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
