from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from django.db.models import Q, Min, Max, F
from django_filters.rest_framework import FilterSet, filters

from .models import Category, Brand, Product, Attribute, AttributeValue, ProductVariant, ProductAttributeValue, Review
from .serializers import (
    CategorySerializer, BrandSerializer, ProductListSerializer, ProductDetailSerializer,
    AttributeSerializer, AttributeFilterSerializer,
    ReviewSerializer, ReviewCreateSerializer, ProductReviewsSerializer
)


class CatalogPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 100


class ProductFilter(FilterSet):
    category = filters.CharFilter(field_name="category__slug", lookup_expr="iexact")
    brand = filters.CharFilter(field_name="brand__slug", lookup_expr="iexact")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    is_sale = filters.BooleanFilter(field_name="is_sale")

    class Meta:
        model = Product
        fields = ["category", "brand", "min_price", "max_price", "is_sale"]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    lookup_field = "slug"


class AttributeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet для атрибутов"""
    permission_classes = [permissions.AllowAny]
    queryset = Attribute.objects.prefetch_related("values").all()
    serializer_class = AttributeSerializer
    lookup_field = "slug"

    @action(detail=False, methods=["get"])
    def filterable(self, request):
        """Возвращает только атрибуты, которые используются в фильтрах"""
        attributes = Attribute.objects.filter(is_filterable=True).prefetch_related("values")
        serializer = AttributeFilterSerializer(attributes, many=True)
        return Response(serializer.data)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.AllowAny]
    queryset = Product.objects.filter(is_active=True).select_related("category", "brand").prefetch_related("images")
    serializer_class = ProductListSerializer
    lookup_field = "slug"
    filterset_class = ProductFilter
    search_fields = ["name", "slug"]
    ordering_fields = ["price", "created_at"]
    pagination_class = CatalogPagination

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer

    def get_queryset(self):
        """
        Поддержка фильтрации по атрибутам.
        Формат: ?attr_{attribute_slug}={value_slug}
        Пример: ?attr_color=black&attr_material=titanium,plastic

        Оптимизировано для быстрой выборки через подзапросы.
        """
        queryset = super().get_queryset()

        # Собираем все attr_* фильтры
        attr_filters = {}
        for key, value in self.request.query_params.items():
            if not key.startswith("attr_"):
                continue
            attribute_slug = key[5:]
            value_slugs = [v for v in value.split(",") if v]
            if value_slugs:
                attr_filters[attribute_slug] = value_slugs

        if not attr_filters:
            return queryset

        # Используем подзапросы для лучшей производительности
        from django.db.models import Exists, OuterRef

        for attribute_slug, value_slugs in attr_filters.items():
            # Подзапрос для вариаций
            variant_subquery = ProductVariant.objects.filter(
                product=OuterRef("pk"),
                is_active=True,
                stock__gt=0,
                attribute_values__attribute__slug=attribute_slug,
                attribute_values__slug__in=value_slugs
            )

            # Подзапрос для атрибутов товара
            pav_subquery = ProductAttributeValue.objects.filter(
                product=OuterRef("pk"),
                attribute__slug=attribute_slug,
                attribute_value__slug__in=value_slugs
            )

            queryset = queryset.filter(
                Exists(variant_subquery) | Exists(pav_subquery)
            )

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Получение товара + инкремент счётчика просмотров."""
        instance = self.get_object()
        Product.objects.filter(pk=instance.pk).update(views_count=F("views_count") + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        """
        Получение товаров для табов на главной странице.

        Query params:
        - tab: popular | bestseller | new (default: popular)
        - limit: количество товаров (default: 8)
        - category: slug категории для фильтрации (опционально)
        """
        tab = request.query_params.get("tab", "popular")
        limit = int(request.query_params.get("limit", 8))
        category_slug = request.query_params.get("category")

        queryset = self.get_queryset()

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        if tab == "popular":
            queryset = queryset.filter(Q(is_popular=True) | Q(views_count__gt=0)).order_by("-is_popular", "-views_count")
        elif tab == "bestseller":
            queryset = queryset.filter(Q(is_bestseller=True) | Q(sales_count__gt=0)).order_by("-is_bestseller", "-sales_count")
        elif tab == "new":
            queryset = queryset.order_by("-is_new", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        queryset = queryset[:limit]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def filters(self, request):
        """
        Возвращает фильтры каталога с динамическим сужением.

        Логика:
        - Фильтры сужаются на основе ВСЕХ выбранных параметров (категория, бренд, цена, атрибуты)
        - Значения атрибутов собираем из:
            (1) вариаций (variants.attribute_values) с stock>0
            (2) атрибутов товара (ProductAttributeValue)
        """
        category_slug = request.query_params.get("category") or ""
        brand_slug = request.query_params.get("brand") or ""
        search = request.query_params.get("search") or ""
        min_price = request.query_params.get("min_price") or ""
        max_price = request.query_params.get("max_price") or ""

        # Собираем attr_* параметры
        attr_filters = {}
        for key, value in request.query_params.items():
            if key.startswith("attr_") and value:
                attr_slug = key[5:]
                attr_filters[attr_slug] = [v for v in value.split(",") if v]

        base_qs = Product.objects.filter(is_active=True).select_related("category", "brand")

        if search:
            base_qs = base_qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        if category_slug:
            base_qs = base_qs.filter(category__slug=category_slug)

        if brand_slug:
            base_qs = base_qs.filter(brand__slug=brand_slug)

        if min_price:
            try:
                base_qs = base_qs.filter(price__gte=float(min_price))
            except ValueError:
                pass

        if max_price:
            try:
                base_qs = base_qs.filter(price__lte=float(max_price))
            except ValueError:
                pass

        # Применяем атрибутные фильтры (оптимизировано через подзапросы)
        from django.db.models import Exists, OuterRef

        for attr_slug, value_slugs in attr_filters.items():
            if value_slugs:
                # Подзапрос для вариаций
                variant_subquery = ProductVariant.objects.filter(
                    product=OuterRef("pk"),
                    is_active=True,
                    stock__gt=0,
                    attribute_values__attribute__slug=attr_slug,
                    attribute_values__slug__in=value_slugs
                )

                # Подзапрос для атрибутов товара
                pav_subquery = ProductAttributeValue.objects.filter(
                    product=OuterRef("pk"),
                    attribute__slug=attr_slug,
                    attribute_value__slug__in=value_slugs
                )

                base_qs = base_qs.filter(
                    Exists(variant_subquery) | Exists(pav_subquery)
                )

        base_qs = base_qs.distinct()
        product_ids = list(base_qs.values_list("id", flat=True))

        # Категории показываем постоянно
        categories = Category.objects.all()

        # Бренды: только те, у которых есть товары в текущей выборке
        if product_ids:
            brands = Brand.objects.filter(products__id__in=product_ids).distinct()
        else:
            brands = Brand.objects.none()

        price_stats = base_qs.aggregate(min_price=Min("price"), max_price=Max("price"))

        # Атрибуты для фильтров
        if category_slug:
            cat = Category.objects.filter(slug=category_slug).prefetch_related("filter_attributes").first()
            if cat and cat.filter_attributes.exists():
                attrs_qs = cat.filter_attributes.all().order_by("sort", "name")
            else:
                attrs_qs = Attribute.objects.filter(is_filterable=True).order_by("sort", "name")
        else:
            attrs_qs = Attribute.objects.filter(is_filterable=True).order_by("sort", "name")

        attr_ids = list(attrs_qs.values_list("id", flat=True))

        if not product_ids or not attr_ids:
            return Response({
                "attributes": [],
                "categories": CategorySerializer(categories, many=True).data,
                "brands": BrandSerializer(brands, many=True).data,
                "price_range": {
                    "min": str(price_stats["min_price"] or 0),
                    "max": str(price_stats["max_price"] or 0),
                }
            })

        # Значения из вариаций (только те, что реально продаются)
        variant_val_ids = set(AttributeValue.objects.filter(
            attribute_id__in=attr_ids,
            variants__product_id__in=product_ids,
            variants__is_active=True,
            variants__stock__gt=0
        ).values_list("id", flat=True).distinct())

        # Значения из ProductAttributeValue (атрибуты товара)
        pav_val_ids = set(AttributeValue.objects.filter(
            attribute_id__in=attr_ids,
            productattributevalue__product_id__in=product_ids
        ).values_list("id", flat=True).distinct())

        val_ids = variant_val_ids | pav_val_ids

        values_qs = AttributeValue.objects.filter(
            id__in=val_ids
        ).select_related("attribute").order_by(
            "attribute__sort", "attribute__name", "sort", "value"
        )

        attrs_map = {a.id: {"id": a.id, "name": a.name, "slug": a.slug, "values": []} for a in attrs_qs}

        for v in values_qs:
            item = attrs_map.get(v.attribute_id)
            if item is not None:
                item["values"].append({"id": v.id, "value": v.value, "slug": v.slug})

        attributes_out = [attrs_map[a.id] for a in attrs_qs if attrs_map[a.id]["values"]]

        return Response({
            "attributes": attributes_out,
            "categories": CategorySerializer(categories, many=True).data,
            "brands": BrandSerializer(brands, many=True).data,
            "price_range": {
                "min": str(price_stats["min_price"] or 0),
                "max": str(price_stats["max_price"] or 0),
            }
        })


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet для отзывов"""
    queryset = Review.objects.select_related("user", "product").all()
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.action in ["create"]:
            return [permissions.AllowAny()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == "create":
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Для публичных запросов показываем только одобренные отзывы
        if not self.request.user.is_staff:
            queryset = queryset.filter(status=Review.STATUS_APPROVED)

        # Фильтрация по товару
        product_id = self.request.query_params.get("product")
        product_slug = self.request.query_params.get("product_slug")

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        elif product_slug:
            queryset = queryset.filter(product__slug=product_slug)

        return queryset.order_by("-created_at")

    @action(detail=False, methods=["get"])
    def product_reviews(self, request):
        """
        Получить отзывы для конкретного товара со статистикой.
        Query params:
        - product_id или product_slug: идентификатор товара
        """
        product_id = request.query_params.get("product_id")
        product_slug = request.query_params.get("product_slug")

        if not product_id and not product_slug:
            return Response(
                {"detail": "Укажите product_id или product_slug"},
                status=400
            )

        if product_id:
            try:
                product = Product.objects.get(pk=product_id, is_active=True)
            except Product.DoesNotExist:
                return Response({"detail": "Товар не найден"}, status=404)
        else:
            try:
                product = Product.objects.get(slug=product_slug, is_active=True)
            except Product.DoesNotExist:
                return Response({"detail": "Товар не найден"}, status=404)

        reviews = Review.objects.filter(
            product=product,
            status=Review.STATUS_APPROVED
        ).select_related("user").order_by("-created_at")

        # Статистика
        from django.db.models import Avg, Count

        stats = reviews.aggregate(
            total=Count("id"),
            avg_rating=Avg("rating")
        )

        # Распределение по оценкам
        distribution = {}
        for i in range(1, 6):
            distribution[str(i)] = reviews.filter(rating=i).count()

        return Response({
            "reviews": ReviewSerializer(reviews, many=True).data,
            "total_count": stats["total"] or 0,
            "average_rating": round(stats["avg_rating"], 1) if stats["avg_rating"] else None,
            "rating_distribution": distribution,
        })

    @action(detail=True, methods=["post"])
    def helpful(self, request, pk=None):
        """Отметить отзыв как полезный"""
        review = self.get_object()
        review.helpful_count += 1
        review.save(update_fields=["helpful_count"])
        return Response({"helpful_count": review.helpful_count})

    @action(detail=True, methods=["post"])
    def not_helpful(self, request, pk=None):
        """Отметить отзыв как бесполезный"""
        review = self.get_object()
        review.not_helpful_count += 1
        review.save(update_fields=["not_helpful_count"])
        return Response({"not_helpful_count": review.not_helpful_count})
