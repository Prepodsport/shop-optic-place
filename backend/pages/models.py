from django.db import models


class Page(models.Model):
    """CMS-страница (О нас, Контакты, Оплата и доставка и т.п.)"""

    slug = models.SlugField(
        "URL-адрес",
        max_length=120,
        unique=True,
        help_text="Например: about, contacts, delivery",
    )
    title = models.CharField("Заголовок (H1)", max_length=255)
    is_published = models.BooleanField("Опубликована", default=True)

    created_at = models.DateTimeField("Создана", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлена", auto_now=True)

    class Meta:
        verbose_name = "Страница"
        verbose_name_plural = "Страницы"
        ordering = ("slug",)

    def __str__(self):
        return f"{self.slug}: {self.title}"


class PageSection(models.Model):
    """Секция страницы: заголовок + текст + список (по строкам)."""

    page = models.ForeignKey(
        Page,
        on_delete=models.CASCADE,
        related_name="sections",
        verbose_name="Страница"
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    heading = models.CharField("Заголовок секции (H2)", max_length=255, blank=True)
    body = models.TextField(
        "Текст",
        blank=True,
        help_text="Можно несколько абзацев. Разделяйте абзацы пустой строкой.",
    )
    bullets = models.TextField(
        "Список (пункты)",
        blank=True,
        help_text="Один пункт на строку. Если заполнено — на фронте будет <ul>.",
    )
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        verbose_name = "Секция"
        verbose_name_plural = "Секции"
        ordering = ("order", "id")

    def __str__(self):
        return f"{self.page.slug} секция #{self.order}"
