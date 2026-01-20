from django.db import models
from django.conf import settings
from catalog.models import Product


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
    STATUS_PAID = "paid"
    STATUS_CANCELLED = "cancelled"

    STATUSES = [
        (STATUS_CART, "Корзина"),
        (STATUS_PLACED, "Оформлен"),
        (STATUS_PAID, "Оплачен"),
        (STATUS_CANCELLED, "Отменён"),
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

    created_at = models.DateTimeField("Дата создания", auto_now_add=True)

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ("-created_at",)

    def __str__(self):
        return f"Заказ #{self.id} - {self.get_status_display()}"


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
    qty = models.PositiveIntegerField("Количество", default=1)
    unit_price = models.DecimalField("Цена за единицу", max_digits=12, decimal_places=2)
    line_total = models.DecimalField("Сумма позиции", max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = "Позиция заказа"
        verbose_name_plural = "Позиции заказа"

    def __str__(self):
        return f"{self.product.name} x{self.qty}"
