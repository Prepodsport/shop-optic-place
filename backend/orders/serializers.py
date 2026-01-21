from rest_framework import serializers
from .models import Order, OrderItem, Coupon
from catalog.serializers import ProductListSerializer
from catalog.models import Product, ProductVariant
from django.utils import timezone
import re


class CouponApplySerializer(serializers.Serializer):
    code = serializers.CharField()


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    qty = serializers.IntegerField(min_value=1, max_value=100)


class CheckoutSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=40)
    items = CheckoutItemSerializer(many=True)

    # Адрес доставки
    shipping_name = serializers.CharField(required=False, allow_blank=True, max_length=200)
    shipping_address = serializers.CharField(required=False, allow_blank=True)
    shipping_city = serializers.CharField(required=False, allow_blank=True, max_length=100)
    shipping_postal_code = serializers.CharField(required=False, allow_blank=True, max_length=20)
    shipping_method = serializers.CharField(required=False, allow_blank=True, max_length=50)

    # Оплата
    payment_method = serializers.CharField(required=False, allow_blank=True, max_length=50)

    # Примечание
    customer_note = serializers.CharField(required=False, allow_blank=True)

    def validate_phone(self, value):
        if value:
            # Убираем всё кроме цифр и +
            cleaned = re.sub(r'[^\d+]', '', value)
            if len(cleaned) < 10:
                raise serializers.ValidationError("Некорректный номер телефона")
        return value

    def validate(self, attrs):
        if not attrs.get("items"):
            raise serializers.ValidationError({"items": "Корзина пуста"})
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer()
    variant_attributes = serializers.JSONField(read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            "id", "product", "variant", "qty", "unit_price", "line_total",
            "product_name", "product_sku", "variant_attributes"
        )


class OrderListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка заказов (без деталей позиций)"""
    items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "status", "status_display", "grand_total",
            "created_at", "items_count"
        )

    def get_items_count(self, obj):
        return obj.items.count()


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "status", "status_display", "email", "phone",
            "shipping_name", "shipping_address", "shipping_city",
            "shipping_postal_code", "shipping_method", "shipping_cost",
            "payment_method", "paid_at", "tracking_number",
            "total", "discount_total", "grand_total",
            "customer_note", "created_at", "updated_at",
            "items", "can_cancel"
        )


def calc_discount(total, coupon: Coupon | None):
    if not coupon:
        return 0

    now = timezone.now()
    if not coupon.is_active:
        return 0
    if coupon.starts_at and now < coupon.starts_at:
        return 0
    if coupon.ends_at and now > coupon.ends_at:
        return 0
    if coupon.min_total is not None and total < coupon.min_total:
        return 0

    if coupon.discount_type == Coupon.DISCOUNT_PERCENT:
        return (total * coupon.amount) / 100
    return coupon.amount
