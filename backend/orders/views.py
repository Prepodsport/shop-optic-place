from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from .models import Order, OrderItem, Coupon
from .serializers import (
    CheckoutSerializer, OrderSerializer, OrderListSerializer, calc_discount
)
from catalog.models import Product, ProductVariant
from .emails import send_order_confirmation, send_order_cancelled
import logging

logger = logging.getLogger(__name__)


class MyOrdersView(generics.ListAPIView):
    """Список заказов текущего пользователя"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderListSerializer
    queryset = Order.objects.none()

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        ).exclude(
            status=Order.STATUS_CART
        ).prefetch_related("items")


class OrderDetailView(generics.RetrieveAPIView):
    """Детали заказа"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        ).prefetch_related(
            "items__product",
            "items__product__category",
            "items__product__brand",
            "items__variant"
        )


class OrderCancelView(APIView):
    """Отмена заказа"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_for_update(),
            pk=pk,
            user=request.user
        )

        if not order.can_cancel():
            return Response(
                {"detail": "Этот заказ нельзя отменить"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Восстанавливаем остатки
        order.restore_stock()
        order.status = Order.STATUS_CANCELLED
        order.save(update_fields=["status", "updated_at"])

        # Отправляем email об отмене
        send_order_cancelled(order)

        return Response(OrderSerializer(order).data)


class CheckoutView(generics.GenericAPIView):
    """Оформление заказа"""
    permission_classes = [permissions.AllowAny]
    serializer_class = CheckoutSerializer

    @transaction.atomic
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user if request.user.is_authenticated else None

        # Получаем купон
        coupon = None
        coupon_code = (data.get("coupon_code") or "").strip()
        if coupon_code:
            coupon = Coupon.objects.filter(code__iexact=coupon_code, is_active=True).first()

        # Собираем ID товаров и вариаций
        product_ids = [item["product_id"] for item in data["items"]]
        variant_ids = [item.get("variant_id") for item in data["items"] if item.get("variant_id")]

        # Загружаем товары и вариации
        products = Product.objects.filter(
            id__in=product_ids, is_active=True
        ).select_related("category", "brand")
        product_map = {p.id: p for p in products}

        variants = ProductVariant.objects.filter(
            id__in=variant_ids, is_active=True
        ).select_for_update().prefetch_related("attribute_values__attribute")
        variant_map = {v.id: v for v in variants}

        # Проверяем и собираем позиции заказа
        total = 0
        order_items_data = []
        errors = []

        for item in data["items"]:
            product = product_map.get(item["product_id"])
            if not product:
                errors.append(f"Товар ID {item['product_id']} не найден")
                continue

            variant = None
            variant_id = item.get("variant_id")

            if variant_id:
                variant = variant_map.get(variant_id)
                if not variant:
                    errors.append(f"Вариация ID {variant_id} не найдена")
                    continue
                if variant.product_id != product.id:
                    errors.append(f"Вариация {variant_id} не принадлежит товару {product.name}")
                    continue

            qty = item["qty"]

            # Проверяем остаток
            if variant:
                if variant.stock < qty:
                    errors.append(
                        f"Недостаточно товара '{product.name}' на складе. "
                        f"Доступно: {variant.stock}, запрошено: {qty}"
                    )
                    continue
                unit_price = variant.get_price()
            else:
                # Товар без вариаций - проверяем есть ли вариации
                if product.has_variations():
                    errors.append(f"Для товара '{product.name}' необходимо выбрать вариацию")
                    continue
                unit_price = product.price

            line_total = unit_price * qty
            total += line_total
            order_items_data.append({
                "product": product,
                "variant": variant,
                "qty": qty,
                "unit_price": unit_price,
                "line_total": line_total,
            })

        if errors:
            return Response(
                {"detail": errors[0], "errors": errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Расчёт скидки
        discount = calc_discount(total, coupon)
        discount = max(0, min(discount, total))

        # Стоимость доставки (пока 0, будет расширено)
        shipping_cost = 0
        grand_total = total - discount + shipping_cost

        # Создаём заказ
        order = Order.objects.create(
            user=user,
            email=data["email"],
            phone=data.get("phone", ""),
            shipping_name=data.get("shipping_name", ""),
            shipping_address=data.get("shipping_address", ""),
            shipping_city=data.get("shipping_city", ""),
            shipping_postal_code=data.get("shipping_postal_code", ""),
            shipping_method=data.get("shipping_method", ""),
            shipping_cost=shipping_cost,
            payment_method=data.get("payment_method", ""),
            customer_note=data.get("customer_note", ""),
            status=Order.STATUS_PLACED,
            coupon=coupon,
            total=total,
            discount_total=discount,
            grand_total=grand_total,
        )

        # Создаём позиции и списываем остатки
        for item_data in order_items_data:
            OrderItem.objects.create(
                order=order,
                product=item_data["product"],
                variant=item_data["variant"],
                qty=item_data["qty"],
                unit_price=item_data["unit_price"],
                line_total=item_data["line_total"],
            )

            # Списываем остаток с вариации
            if item_data["variant"]:
                ProductVariant.objects.filter(pk=item_data["variant"].pk).update(
                    stock=F("stock") - item_data["qty"]
                )
                # Увеличиваем счётчик продаж товара
                Product.objects.filter(pk=item_data["product"].pk).update(
                    sales_count=F("sales_count") + item_data["qty"]
                )

        logger.info(f"Order #{order.id} created for {data['email']}, total: {grand_total}")

        # Отправляем email подтверждения
        send_order_confirmation(order)

        return Response(
            OrderSerializer(order, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )


class CouponValidateView(APIView):
    """Проверка купона"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = request.data.get("code", "").strip()
        total = request.data.get("total", 0)

        if not code:
            return Response(
                {"valid": False, "message": "Код купона не указан"},
                status=status.HTTP_400_BAD_REQUEST
            )

        coupon = Coupon.objects.filter(code__iexact=code, is_active=True).first()
        if not coupon:
            return Response(
                {"valid": False, "message": "Купон не найден или неактивен"}
            )

        discount = calc_discount(total, coupon)
        if discount == 0:
            return Response(
                {"valid": False, "message": "Купон не применим к этому заказу"}
            )

        return Response({
            "valid": True,
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "amount": float(coupon.amount),
            "discount": float(discount),
            "message": f"Скидка {discount:.2f} ₽"
        })
