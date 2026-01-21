from django.db import models
from django.conf import settings
from catalog.models import Product, ProductVariant


class Coupon(models.Model):
    """Купон на скидку"""
    DISCOUNT_PERCENT = "percent"
    DISCOUNT_FIXED = "fixed"
    DISCOUNT_TYPES = [
        (DISCOUNT_PERCENT, "Процент от суммы"),
        (DISCOUNT_FIXED, "Фиксированная сумма"),
    ]

    code = models.CharField("Код купона", max_length=40, unique=True)
    discount_type = models.CharField(
        "Тип скидки",
        max_length=20,
        choices=DISCOUNT_TYPES,
        default=DISCOUNT_PERCENT
    )
    amount = models.DecimalField("Размер скидки", max_digits=12, decimal_places=2)
    is_active = models.BooleanField("Активен", default=True)
    starts_at = models.DateTimeField("Дата начала действия", null=True, blank=True)
    ends_at = models.DateTimeField("Дата окончания действия", null=True, blank=True)
    min_total = models.DecimalField(
        "Минимальная сумма заказа",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Минимальная сумма заказа для применения купона"
    )

    class Meta:
        verbose_name = "Купон"
        verbose_name_plural = "Купоны"

    def __str__(self):
        return self.code


class Order(models.Model):
    """Заказ"""
    STATUS_CART = "cart"
    STATUS_PLACED = "placed"
    STATUS_CONFIRMED = "confirmed"
    STATUS_PAID = "paid"
    STATUS_PROCESSING = "processing"
    STATUS_SHIPPED = "shipped"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELLED = "cancelled"
    STATUS_REFUNDED = "refunded"

    STATUSES = [
        (STATUS_CART, "Корзина"),
        (STATUS_PLACED, "Оформлен"),
        (STATUS_CONFIRMED, "Подтверждён"),
        (STATUS_PAID, "Оплачен"),
        (STATUS_PROCESSING, "В обработке"),
        (STATUS_SHIPPED, "Отправлен"),
        (STATUS_DELIVERED, "Доставлен"),
        (STATUS_CANCELLED, "Отменён"),
        (STATUS_REFUNDED, "Возврат"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
        verbose_name="Пользователь"
    )
    email = models.EmailField("Email")
    phone = models.CharField("Телефон", max_length=32, blank=True)

    # Адрес доставки
    shipping_name = models.CharField("ФИО получателя", max_length=200, blank=True)
    shipping_address = models.TextField("Адрес доставки", blank=True)
    shipping_city = models.CharField("Город", max_length=100, blank=True)
    shipping_postal_code = models.CharField("Почтовый индекс", max_length=20, blank=True)
    shipping_method = models.CharField("Способ доставки", max_length=50, blank=True)
    shipping_cost = models.DecimalField("Стоимость доставки", max_digits=12, decimal_places=2, default=0)

    # Оплата
    payment_method = models.CharField("Способ оплаты", max_length=50, blank=True)
    payment_id = models.CharField("ID платежа", max_length=100, blank=True, help_text="ID транзакции платёжной системы")
    paid_at = models.DateTimeField("Дата оплаты", null=True, blank=True)

    status = models.CharField(
        "Статус",
        max_length=20,
        choices=STATUSES,
        default=STATUS_PLACED
    )

    coupon = models.ForeignKey(
        Coupon,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orders",
        verbose_name="Купон"
    )

    total = models.DecimalField("Сумма товаров", max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField("Сумма скидки", max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField("Итого к оплате", max_digits=12, decimal_places=2, default=0)

    # Примечания
    customer_note = models.TextField("Примечание покупателя", blank=True)
    admin_note = models.TextField("Примечание администратора", blank=True)

    # Трекинг
    tracking_number = models.CharField("Номер отслеживания", max_length=100, blank=True)

    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"Заказ #{self.id} - {self.get_status_display()}"

    def can_cancel(self):
        """Можно ли отменить заказ"""
        return self.status in [self.STATUS_PLACED, self.STATUS_CONFIRMED, self.STATUS_PAID]

    def restore_stock(self):
        """Восстановить остатки при отмене заказа"""
        for item in self.items.all():
            if item.variant:
                item.variant.stock += item.qty
                item.variant.save(update_fields=["stock"])


class OrderItem(models.Model):
    """Позиция заказа"""
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Заказ"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        verbose_name="Товар"
    )
    variant = models.ForeignKey(
        ProductVariant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Вариация"
    )
    qty = models.PositiveIntegerField("Количество", default=1)
    unit_price = models.DecimalField("Цена за единицу", max_digits=12, decimal_places=2)
    line_total = models.DecimalField("Сумма позиции", max_digits=12, decimal_places=2)

    # Снапшот данных на момент заказа (чтобы не терять инфо при изменении товара)
    product_name = models.CharField("Название товара", max_length=240, blank=True)
    product_sku = models.CharField("Артикул", max_length=100, blank=True)
    variant_attributes = models.JSONField(
        "Атрибуты вариации",
        default=dict,
        blank=True,
        help_text="Снапшот атрибутов вариации на момент заказа"
    )

    class Meta:
        verbose_name = "Позиция заказа"
        verbose_name_plural = "Позиции заказа"

    def save(self, *args, **kwargs):
        # Сохраняем снапшот данных при создании
        if not self.pk:
            self.product_name = self.product.name
            self.product_sku = self.variant.sku if self.variant else self.product.sku
            if self.variant:
                self.variant_attributes = {
                    av.attribute.name: av.value
                    for av in self.variant.attribute_values.select_related("attribute").all()
                }
        super().save(*args, **kwargs)

    def __str__(self):
        name = self.product_name or self.product.name
        if self.variant_attributes:
            attrs = ", ".join(f"{k}: {v}" for k, v in self.variant_attributes.items())
            return f"{name} ({attrs}) x{self.qty}"
        return f"{name} x{self.qty}"
