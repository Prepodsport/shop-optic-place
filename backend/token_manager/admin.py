# token_manager/admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from rest_framework_simplejwt.token_blacklist import models, admin as token_admin

# ОТМЕНЯЕМ регистрацию оригинальных моделей
admin.site.unregister(models.OutstandingToken)
admin.site.unregister(models.BlacklistedToken)

# Настраиваем перевод для оригинальных моделей
models.OutstandingToken._meta.verbose_name = _('Выданный токен')
models.OutstandingToken._meta.verbose_name_plural = _('Выданные токены')
models.BlacklistedToken._meta.verbose_name = _('Токен в черном списке')
models.BlacklistedToken._meta.verbose_name_plural = _('Токены в черном списке')

# Перерегистрируем с русскими названиями
@admin.register(models.OutstandingToken)
class OutstandingTokenAdmin(token_admin.OutstandingTokenAdmin):
    pass

@admin.register(models.BlacklistedToken)
class BlacklistedTokenAdmin(token_admin.BlacklistedTokenAdmin):
    pass