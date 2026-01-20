from django.db import models
from django.conf import settings


class Appointment(models.Model):
    """Запись на приём к специалисту"""
    TYPE_OPHTH = "ophthalmologist"
    TYPE_OPTOM = "optometrist"
    TYPES = [
        (TYPE_OPHTH, "Офтальмолог"),
        (TYPE_OPTOM, "Оптометрист"),
    ]

    STATUS_NEW = "new"
    STATUS_SENT = "sent_to_bitrix"
    STATUS_FAILED = "bitrix_failed"
    STATUSES = [
        (STATUS_NEW, "Новая"),
        (STATUS_SENT, "Отправлена в Bitrix24"),
        (STATUS_FAILED, "Ошибка отправки в Bitrix24"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Пользователь"
    )
    service_type = models.CharField(
        "Тип услуги",
        max_length=30,
        choices=TYPES
    )
    desired_datetime = models.DateTimeField("Желаемые дата и время")

    full_name = models.CharField("ФИО", max_length=200)
    phone = models.CharField("Телефон", max_length=32, blank=True)
    email = models.EmailField("Email", blank=True)
    comment = models.TextField("Комментарий", blank=True)

    status = models.CharField(
        "Статус",
        max_length=30,
        choices=STATUSES,
        default=STATUS_NEW
    )
    bitrix_raw = models.JSONField(
        "Ответ Bitrix24",
        null=True,
        blank=True,
        help_text="Сырой ответ от Bitrix24 API"
    )

    created_at = models.DateTimeField("Дата создания", auto_now_add=True)

    class Meta:
        verbose_name = "Запись на приём"
        verbose_name_plural = "Записи на приём"
        ordering = ("-created_at",)

    def __str__(self):
        return f"Запись #{self.id} - {self.get_service_type_display()} на {self.desired_datetime.strftime('%d.%m.%Y %H:%M')}"
