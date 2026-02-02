from unfold.admin import ModelAdmin
from unfold.decorators import display
from django.contrib import admin
from django.utils.html import format_html
from .models import TopHeader, Banner, Service, SiteSettings


@admin.register(SiteSettings)
class SiteSettingsAdmin(ModelAdmin):
    list_display = ("site_name", "logo_preview")
    fieldsets = (
        ("Основное", {
            "fields": ("site_name", "logo", "logo_text", "favicon"),
        }),
    )

    @display(description="Логотип")
    def logo_preview(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" style="max-height: 40px;" />',
                obj.logo.url
            )
        return obj.logo_text or "-"

    def has_add_permission(self, request):
        # Разрешаем добавление только если нет записей
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


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


@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    list_display = ("title", "image_preview", "is_active", "sort", "updated_at")
    list_filter = ("is_active",)
    list_editable = ("is_active", "sort")
    search_fields = ("title", "description")
    ordering = ("sort", "-created_at")

    @display(description="Превью")
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 100px;" />',
                obj.image.url
            )
        return "-"
