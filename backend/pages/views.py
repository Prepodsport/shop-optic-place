from rest_framework import generics, permissions
from .models import Page
from .serializers import PageSerializer


class PageListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PageSerializer

    def get_queryset(self):
        return Page.objects.filter(is_published=True)


class PageRetrieveView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PageSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Page.objects.filter(is_published=True)
