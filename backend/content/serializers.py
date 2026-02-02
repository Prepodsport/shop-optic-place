from rest_framework import serializers
from .models import TopHeader, Banner, Service, SiteSettings


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = (
            "site_name",
            "logo_url",
            "logo_text",
            "favicon_url",
        )

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None

    def get_favicon_url(self, obj):
        request = self.context.get("request")
        if obj.favicon and request:
            return request.build_absolute_uri(obj.favicon.url)
        return None


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


class ServiceSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ("id", "title", "description", "icon", "image_url", "link", "sort")

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None
