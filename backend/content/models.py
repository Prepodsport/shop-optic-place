from django.db import models


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
