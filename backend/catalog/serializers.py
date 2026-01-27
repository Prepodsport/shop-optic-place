from rest_framework import serializers
from .models import (
    Category, Brand, Product, ProductImage,
    Attribute, AttributeValue, ProductAttributeValue, ProductVariant, Review
)
from drf_spectacular.utils import extend_schema_field


class CategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "parent", "image_url",)

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "slug")


# ============================================
# АТРИБУТЫ
# ============================================

class AttributeValueSerializer(serializers.ModelSerializer):
    """Значение атрибута"""
    class Meta:
        model = AttributeValue
        fields = ("id", "value", "slug")


class AttributeSerializer(serializers.ModelSerializer):
    """Атрибут со всеми значениями"""
    values = AttributeValueSerializer(many=True, read_only=True)

    class Meta:
        model = Attribute
        fields = ("id", "name", "slug", "is_filterable", "show_in_product_card", "values")


class AttributeFilterSerializer(serializers.ModelSerializer):
    """Атрибут для фильтров каталога (только filterable)"""
    values = serializers.SerializerMethodField()

    class Meta:
        model = Attribute
        fields = ("id", "name", "slug", "values")

    def get_values(self, obj):
        """Возвращает только те значения, которые есть у товаров в каталоге"""
        # Получаем значения, которые используются хотя бы в одной вариации с остатком > 0
        used_values = AttributeValue.objects.filter(
            attribute=obj,
            variants__is_active=True,
            variants__stock__gt=0
        ).distinct()
        return AttributeValueSerializer(used_values, many=True).data


# ============================================
# ВАРИАЦИИ
# ============================================

class VariantAttributeValueSerializer(serializers.ModelSerializer):
    """Значение атрибута в вариации"""
    attribute_id = serializers.IntegerField(source="attribute.id")
    attribute_name = serializers.CharField(source="attribute.name")
    attribute_slug = serializers.CharField(source="attribute.slug")
    show_in_product_card = serializers.BooleanField(source="attribute.show_in_product_card")

    class Meta:
        model = AttributeValue
        fields = ("id", "value", "slug", "attribute_id", "attribute_name", "attribute_slug", "show_in_product_card")


class ProductVariantSerializer(serializers.ModelSerializer):
    """Вариация товара"""
    attribute_values = VariantAttributeValueSerializer(many=True, read_only=True)
    price = serializers.SerializerMethodField()
    old_price = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ("id", "sku", "price", "old_price", "stock", "is_active", "attribute_values")

    def get_price(self, obj):
        return str(obj.get_price())

    def get_old_price(self, obj):
        old_price = obj.get_old_price()
        return str(old_price) if old_price else None


# ============================================
# ТОВАРЫ
# ============================================

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ("id", "sort", "image_url")

    @extend_schema_field(serializers.CharField)
    def get_image_url(self, obj) -> str:
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return ''


class ProductListSerializer(serializers.ModelSerializer):
    """Сериализатор для списка товаров"""
    category = CategorySerializer()
    brand = BrandSerializer(allow_null=True)
    main_image_url = serializers.SerializerMethodField()
    has_variations = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "price", "old_price",
            "category", "brand", "main_image_url",
            "is_popular", "is_bestseller", "is_new", "is_sale",
            "has_variations", "price_range",
            "average_rating", "reviews_count",
        )

    @extend_schema_field(serializers.CharField)
    def get_main_image_url(self, obj) -> str:
        request = self.context.get("request")
        if obj.main_image and request:
            return request.build_absolute_uri(obj.main_image.url)
        return ''

    def get_has_variations(self, obj) -> bool:
        return obj.has_variations()

    def get_price_range(self, obj):
        """Возвращает диапазон цен для товаров с вариациями"""
        if obj.has_variations():
            min_price, max_price = obj.get_price_range()
            return {
                "min": str(min_price),
                "max": str(max_price)
            }
        return None

    @extend_schema_field(serializers.FloatField)
    def get_average_rating(self, obj) -> float:
        """Возвращает средний рейтинг товара"""
        from django.db.models import Avg
        avg = obj.reviews.filter(status='approved').aggregate(avg_rating=Avg("rating"))["avg_rating"]
        return round(float(avg), 1) if avg else 0.0

    def get_reviews_count(self, obj) -> int:
        """Возвращает количество одобренных отзывов"""
        return obj.reviews.filter(status='approved').count()


