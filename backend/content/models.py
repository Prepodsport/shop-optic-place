from django.db import models


class SiteSettings(models.Model):
    """Настройки сайта (синглтон)."""

    site_name = models.CharField("Название сайта", max_length=200, default="OpticPlace")
    logo = models.ImageField("Логотип", upload_to="site/", blank=True, null=True)
    logo_text = models.CharField(
        "Текст логотипа (если нет изображения)",
        max_length=100,
        blank=True,
        default="OpticPlace"
    )
    favicon = models.ImageField("Favicon", upload_to="site/", blank=True, null=True)

    class Meta:
        verbose_name = "Настройки сайта"
        verbose_name_plural = "Настройки сайта"

    def __str__(self):
        return "Настройки сайта"

    def save(self, *args, **kwargs):
        # Синглтон - только одна запись
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class TopHeader(models.Model):
    """Промо-сообщения в топ-хедере сайта."""

    text = models.CharField("Текст", max_length=500)
    link = models.URLField("Ссылка", blank=True)
    is_active = models.BooleanField("Активен", default=True)
    order = models.PositiveIntegerField("Порядок", default=0)
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Топ хедер"
        verbose_name_plural = "Топ хедер"
        ordering = ("order", "-created_at")

    def __str__(self):
        return self.text[:50]


class Banner(models.Model):
    """Баннеры для слайдера на главной странице."""

    title = models.CharField("Заголовок", max_length=200)
    subtitle = models.CharField("Подзаголовок", max_length=300, blank=True)
    image = models.ImageField("Изображение", upload_to="banners/")
    image_mobile = models.ImageField(
        "Изображение (мобильное)",
        upload_to="banners/mobile/",
        blank=True,
        help_text="Опционально. Если не указано, используется основное изображение"
    )
    link = models.URLField("Ссылка", blank=True)
    button_text = models.CharField("Текст кнопки", max_length=50, default="Подробнее")
    is_active = models.BooleanField("Активен", default=True)
    order = models.PositiveIntegerField("Порядок", default=0)
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Баннер"
        verbose_name_plural = "Баннеры"
        ordering = ("order", "-created_at")

    def __str__(self):
        return self.title


class Service(models.Model):
    """Услуги для отображения на главной странице."""

    title = models.CharField("Название", max_length=200)
    description = models.TextField("Описание", blank=True)
    icon = models.CharField(
        "Иконка (SVG код или класс)",
        max_length=500,
        blank=True,
        help_text="SVG код иконки или CSS класс"
    )
    image = models.ImageField("Изображение", upload_to="services/", blank=True, null=True)
    link = models.CharField("Ссылка", max_length=500, blank=True)
    is_active = models.BooleanField("Активна", default=True)
    sort = models.PositiveIntegerField("Сортировка", default=0)
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Услуга"
        verbose_name_plural = "Услуги"
        ordering = ("sort", "-created_at")

    def __str__(self):
        return self.title
