"""
Views для работы с платежами
"""
import json
import logging
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Order
from .serializers import OrderSerializer
from .emails import send_order_paid
from integrations.yookassa import yookassa_client

logger = logging.getLogger(__name__)


class CreatePaymentView(APIView):
    """Создание платежа для заказа"""
    permission_classes = [AllowAny]

    def post(self, request, order_id):
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверяем что заказ можно оплатить
        if order.status not in [Order.STATUS_PLACED, Order.STATUS_CONFIRMED]:
            return Response(
                {"detail": "Этот заказ нельзя оплатить"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проверяем что заказ ещё не оплачен
        if order.payment_id and order.status == Order.STATUS_PAID:
            return Response(
                {"detail": "Заказ уже оплачен"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создаём платёж в YooKassa
        result = yookassa_client.create_payment(
            amount=order.grand_total,
            order_id=order.id,
            description=f"Оплата заказа #{order.id} в OpticPlace",
            customer_email=order.email,
            return_url=request.data.get("return_url"),
        )

        if "error" in result:
            logger.error(f"Payment creation failed for order {order.id}: {result['error']}")
            return Response(
                {"detail": result["error"]},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Сохраняем ID платежа
        order.payment_id = result["payment_id"]
        order.save(update_fields=["payment_id"])

        return Response({
            "payment_id": result["payment_id"],
            "confirmation_url": result["confirmation_url"],
            "order_id": order.id,
        })


class PaymentStatusView(APIView):
    """Проверка статуса платежа"""
    permission_classes = [AllowAny]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Заказ не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        if not order.payment_id:
            return Response({
                "order_id": order.id,
                "order_status": order.status,
                "payment_status": None,
                "paid": False,
            })

        # Получаем статус из YooKassa
        result = yookassa_client.get_payment(order.payment_id)

        if "error" in result:
            return Response({
                "order_id": order.id,
                "order_status": order.status,
                "payment_status": "unknown",
                "paid": order.status == Order.STATUS_PAID,
                "error": result["error"],
            })

        # Если платёж успешен - обновляем заказ
        if result.get("paid") and order.status != Order.STATUS_PAID:
            order.status = Order.STATUS_PAID
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "paid_at", "updated_at"])
            logger.info(f"Order {order.id} marked as paid via status check")
            send_order_paid(order)

        return Response({
            "order_id": order.id,
            "order_status": order.status,
            "payment_id": result.get("payment_id"),
            "payment_status": result.get("status"),
            "paid": result.get("paid", False),
        })


@csrf_exempt
def yookassa_webhook(request):
    """
    Webhook для обработки уведомлений от YooKassa

    YooKassa отправляет POST запросы при изменении статуса платежа.
    Документация: https://yookassa.ru/developers/using-api/webhooks
    """
    if request.method != "POST":
        return HttpResponse(status=405)

    try:
        body = request.body
        data = json.loads(body)
    except json.JSONDecodeError:
        logger.error("YooKassa webhook: invalid JSON")
        return HttpResponse(status=400)

    event_type = data.get("event")
    payment_object = data.get("object", {})
    payment_id = payment_object.get("id")
    payment_status = payment_object.get("status")
    metadata = payment_object.get("metadata", {})
    order_id = metadata.get("order_id")

    logger.info(f"YooKassa webhook: event={event_type}, payment={payment_id}, order={order_id}")

    if not order_id:
        logger.warning("YooKassa webhook: no order_id in metadata")
        return HttpResponse(status=200)

    try:
        order = Order.objects.get(pk=int(order_id))
    except (Order.DoesNotExist, ValueError):
        logger.warning(f"YooKassa webhook: order {order_id} not found")
        return HttpResponse(status=200)

    # Обработка события
    if event_type == "payment.succeeded":
        if order.status != Order.STATUS_PAID:
            order.status = Order.STATUS_PAID
            order.payment_id = payment_id
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "payment_id", "paid_at", "updated_at"])
            logger.info(f"Order {order.id} marked as paid via webhook")

            # Отправляем email с подтверждением оплаты
            send_order_paid(order)

    elif event_type == "payment.canceled":
        # Платёж отменён - можно уведомить пользователя
        logger.info(f"Payment canceled for order {order.id}")

    elif event_type == "refund.succeeded":
        # Возврат успешен
        if order.status != Order.STATUS_REFUNDED:
            order.status = Order.STATUS_REFUNDED
            order.save(update_fields=["status", "updated_at"])

            # Восстанавливаем остатки
            order.restore_stock()
            logger.info(f"Order {order.id} refunded via webhook")

    return HttpResponse(status=200)
