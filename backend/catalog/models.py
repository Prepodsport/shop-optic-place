from django.db import models
from django.utils.text import slugify
from itertools import product as itertools_product


class Category(models.Model):
    """Категория товаров"""
    name = models.CharField("Название", max_length=200)
    slug = models.SlugField("URL-адрес", max_length=220, unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
        verbose_name="Родительская категория"
    )

    filter_attributes = models.ManyToManyField(
        "catalog.Attribute",
        blank=True,
        related_name="categories_filter",
        verbose_name="Атрибуты фильтров для категории",
        help_text=(
            "Если выбрано — в фильтрах каталога для этой категории показываем только эти атрибуты. "
            "Если пусто — используем глобальные Attribute.is_filterable."
        )
    )

    image = models.ImageField(
        "Изображение",
        upload_to="categories/",
        null=True,
        blank=True,
        help_text="Изображение для отображения на главной странице"
    )
    sort = models.PositiveIntegerField("Сортировка", default=0)

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        ordering = ("sort", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Brand(models.Model):
    """Бренд товаров"""
    name = models.CharField("Название", max_length=200)
    slug = models.SlugField("URL-адрес", max_length=220, unique=True)

    class Meta:
        verbose_name = "Бренд"
        verbose_name_plural = "Бренды"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ============================================
# АТРИБУТЫ (глобальные, как в WooCommerce)
# ============================================

class Attribute(models.Model):
    """
    Глобальный атрибут товара.
    Примеры: Оптическая сила, Радиус кривизны, Цвет линз, Материал
    """
    name = models.CharField("Название", max_length=100)
    slug = models.SlugField("URL-адрес", max_length=120, unique=True)
    sort = models.PositiveIntegerField("Сортировка", default=0)

    # Настройки отображения
    is_filterable = models.BooleanField(
        "Показывать в фильтрах каталога",
        default=True,
        help_text="Атрибут будет доступен для фильтрации товаров в каталоге"
    )
    show_in_product_card = models.BooleanField(
        "Показывать в карточке товара",
        default=True,
        help_text="Атрибут будет показан для выбора вариации в карточке товара"
    )

    class Meta:
        verbose_name = "Атрибут"
        verbose_name_plural = "Атрибуты"
        ordering = ("sort", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class AttributeValue(models.Model):
    """
    Значение атрибута.
    Примеры для атрибута "Оптическая сила": -1.0, -1.5, -2.0, -2.5
    """
    attribute = models.ForeignKey(
        Attribute,
        on_delete=models.CASCADE,
        related_name="values",
        verbose_name="Атрибут"
    )
    value = models.CharField("Значение", max_length=100)
    slug = models.SlugField("URL-адрес", max_length=120, db_index=True)
    sort = models.PositiveIntegerField("Сортировка", default=0)

    class Meta:
        verbose_name = "Значение атрибута"
        verbose_name_plural = "Значения атрибутов"
        ordering = ("sort", "value")
        unique_together = ("attribute", "slug")
        indexes = [
            models.Index(fields=["attribute", "slug"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.value, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"


# ============================================
# ТОВАРЫ
# ============================================

class Product(models.Model):
    """Товар"""
    name = models.CharField("Название", max_length=240)
    slug = models.SlugField("URL-адрес", max_length=260, unique=True)
    description = models.TextField("Описание", blank=True)
    short_description = models.TextField("Краткое описание", blank=True)

    sku = models.CharField("Артикул (SKU)", max_length=100, blank=True)

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
        verbose_name="Категория"
    )
    brand = models.ForeignKey(
        Brand,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
        verbose_name="Бренд"
    )

    variation_attributes = models.ManyToManyField(
        "catalog.Attribute",
        blank=True,
        related_name="products_variations",
        verbose_name="Атрибуты вариаций",
        help_text="Какие атрибуты пользователь выбирает для подбора вариации (SPH/CYL/AXIS и т.п.)"
    )

    spec_attributes = models.ManyToManyField(
        "catalog.Attribute",
        blank=True,
        related_name="products_specs",
        verbose_name="Атрибуты характеристик",
        help_text="Что показывать в блоке 'Характеристики'. Если пусто — покажем все атрибуты, кроме вариационных."
    )

    price = models.DecimalField("Цена", max_digits=12, decimal_places=2)
    old_price = models.DecimalField(
        "Старая цена",
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Для отображения скидки"
    )

    weight = models.DecimalField("Вес (кг)", max_digits=10, decimal_places=3, null=True, blank=True)
    length = models.DecimalField("Длина (см)", max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField("Ширина (см)", max_digits=10, decimal_places=2, null=True, blank=True)
    height = models.DecimalField("Высота (см)", max_digits=10, decimal_places=2, null=True, blank=True)

    is_popular = models.BooleanField("Популярное", default=False, help_text="Отображать в разделе 'Популярное'")
    is_bestseller = models.BooleanField("Хит продаж", default=False, help_text="Отображать в разделе 'Хиты продаж'")
    is_new = models.BooleanField("Новинка", default=False, help_text="Отображать в разделе 'Новинки'")
    is_sale = models.BooleanField("Распродажа", default=False, help_text="Отображать на странице 'Распродажа'")

    views_count = models.PositiveIntegerField("Просмотры", default=0, editable=False)
    sales_count = models.PositiveIntegerField("Продажи", default=0, editable=False)

    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    main_image = models.ImageField("Главное изображение", upload_to="products/main/", null=True, blank=True)

    class Meta:
        verbose_name = "Товар"
        verbose_name_plural = "Товары"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["is_active", "category"]),
            models.Index(fields=["is_active", "brand"]),
            models.Index(fields=["is_active", "price"]),
            models.Index(fields=["category", "brand"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    def get_attributes_for_variations(self):
        """
        Возвращает атрибуты и значения, которые участвуют в вариациях.
        Источник значений: ProductAttributeValue (допустимые значения для товара).
        """
        variation_ids = set(self.variation_attributes.values_list("id", flat=True))
        qs = self.attribute_values.select_related("attribute", "attribute_value").all()

        if variation_ids:
            qs = qs.filter(attribute_id__in=variation_ids)
        else:
            qs = qs.filter(attribute__show_in_product_card=True)

        qs = qs.order_by("attribute__sort", "attribute__name", "attribute_value__sort", "attribute_value__value")

        attributes = {}
        for pav in qs:
            attr = pav.attribute
            if attr.id not in attributes:
                attributes[attr.id] = {"attribute": attr, "values": []}
            attributes[attr.id]["values"].append(pav.attribute_value)

        return attributes

    def generate_variations(self):
        """
        Генерирует все возможные комбинации вариаций из выбранных значений атрибутов.
        Возвращает количество созданных вариаций.
        """
        attributes_data = self.get_attributes_for_variations()
        if not attributes_data:
            return 0

        attr_values_list = []
        for _, data in attributes_data.items():
            if data["values"]:
                attr_values_list.append(data["values"])

        if not attr_values_list:
            return 0

        combinations = list(itertools_product(*attr_values_list))

        created_count = 0
        for combo in combinations:
            sorted_value_ids = sorted([v.id for v in combo])

            existing = False
            for variant in self.variants.prefetch_related("attribute_values").all():
                variant_value_ids = sorted([av.id for av in variant.attribute_values.all()])
                if variant_value_ids == sorted_value_ids:
                    existing = True
                    break

            if not existing:
                variant = ProductVariant.objects.create(
                    product=self,
                    price=self.price,
                    stock=0,
                    is_active=True
                )
                variant.attribute_values.set(combo)

                sku_parts = [self.slug[:20]]
                for val in combo:
                    sku_parts.append(val.slug[:10])
                variant.sku = "-".join(sku_parts).upper()[:100]
                variant.save()

                created_count += 1

        return created_count

    def get_price_range(self):
        """Возвращает минимальную и максимальную цену среди активных вариаций"""
        variants = self.variants.filter(is_active=True, stock__gt=0)
        if variants.exists():
            prices = [v.get_price() for v in variants]
            return min(prices), max(prices)
        return self.price, self.price

    def has_variations(self):
        """Проверяет, есть ли у товара вариации"""
        return self.variants.filter(is_active=True).exists()


class ProductImage(models.Model):
    """Дополнительное изображение товара"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images", verbose_name="Товар")
    image = models.ImageField("Изображение", upload_to="products/gallery/")
    sort = models.PositiveIntegerField("Сортировка", default=0)

    class Meta:
        verbose_name = "Изображение товара"
        verbose_name_plural = "Изображения товаров"
        ordering = ("sort", "id")

    def __str__(self):
        return f"{self.product.name} - изображение #{self.id}"


class ProductAttributeValue(models.Model):
    """
    Связь товара с конкретными значениями атрибутов.
    Определяет, какие значения атрибутов доступны для данного товара.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="attribute_values", verbose_name="Товар", db_index=True)
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, verbose_name="Атрибут", db_index=True)
    attribute_value = models.ForeignKey(AttributeValue, on_delete=models.CASCADE, verbose_name="Значение", db_index=True)

    class Meta:
        verbose_name = "Значение атрибута товара"
        verbose_name_plural = "Значения атрибутов товара"
        unique_together = ("product", "attribute_value")
        indexes = [
            models.Index(fields=["product", "attribute"]),
            models.Index(fields=["attribute", "attribute_value"]),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.attribute.name}: {self.attribute_value.value}"


class ProductVariant(models.Model):
    """
    Вариация товара - конкретная комбинация значений атрибутов.
    Имеет свою цену, остаток и артикул.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants", verbose_name="Товар", db_index=True)
    attribute_values = models.ManyToManyField(AttributeValue, related_name="variants", verbose_name="Значения атрибутов", blank=True)

    sku = models.CharField("Артикул", max_length=100, blank=True)
    price = models.DecimalField("Цена", max_digits=12, decimal_places=2, null=True, blank=True, help_text="Оставьте пустым для использования цены товара")
    old_price = models.DecimalField("Старая цена", max_digits=12, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField("Остаток на складе", default=0, db_index=True)
    is_active = models.BooleanField("Активен", default=True, db_index=True)

    class Meta:
        verbose_name = "Вариация товара"
        verbose_name_plural = "Вариации товара"
        indexes = [
            models.Index(fields=["product", "is_active", "stock"]),
        ]

    def get_price(self):
        return self.price if self.price is not None else self.product.price

    def get_old_price(self):
        if self.old_price is not None:
            return self.old_price
        return self.product.old_price

    def get_attribute_values_display(self):
        values = self.attribute_values.select_related("attribute").all()
        return ", ".join([f"{v.attribute.name}: {v.value}" for v in values])

    def __str__(self):
        values_display = self.get_attribute_values_display()
        if values_display:
            return f"{self.product.name} ({values_display})"
        return f"{self.product.name} - вариация #{self.id}"


class Review(models.Model):
    """Отзыв о товаре"""
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUSES = [
        (STATUS_PENDING, "На модерации"),
        (STATUS_APPROVED, "Одобрен"),
        (STATUS_REJECTED, "Отклонён"),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="Товар"
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
        verbose_name="Пользователь"
    )
    author_name = models.CharField(
        "Имя автора",
        max_length=100,
        help_text="Для неавторизованных пользователей или если пользователь хочет оставить другое имя"
    )
    rating = models.PositiveSmallIntegerField(
        "Оценка",
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text="Оценка от 1 до 5"
    )
    title = models.CharField(
        "Заголовок",
        max_length=200,
        blank=True
    )
    text = models.TextField(
        "Текст отзыва"
    )
    advantages = models.TextField(
        "Достоинства",
        blank=True
    )
    disadvantages = models.TextField(
        "Недостатки",
        blank=True
    )

    # Подтверждённая покупка
    is_verified_purchase = models.BooleanField(
        "Подтверждённая покупка",
        default=False,
        help_text="Пользователь купил этот товар"
    )

    status = models.CharField(
        "Статус",
        max_length=20,
        choices=STATUSES,
        default=STATUS_PENDING
    )

    # Полезность
    helpful_count = models.PositiveIntegerField(
        "Полезно",
        default=0
    )
    not_helpful_count = models.PositiveIntegerField(
        "Не полезно",
        default=0
    )

    # Ответ администратора
    admin_response = models.TextField(
        "Ответ магазина",
        blank=True
    )
    admin_response_at = models.DateTimeField(
        "Дата ответа",
        null=True,
        blank=True
    )

    created_at = models.DateTimeField("Дата создания", auto_now_add=True)
    updated_at = models.DateTimeField("Дата обновления", auto_now=True)

    class Meta:
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "status"]),
            models.Index(fields=["user"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"Отзыв на {self.product.name} от {self.author_name} ({self.rating}/5)"

    def save(self, *args, **kwargs):
        # Если пользователь указан и имя автора пустое - берём из профиля
        if self.user and not self.author_name:
            self.author_name = self.user.get_full_name() or self.user.email.split("@")[0]
        super().save(*args, **kwargs)
        # Обновляем рейтинг товара
        self.product.update_rating()


# Добавляем метод update_rating в Product
def product_update_rating(self):
    """Обновляет средний рейтинг товара на основе одобренных отзывов"""
    from django.db.models import Avg
    reviews = self.reviews.filter(status=Review.STATUS_APPROVED)
    avg = reviews.aggregate(avg_rating=Avg("rating"))["avg_rating"]
    # Можно сохранить в отдельное поле, но пока просто возвращаем
    return avg


Product.update_rating = product_update_rating
