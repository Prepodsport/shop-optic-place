from django.urls import path
from .views import (
    CheckoutView, MyOrdersView, OrderDetailView,
    OrderCancelView, CouponValidateView
)
from .payment_views import CreatePaymentView, PaymentStatusView, yookassa_webhook

urlpatterns = [
    # Заказы
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("my/", MyOrdersView.as_view(), name="my_orders"),
    path("my/<int:pk>/", OrderDetailView.as_view(), name="order_detail"),
    path("my/<int:pk>/cancel/", OrderCancelView.as_view(), name="order_cancel"),

    # Купоны
    path("coupon/validate/", CouponValidateView.as_view(), name="coupon_validate"),

    # Платежи
    path("<int:order_id>/payment/create/", CreatePaymentView.as_view(), name="create_payment"),
    path("<int:order_id>/payment/status/", PaymentStatusView.as_view(), name="payment_status"),

    # Webhooks
    path("webhooks/yookassa/", yookassa_webhook, name="yookassa_webhook"),
]
