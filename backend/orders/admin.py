from unfold.admin import ModelAdmin, TabularInline
from django.contrib import admin
from django.contrib import messages
from .models import Order, OrderItem, Coupon
from .emails import send_order_shipped, send_order_paid


class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "variant", "product_name", "product_sku", "variant_attributes", "qty", "unit_price", "line_total")


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ("id", "user", "email", "phone", "status", "grand_total", "payment_method", "created_at")
    list_filter = ("status", "payment_method", "shipping_method", "created_at")
    search_fields = ("email", "phone", "user__email", "shipping_name")
    readonly_fields = ("total", "discount_total", "grand_total", "created_at", "updated_at")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)
    actions = ["mark_as_shipped", "mark_as_paid", "send_shipping_email"]

    fieldsets = (
        ("Основная информация", {
            "fields": ("user", "email", "phone", "status")
        }),
        ("Доставка", {
            "fields": ("shipping_name", "shipping_address", "shipping_city", "shipping_postal_code", "shipping_method", "shipping_cost", "tracking_number")
        }),
        ("Оплата", {
            "fields": ("payment_method", "payment_id", "paid_at")
        }),
        ("Суммы", {
            "fields": ("total", "discount_total", "grand_total", "coupon")
        }),
        ("Примечания", {
            "fields": ("customer_note", "admin_note"),
            "classes": ("collapse",)
        }),
        ("Даты", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )

    @admin.action(description="Отметить как отправленные")
    def mark_as_shipped(self, request, queryset):
        updated = 0
        for order in queryset.filter(status__in=[Order.STATUS_PAID, Order.STATUS_PROCESSING]):
            order.status = Order.STATUS_SHIPPED
            order.save(update_fields=["status", "updated_at"])
            send_order_shipped(order)
            updated += 1
        self.message_user(request, f"Отправлено заказов: {updated}", messages.SUCCESS)

    @admin.action(description="Отметить как оплаченные")
    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        updated = 0
        for order in queryset.filter(status__in=[Order.STATUS_PLACED, Order.STATUS_CONFIRMED]):
            order.status = Order.STATUS_PAID
            order.paid_at = timezone.now()
            order.save(update_fields=["status", "paid_at", "updated_at"])
            send_order_paid(order)
            updated += 1
        self.message_user(request, f"Оплачено заказов: {updated}", messages.SUCCESS)

    @admin.action(description="Отправить email об отправке")
    def send_shipping_email(self, request, queryset):
        sent = 0
        for order in queryset.filter(status=Order.STATUS_SHIPPED):
            if send_order_shipped(order):
                sent += 1
        self.message_user(request, f"Отправлено уведомлений: {sent}", messages.SUCCESS)


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = ("id", "order", "product", "qty", "unit_price", "line_total")
    list_filter = ("order__status",)
    search_fields = ("product__name", "order__email")


@admin.register(Coupon)
class CouponAdmin(ModelAdmin):
    list_display = ("code", "discount_type", "amount", "is_active", "starts_at", "ends_at", "min_total")
    list_filter = ("is_active", "discount_type")
    search_fields = ("code",)
