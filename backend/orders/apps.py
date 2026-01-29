import os
import logging
from django.apps import AppConfig
from django.conf import settings


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'
    verbose_name = "Заказы"

    def ready(self):
        # Чтобы не логировалось два раза при autoreload в dev
        if os.environ.get("RUN_MAIN") != "true":
            return

        logging.getLogger("emails").info(
            "MAIL CONFIG: host=%s user=%s from=%s ssl=%s tls=%s",
            getattr(settings, "EMAIL_HOST", None),
            getattr(settings, "EMAIL_HOST_USER", None),
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
            getattr(settings, "EMAIL_USE_SSL", None),
            getattr(settings, "EMAIL_USE_TLS", None),
        )