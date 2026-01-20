from rest_framework import serializers
from .models import TopHeader, Banner


class TopHeaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopHeader
        fields = ("id", "text", "link", "order")


class BannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    image_mobile_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = (
            "id",
            "title",
            "subtitle",
            "image_url",
            "image_mobile_url",
            "link",
            "button_text",
            "order",
        )

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_image_mobile_url(self, obj):
        request = self.context.get("request")
        if obj.image_mobile and request:
            return request.build_absolute_uri(obj.image_mobile.url)
        # Fallback на основное изображение
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None
