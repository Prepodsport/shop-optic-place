from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Order, OrderItem, Coupon
from .serializers import CheckoutSerializer, OrderSerializer, calc_discount
from catalog.models import Product


class MyOrdersView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    queryset = Order.objects.none()

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items__product",
                                                                             "items__product__category",
                                                                             "items__product__brand")


class CheckoutView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CheckoutSerializer

    @transaction.atomic
    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        user = request.user if request.user.is_authenticated else None

        coupon = None
        coupon_code = (data.get("coupon_code") or "").strip()
        if coupon_code:
            coupon = Coupon.objects.filter(code__iexact=coupon_code).first()

        # Collect products
        product_ids = [i["product_id"] for i in data["items"]]
        products = Product.objects.filter(id__in=product_ids, is_active=True).select_related("category", "brand")
        product_map = {p.id: p for p in products}

        total = 0
        order_items = []
        for item in data["items"]:
            p = product_map.get(item["product_id"])
            if not p:
                return Response({"detail": f"Product {item['product_id']} not found"},
                                status=status.HTTP_400_BAD_REQUEST)
            qty = int(item["qty"])
            unit_price = p.price
            line_total = unit_price * qty
            total += line_total
            order_items.append((p, qty, unit_price, line_total))

        discount = calc_discount(total, coupon)
        if discount < 0:
            discount = 0
        if discount > total:
            discount = total

        grand_total = total - discount

        order = Order.objects.create(
            user=user,
            email=data["email"],
            phone=data.get("phone", ""),
            status=Order.STATUS_PLACED,
            coupon=coupon,
            total=total,
            discount_total=discount,
            grand_total=grand_total,
        )

        for p, qty, unit_price, line_total in order_items:
            OrderItem.objects.create(
                order=order,
                product=p,
                qty=qty,
                unit_price=unit_price,
                line_total=line_total,
            )

        return Response(OrderSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)
