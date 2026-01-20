from rest_framework import serializers
from .models import Order, OrderItem, Coupon
from catalog.serializers import ProductListSerializer
from catalog.models import Product
from django.utils import timezone


class CouponApplySerializer(serializers.Serializer):
    code = serializers.CharField()


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1)


class CheckoutSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    items = CheckoutItemSerializer(many=True)

    def validate(self, attrs):
        if not attrs["items"]:
            raise serializers.ValidationError("Items required")
        return attrs


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer()

    class Meta:
        model = OrderItem
        fields = ("id", "product", "qty", "unit_price", "line_total")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ("id", "status", "email", "phone", "total", "discount_total", "grand_total", "created_at", "items")


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
