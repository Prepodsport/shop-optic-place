from unfold.admin import ModelAdmin
from django.contrib import admin
from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(ModelAdmin):
    list_display = ("id", "full_name", "email", "phone", "service_type", "status", "desired_datetime", "created_at")
    list_filter = ("status", "service_type", "created_at")
    search_fields = ("full_name", "email", "phone", "comment")
    readonly_fields = ("created_at", "bitrix_raw")
    list_editable = ("status",)
    ordering = ("-created_at",)

    fieldsets = (
        ("Пользователь", {
            "fields": ("user",)
        }),
        ("Контактная информация", {
            "fields": ("full_name", "email", "phone")
        }),
        ("Детали записи", {
            "fields": ("service_type", "desired_datetime", "comment", "status")
        }),
        ("Интеграция с Bitrix24", {
            "fields": ("bitrix_raw",),
            "classes": ("collapse",)
        }),
        ("Системная информация", {
            "fields": ("created_at",),
            "classes": ("collapse",)
        }),
    )
