import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_order_confirmation(order):
    """Отправить подтверждение заказа"""
    try:
        subject = f"Заказ #{order.id} принят — OpticPlace"

        # Формируем список товаров
        items_text = []
        for item in order.items.all():
            line = f"  • {item.product_name}"
            if item.variant_attributes:
                attrs = ", ".join(f"{k}: {v}" for k, v in item.variant_attributes.items())
                line += f" ({attrs})"
            line += f" — {item.qty} шт. × {item.unit_price} ₽ = {item.line_total} ₽"
            items_text.append(line)

        items_list = "\n".join(items_text)

        # Информация о доставке
        shipping_info = ""
        if order.shipping_method:
            methods = {
                "pickup": "Самовывоз",
                "courier": "Курьерская доставка",
                "post": "Почта России",
            }
            method_name = methods.get(order.shipping_method, order.shipping_method)
            shipping_info = f"\nСпособ доставки: {method_name}"
            if order.shipping_address:
                shipping_info += f"\nАдрес: {order.shipping_city}, {order.shipping_address}"
                if order.shipping_postal_code:
                    shipping_info += f", {order.shipping_postal_code}"

        # Информация об оплате
        payment_info = ""
        if order.payment_method:
            methods = {
                "online": "Онлайн оплата",
                "cash": "При получении (наличные)",
                "card": "При получении (картой)",
            }
            payment_info = f"\nСпособ оплаты: {methods.get(order.payment_method, order.payment_method)}"

        # Скидка
        discount_info = ""
        if order.discount_total > 0:
            discount_info = f"\nСкидка: -{order.discount_total} ₽"

        message = f"""
Здравствуйте, {order.shipping_name or 'уважаемый покупатель'}!

Спасибо за ваш заказ в OpticPlace! Мы получили его и начали обработку.

═══════════════════════════════════════
ЗАКАЗ #{order.id}
═══════════════════════════════════════

Товары:
{items_list}

───────────────────────────────────────
Сумма товаров: {order.total} ₽{discount_info}
Доставка: {order.shipping_cost} ₽
ИТОГО: {order.grand_total} ₽
───────────────────────────────────────
{shipping_info}{payment_info}

Телефон: {order.phone}
Email: {order.email}
{f"Комментарий: {order.customer_note}" if order.customer_note else ""}

═══════════════════════════════════════

Мы свяжемся с вами для подтверждения заказа.

Если у вас возникли вопросы, свяжитесь с нами:
Email: info@opticplace.ru
Телефон: +7 (495) 123-45-67

С уважением,
Команда OpticPlace
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.email],
            fail_silently=False,
        )
        logger.info(f"Order confirmation email sent for order #{order.id} to {order.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send order confirmation email for order #{order.id}: {e}")
        return False


def send_order_paid(order):
    """Отправить уведомление об оплате"""
    try:
        subject = f"Оплата заказа #{order.id} получена — OpticPlace"

        message = f"""
Здравствуйте, {order.shipping_name or 'уважаемый покупатель'}!

Мы получили оплату вашего заказа #{order.id}.

Сумма: {order.grand_total} ₽

Ваш заказ уже передан в обработку. Мы уведомим вас, когда он будет отправлен.

Следить за статусом заказа вы можете в личном кабинете на сайте.

С уважением,
Команда OpticPlace
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.email],
            fail_silently=False,
        )
        logger.info(f"Payment confirmation email sent for order #{order.id} to {order.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send payment confirmation email for order #{order.id}: {e}")
        return False


def send_order_shipped(order):
    """Отправить уведомление об отправке"""
    try:
        subject = f"Заказ #{order.id} отправлен — OpticPlace"

        tracking_info = ""
        if order.tracking_number:
            tracking_info = f"""
Номер для отслеживания: {order.tracking_number}

Отследить посылку можно на сайте транспортной компании или Почты России.
"""

        # Информация о доставке
        delivery_info = ""
        if order.shipping_method == "pickup":
            delivery_info = """
Ваш заказ готов к выдаче в пункте самовывоза.

Адрес: г. Москва, ул. Примерная, д. 1
Время работы: Пн-Пт 10:00-20:00, Сб-Вс 11:00-18:00
"""
        elif order.shipping_address:
            delivery_info = f"""
Адрес доставки: {order.shipping_city}, {order.shipping_address}
"""

        message = f"""
Здравствуйте, {order.shipping_name or 'уважаемый покупатель'}!

Отличные новости! Ваш заказ #{order.id} отправлен!
{tracking_info}{delivery_info}
Если у вас возникли вопросы по доставке, свяжитесь с нами:
Email: info@opticplace.ru
Телефон: +7 (495) 123-45-67

Спасибо, что выбрали OpticPlace!

С уважением,
Команда OpticPlace
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.email],
            fail_silently=False,
        )
        logger.info(f"Shipping notification email sent for order #{order.id} to {order.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send shipping notification email for order #{order.id}: {e}")
        return False


def send_order_cancelled(order):
    """Отправить уведомление об отмене заказа"""
    try:
        subject = f"Заказ #{order.id} отменён — OpticPlace"

        message = f"""
Здравствуйте, {order.shipping_name or 'уважаемый покупатель'}!

Ваш заказ #{order.id} был отменён.

Если оплата уже была произведена, средства будут возвращены в течение 3-5 рабочих дней.

Если у вас возникли вопросы, свяжитесь с нами:
Email: info@opticplace.ru
Телефон: +7 (495) 123-45-67

С уважением,
Команда OpticPlace
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[order.email],
            fail_silently=False,
        )
        logger.info(f"Cancellation email sent for order #{order.id} to {order.email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send cancellation email for order #{order.id}: {e}")
        return False
