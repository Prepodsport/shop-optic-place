from django.contrib import admin
from .models import Order, OrderItem, Coupon


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "qty", "unit_price", "line_total")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "email", "phone", "status", "total", "grand_total", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("email", "phone", "user__email")
    readonly_fields = ("total", "discount_total", "grand_total", "created_at")
    inlines = [OrderItemInline]
    ordering = ("-created_at",)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product", "qty", "unit_price", "line_total")
    list_filter = ("order__status",)
    search_fields = ("product__name", "order__email")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "discount_type", "amount", "is_active", "starts_at", "ends_at", "min_total")
    list_filter = ("is_active", "discount_type")
    search_fields = ("code",)