class ProductAttributeValueSerializer(serializers.ModelSerializer):
    """Атрибут товара с выбранным значением"""
    attribute_name = serializers.CharField(source="attribute.name")
    attribute_slug = serializers.CharField(source="attribute.slug")
    value = serializers.CharField(source="attribute_value.value")
    value_slug = serializers.CharField(source="attribute_value.slug")
    show_in_product_card = serializers.BooleanField(source="attribute.show_in_product_card")

    class Meta:
        model = ProductAttributeValue
        fields = ("attribute_name", "attribute_slug", "value", "value_slug", "show_in_product_card")


class ProductDetailSerializer(serializers.ModelSerializer):
    """Детальный сериализатор товара"""
    category = CategorySerializer()
    brand = BrandSerializer(allow_null=True)
    main_image_url = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True)
    attributes = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    available_attributes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "short_description", "description",
            "price", "old_price",
            "category", "brand",
            "main_image_url", "images",
            "attributes", "available_attributes", "variants",
            "created_at", "updated_at",
        )

    @extend_schema_field(serializers.CharField)
    def get_main_image_url(self, obj) -> str:
        request = self.context.get("request")
        if obj.main_image and request:
            return request.build_absolute_uri(obj.main_image.url)
        return ''

    def get_attributes(self, obj):
        """
        Характеристики для блока 'Характеристики' на фронте.
        - Если заполнены spec_attributes -> показываем только их.
        - Иначе, если заполнены variation_attributes -> показываем всё, кроме них.
        - Иначе -> показываем все атрибуты товара.
        Значения агрегируем: один атрибут -> одна строка "v1, v2, v3".
        """
        qs = obj.attribute_values.select_related("attribute", "attribute_value").all()

        spec_ids = set(obj.spec_attributes.values_list("id", flat=True))
        variation_ids = set(obj.variation_attributes.values_list("id", flat=True))

        if spec_ids:
            qs = qs.filter(attribute_id__in=spec_ids)
        elif variation_ids:
            qs = qs.exclude(attribute_id__in=variation_ids)

        qs = qs.order_by("attribute__sort", "attribute__name", "attribute_value__sort", "attribute_value__value")

        grouped = {}
        order = []

        for pav in qs:
            aid = pav.attribute_id
            if aid not in grouped:
                grouped[aid] = {
                    "attribute_name": pav.attribute.name,
                    "attribute_slug": pav.attribute.slug,
                    "values": []
                }
                order.append(aid)

            val = pav.attribute_value.value
            if val not in grouped[aid]["values"]:
                grouped[aid]["values"].append(val)

        out = []
        for aid in order:
            out.append({
                "attribute_name": grouped[aid]["attribute_name"],
                "attribute_slug": grouped[aid]["attribute_slug"],
                "value": ", ".join(grouped[aid]["values"])
            })

        return out

    def get_available_attributes(self, obj):
        """
        Атрибуты для выбора вариации (кнопки на фронте).
        Берём ТОЛЬКО из активных variants (даже если stock=0), чтобы:
        - у не-вариативных товаров выбор не появлялся вообще;
        - показывались только реально существующие комбинации.
        Фильтрация атрибутов:
        - если у товара заполнены variation_attributes -> показываем только их
        - иначе -> используем глобальный Attribute.show_in_product_card
        """
        active_variants = obj.variants.filter(is_active=True).prefetch_related("attribute_values__attribute")
        if not active_variants.exists():
            return []

        allowed_ids = set(obj.variation_attributes.values_list("id", flat=True))
        use_override = bool(allowed_ids)

        attributes_data = {}

        for variant in active_variants:
            for av in variant.attribute_values.all():
                attr = av.attribute

                if use_override:
                    if attr.id not in allowed_ids:
                        continue
                else:
                    if not attr.show_in_product_card:
                        continue

                if attr.id not in attributes_data:
                    attributes_data[attr.id] = {
                        "id": attr.id,
                        "name": attr.name,
                        "slug": attr.slug,
                        "values": {}
                    }

                if av.id not in attributes_data[attr.id]["values"]:
                    attributes_data[attr.id]["values"][av.id] = {
                        "id": av.id,
                        "value": av.value,
                        "slug": av.slug,
                        "sort": av.sort
                    }

        result = []
        for attr_data in attributes_data.values():
            values_sorted = sorted(
                attr_data["values"].values(),
                key=lambda x: (x.get("sort", 0), str(x["value"]))
            )
            for v in values_sorted:
                v.pop("sort", None)
            attr_data["values"] = values_sorted
            result.append(attr_data)

        # сортировка атрибутов по sort/name
        from .models import Attribute
        sort_map = {a.id: a.sort for a in Attribute.objects.filter(id__in=[r["id"] for r in result])}
        result.sort(key=lambda r: (sort_map.get(r["id"], 0), r["name"]))

        return result

    def get_variants(self, obj):
        """Все активные вариации товара (включая stock=0 для отображения выбора)"""
        variants = obj.variants.filter(is_active=True).prefetch_related('attribute_values__attribute')
        return ProductVariantSerializer(variants, many=True).data

