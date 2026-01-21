from unfold.admin import ModelAdmin
from unfold.decorators import display
from django.contrib import admin
from django.utils.html import format_html
from .models import TopHeader, Banner


@admin.register(TopHeader)
class TopHeaderAdmin(ModelAdmin):
    list_display = ("text_preview", "link", "is_active", "order", "updated_at")
    list_filter = ("is_active",)
    list_editable = ("is_active", "order")
    search_fields = ("text",)
    ordering = ("order", "-created_at")

    @display(description="Текст")
    def text_preview(self, obj):
        return obj.text[:80] + "..." if len(obj.text) > 80 else obj.text


@admin.register(Banner)
class BannerAdmin(ModelAdmin):
    list_display = ("title", "image_preview", "is_active", "order", "updated_at")
    list_filter = ("is_active",)
    list_editable = ("is_active", "order")
    search_fields = ("title", "subtitle")
    ordering = ("order", "-created_at")

    @display(description="Превью")
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 100px;" />',
                obj.image.url
            )
        return "-"
