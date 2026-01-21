from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Prescription


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "phone", "is_staff", "is_active")
    search_fields = ("email", "first_name", "last_name", "phone")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Инфо о пользователе", {"fields": ("first_name", "last_name", "phone")}),
        ("Разрешения", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Логи по датам", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )

    filter_horizontal = ("groups", "user_permissions")


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "prescription_type", "is_primary", "exam_date", "expiry_date", "created_at")
    list_filter = ("prescription_type", "is_primary", "exam_date")
    search_fields = ("user__email", "name", "doctor_name", "clinic_name")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("Основное", {
            "fields": ("user", "name", "prescription_type", "is_primary")
        }),
        ("Правый глаз (OD)", {
            "fields": ("od_sph", "od_cyl", "od_axis", "od_add", "od_bc", "od_dia")
        }),
        ("Левый глаз (OS)", {
            "fields": ("os_sph", "os_cyl", "os_axis", "os_add", "os_bc", "os_dia")
        }),
        ("Межзрачковое расстояние", {
            "fields": ("pd", "pd_left", "pd_right")
        }),
        ("Информация о рецепте", {
            "fields": ("doctor_name", "clinic_name", "exam_date", "expiry_date", "notes")
        }),
        ("Системное", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
