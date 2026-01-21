from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta
from django.templatetags.static import static

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


DEBUG = env("DEBUG", "0") == "1"

SECRET_KEY = env("SECRET_KEY", "dev-secret")

ALLOWED_HOSTS = [h.strip() for h in env("ALLOWED_HOSTS", "127.0.0.1,localhost").split(",") if h.strip()]

INSTALLED_APPS = [
    "unfold",
    "unfold.contrib.filters",  # optional, if special filters are needed
    "unfold.contrib.forms",  # optional, if special form elements are needed
    "unfold.contrib.inlines",  # optional, if special inlines are needed
    "unfold.contrib.import_export",  # optional, if django-import-export package is used
    "unfold.contrib.guardian",  # optional, if django-guardian package is used
    "unfold.contrib.simple_history",  # optional, if django-simple-history package is used
    "unfold.contrib.location_field",  # optional, if django-location-field package is used
    "unfold.contrib.constance",  # optional, if django-constance package is used

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # Для logout/инвалидации токенов
    "drf_spectacular",
    "corsheaders",
    "django_filters",

    # Local apps
    "accounts",
    "catalog",
    "orders",
    "appointments",
    "integrations",
    "content",
    "pages",
    "token_manager",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ru-ru"
TIME_ZONE = "Europe/Moscow"
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
CORS_ALLOWED_ORIGINS = [o.strip() for o in env("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# DRF / JWT / Swagger
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "auth": "5/minute",  # Для auth endpoints
        "checkout": "10/hour",  # Для оформления заказов
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,  # Выдавать новый refresh при обновлении
    "BLACKLIST_AFTER_ROTATION": True,  # Блэклистить старый refresh после ротации
    "UPDATE_LAST_LOGIN": True,  # Обновлять last_login при авторизации
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
}

# Swagger settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'OpticPlace API',
    'DESCRIPTION': 'API для интернет-магазина оптики',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api/',
}

# Custom User
AUTH_USER_MODEL = "accounts.User"

# Bitrix24 integration
BITRIX24_WEBHOOK_URL = env("BITRIX24_WEBHOOK_URL", "")

# YooKassa (ЮKassa) integration
YOOKASSA_SHOP_ID = env("YOOKASSA_SHOP_ID", "")
YOOKASSA_SECRET_KEY = env("YOOKASSA_SECRET_KEY", "")
YOOKASSA_RETURN_URL = env("YOOKASSA_RETURN_URL", "")

# Frontend URL (для редиректов)
FRONTEND_URL = env("FRONTEND_URL", "http://localhost:5173")

UNFOLD = {
    "SITE_TITLE": "OpticPlace Admin",
    "SITE_HEADER": "OpticPlace",
    "SITE_SUBHEADER": "Управление магазином",
    "SITE_URL": "/",
    "SITE_SYMBOL": "inventory_2",
    "SITE_ICON": {
        "light": lambda request: static("admin/icon-light.svg"),
        "dark": lambda request: static("admin/icon-dark.svg"),
    },
    "SITE_LOGO": {
        "light": lambda request: static("admin/logo-light.svg"),
        "dark": lambda request: static("admin/logo-dark.svg"),
    },
    # "THEME": "dark",  # если хотите зафиксировать тему и убрать переключатель
}

# Basic logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "orders": {"handlers": ["console"], "level": "INFO"},
        "accounts": {"handlers": ["console"], "level": "INFO"},
    },
}

# ======================
# Security Settings
# ======================

# XSS Protection
SECURE_BROWSER_XSS_FILTER = True

# Prevent MIME type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# Clickjacking protection
X_FRAME_OPTIONS = "DENY"

# HTTPS settings (включить в продакшене)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 год
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Referrer Policy
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# Content Security Policy (базовый)
# Для более строгой настройки рекомендуется использовать django-csp
CSP_DEFAULT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_SCRIPT_SRC = ("'self'",)
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")

# Email settings (для уведомлений)
EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(env("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env("EMAIL_USE_TLS", "1") == "1"
EMAIL_HOST_USER = env("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "OpticPlace <noreply@opticplace.ru>")
