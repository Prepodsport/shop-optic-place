import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger("emails")


def _human_shipping_method(code: str) -> str:
    return {
        "pickup": "Самовывоз",
        "courier": "Курьерская доставка",
        "post": "Почта России",
    }.get(code, code or "")


def _human_payment_method(code: str) -> str:
    return {
        "online": "Онлайн оплата",
        "cash": "При получении (наличные)",
        "card": "При получении (картой)",
    }.get(code, code or "")


def _build_items(order):
    items = []
    for item in order.items.all():
        attrs = ""
        if item.variant_attributes:
            attrs = ", ".join(f"{k}: {v}" for k, v in item.variant_attributes.items())
        items.append({
            "name": item.product_name,
            "attrs": attrs,
            "qty": item.qty,
            "unit_price": item.unit_price,
            "line_total": item.line_total,
        })
    return items


def _urls_for_order(order):
    site = (getattr(settings, "SITE_URL", "") or "").rstrip("/")
    order_url = f"{site}/account/orders/{order.id}" if site else ""
    support_url = f"{site}/support" if site else ""
    return order_url, support_url


def _send_multipart(*, subject: str, to_email: str, text_template: str, html_template: str, context: dict):
    text_body = render_to_string(text_template, context).strip()
    html_body = render_to_string(html_template, context).strip()

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
        reply_to=[getattr(settings, "SUPPORT_EMAIL", "info@opticplace.ru")],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


def send_order_confirmation(order):
    try:
        subject = f"Заказ #{order.id} принят — OpticPlace"

        items = _build_items(order)
        shipping_method_name = _human_shipping_method(order.shipping_method)
        payment_method_name = _human_payment_method(order.payment_method)
        order_url, support_url = _urls_for_order(order)

        ctx = {
            "site_name": "OpticPlace",
            "order": order,
            "items": items,
            "shipping_method_name": shipping_method_name,
            "payment_method_name": payment_method_name,
            "order_url": order_url,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "info@opticplace.ru"),
            "support_phone": getattr(settings, "SUPPORT_PHONE", "+7 (495) 123-45-67"),
            "support_phone_tel": getattr(settings, "SUPPORT_PHONE_TEL", "+74951234567"),
            "support_url": support_url,
        }

        _send_multipart(
            subject=subject,
            to_email=order.email,
            text_template="emails/order_confirmation.txt",
            html_template="emails/order_confirmation.html",
            context=ctx,
        )

        logger.info("Order confirmation email sent for order #%s to %s", order.id, order.email)
        return True
    except Exception as e:
        logger.error("Failed to send order confirmation email for order #%s: %s", order.id, e)
        return False


def send_order_paid(order):
    try:
        subject = f"Оплата заказа #{order.id} получена — OpticPlace"
        order_url, support_url = _urls_for_order(order)

        ctx = {
            "site_name": "OpticPlace",
            "order": order,
            "order_url": order_url,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "info@opticplace.ru"),
            "support_phone": getattr(settings, "SUPPORT_PHONE", "+7 (495) 123-45-67"),
            "support_phone_tel": getattr(settings, "SUPPORT_PHONE_TEL", "+74951234567"),
            "support_url": support_url,
        }

        _send_multipart(
            subject=subject,
            to_email=order.email,
            text_template="emails/order_paid.txt",
            html_template="emails/order_paid.html",
            context=ctx,
        )

        logger.info("Payment confirmation email sent for order #%s to %s", order.id, order.email)
        return True
    except Exception as e:
        logger.error("Failed to send payment confirmation email for order #%s: %s", order.id, e)
        return False


def send_order_shipped(order):
    try:
        subject = f"Заказ #{order.id} отправлен — OpticPlace"
        order_url, support_url = _urls_for_order(order)

        ctx = {
            "site_name": "OpticPlace",
            "order": order,
            "order_url": order_url,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "info@opticplace.ru"),
            "support_phone": getattr(settings, "SUPPORT_PHONE", "+7 (495) 123-45-67"),
            "support_phone_tel": getattr(settings, "SUPPORT_PHONE_TEL", "+74951234567"),
            "support_url": support_url,
            "shipping_method_name": _human_shipping_method(order.shipping_method),
        }

        _send_multipart(
            subject=subject,
            to_email=order.email,
            text_template="emails/order_shipped.txt",
            html_template="emails/order_shipped.html",
            context=ctx,
        )

        logger.info("Shipping notification email sent for order #%s to %s", order.id, order.email)
        return True
    except Exception as e:
        logger.error("Failed to send shipping notification email for order #%s: %s", order.id, e)
        return False


def send_order_cancelled(order):
    try:
        subject = f"Заказ #{order.id} отменён — OpticPlace"
        order_url, support_url = _urls_for_order(order)

        ctx = {
            "site_name": "OpticPlace",
            "order": order,
            "order_url": order_url,
            "support_email": getattr(settings, "SUPPORT_EMAIL", "info@opticplace.ru"),
            "support_phone": getattr(settings, "SUPPORT_PHONE", "+7 (495) 123-45-67"),
            "support_phone_tel": getattr(settings, "SUPPORT_PHONE_TEL", "+74951234567"),
            "support_url": support_url,
        }

        _send_multipart(
            subject=subject,
            to_email=order.email,
            text_template="emails/order_cancelled.txt",
            html_template="emails/order_cancelled.html",
            context=ctx,
        )

        logger.info("Cancellation email sent for order #%s to %s", order.id, order.email)
        return True
    except Exception as e:
        logger.error("Failed to send cancellation email for order #%s: %s", order.id, e)
        return False
