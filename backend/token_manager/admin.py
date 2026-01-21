# token_manager/admin.py
from unfold.admin import ModelAdmin
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.token_blacklist import models

# ОТМЕНЯЕМ регистрацию оригинальных моделей
try:
    admin.site.unregister(models.OutstandingToken)
    admin.site.unregister(models.BlacklistedToken)
except Exception:
    pass

# Перерегистрируем с русскими названиями
@admin.register(models.OutstandingToken)
class OutstandingTokenAdmin(ModelAdmin):
    list_display = ("id", "user", "jti", "created_at", "expires_at")
    list_filter = ("user",)
    search_fields = ("user__email", "jti")
    ordering = ("-created_at",)
    readonly_fields = ("id", "user", "jti", "token", "created_at", "expires_at")

@admin.register(models.BlacklistedToken)
class BlacklistedTokenAdmin(ModelAdmin):
    list_display = ("id", "token", "blacklisted_at")
    search_fields = ("token__jti",)
    ordering = ("-blacklisted_at",)
    readonly_fields = ("id", "token", "blacklisted_at")