# ============================================
# ФИЛЬТРЫ КАТАЛОГА
# ============================================

class CatalogFiltersSerializer(serializers.Serializer):
    """Сериализатор для получения доступных фильтров каталога"""
    attributes = AttributeFilterSerializer(many=True)
    categories = CategorySerializer(many=True)
    brands = BrandSerializer(many=True)
    price_range = serializers.DictField()


# ============================================
# ОТЗЫВЫ
# ============================================

class ReviewSerializer(serializers.ModelSerializer):
    """Сериализатор отзыва для чтения"""
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "author_name", "user_email", "rating",
            "title", "text", "advantages", "disadvantages",
            "is_verified_purchase", "helpful_count", "not_helpful_count",
            "admin_response", "admin_response_at",
            "created_at",
        ]

    def get_user_email(self, obj):
        if obj.user:
            # Скрываем часть email для приватности
            email = obj.user.email
            parts = email.split("@")
            if len(parts) == 2:
                name = parts[0]
                if len(name) > 3:
                    return f"{name[:3]}***@{parts[1]}"
                return f"{name[0]}***@{parts[1]}"
        return None


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания отзыва"""
    author_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Review
        fields = [
            "product", "author_name", "rating",
            "title", "text", "advantages", "disadvantages",
        ]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Оценка должна быть от 1 до 5")
        return value

    def validate_text(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Отзыв должен содержать минимум 10 символов")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # Для анонима имя обязательно
        if not (user and user.is_authenticated):
            name = (attrs.get("author_name") or "").strip()
            if not name:
                raise serializers.ValidationError({"author_name": "Укажите имя."})

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # Если пользователь залогинен — привязываем user и подставляем имя, если не передали
        if user and user.is_authenticated:
            validated_data["user"] = user

            if not (validated_data.get("author_name") or "").strip():
                validated_data["author_name"] = user.get_full_name() or user.email.split("@")[0]

            # Проверяем покупку
            from orders.models import Order, OrderItem
            product = validated_data["product"]
            has_purchased = OrderItem.objects.filter(
                order__user=user,
                order__status__in=[Order.STATUS_PAID, Order.STATUS_DELIVERED],
                product=product
            ).exists()
            validated_data["is_verified_purchase"] = has_purchased

        return super().create(validated_data)


class ProductReviewsSerializer(serializers.Serializer):
    """Сериализатор для списка отзывов товара со статистикой"""
    reviews = ReviewSerializer(many=True)
    total_count = serializers.IntegerField()
    average_rating = serializers.FloatField(allow_null=True)
    rating_distribution = serializers.DictField()
