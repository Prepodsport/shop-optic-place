import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def send_appointment_confirmation(appointment):
    """Отправить подтверждение записи на приём"""
    try:
        service_types = {
            "ophthalmologist": "офтальмолога",
            "optometrist": "оптометриста",
        }
        service_name = service_types.get(appointment.service_type, "специалиста")

        subject = "Запись на приём подтверждена — OpticPlace"

        # Форматируем дату и время
        dt = appointment.desired_datetime
        datetime_str = dt.strftime("%d.%m.%Y в %H:%M") if dt else "по согласованию"

        message = f"""
Здравствуйте, {appointment.full_name}!

Ваша заявка на приём к {service_name} успешно принята.

═══════════════════════════════════════
ДЕТАЛИ ЗАПИСИ
═══════════════════════════════════════

Услуга: Приём {service_name}
Дата и время: {datetime_str}
Телефон: {appointment.phone}
{f"Комментарий: {appointment.comment}" if appointment.comment else ""}

═══════════════════════════════════════

Наш специалист свяжется с вами для подтверждения записи.

Адрес клиники:
г. Москва, ул. Примерная, д. 1
Время работы: Пн-Пт 10:00-20:00, Сб-Вс 11:00-18:00

Если у вас изменились планы, пожалуйста, сообщите нам заранее:
Телефон: +7 (495) 123-45-67
Email: info@opticplace.ru

С уважением,
Команда OpticPlace
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[appointment.email],
            fail_silently=False,
        )
        logger.info(f"Appointment confirmation email sent for appointment #{appointment.id} to {appointment.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send appointment confirmation email for #{appointment.id}: {e}")
        return False
