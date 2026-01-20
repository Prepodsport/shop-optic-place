from django.urls import path
from .views import CheckoutView, MyOrdersView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("my/", MyOrdersView.as_view(), name="my_orders"),
]
