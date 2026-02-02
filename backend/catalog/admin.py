from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import path
from django.shortcuts import redirect, get_object_or_404
from django.contrib import messages
from decimal import Decimal, ROUND_HALF_UP
from django import forms
from django.contrib.admin.helpers import ActionForm

from .models import (
    Category, Brand, Product, ProductImage,
    Attribute, AttributeValue, ProductAttributeValue, ProductVariant, Review,
    CatalogSettings
)

def money(val: Decimal) -> Decimal:
    """Округление денег до 2 знаков."""
    if val is None:
        return None
    return Decimal(val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class ProductAdminActionForm(ActionForm):
    """
    Доп. поля над выпадающим списком Actions в списке товаров.

    Важно: Django может рендерить actions и сверху и снизу списка — из-за этого поля
    дублируются в POST. Нормализацию значений делаем уже в action'е (см. action_apply_discount).
    """
    discount_percent = forms.DecimalField(
        label="Скидка, %",
        required=False,
        min_value=Decimal("0"),
        max_value=Decimal("100"),
        decimal_places=2,
        help_text="Например: 15 (это 15%)",
        widget=forms.NumberInput(attrs={
            'placeholder': 'Скидка %',
            'class': 'text-gray-900 dark:text-white',
            'style': 'min-width: 120px;'
        })
    )
    discount_price = forms.DecimalField(
        label="Цена со скидкой",
        required=False,
        min_value=Decimal("0"),
        max_digits=12,
        decimal_places=2,
        help_text="Укажите итоговую цену (например: 1990.00)",
        widget=forms.NumberInput(attrs={
            'placeholder': 'Цена со скидкой',
            'class': 'text-gray-900 dark:text-white',
            'style': 'min-width: 150px;'
        })
    )
    set_sale_flag = forms.BooleanField(
        label='Пометить "Распродажа"',
        required=False,
        initial=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'cursor-pointer',
            'title': 'Пометить товары флагом is_sale=True'
        })
    )
    target_category = forms.ModelChoiceField(
        queryset=Category.objects.all(),
        label="Категория",
        required=False,
        empty_label="-- Выберите категорию --",
        widget=forms.Select(attrs={
            'class': 'text-gray-900 dark:text-white',
            'style': 'min-width: 200px;'
        })
    )

    def clean(self):
        cleaned = super().clean()
        pct = cleaned.get("discount_percent")
        dprice = cleaned.get("discount_price")

        # Нельзя задавать оба поля одновременно
        if pct is not None and dprice is not None:
            raise forms.ValidationError("Укажите либо 'Скидка, %', либо 'Цена со скидкой', но не оба поля сразу.")

        # Если процент задан — ограничим диапазон (0..100), где 0 не имеет смысла
        if pct is not None and pct <= 0:
            raise forms.ValidationError("Скидка, % должна быть больше 0.")

        # Если цена задана — тоже должна быть > 0
        if dprice is not None and dprice <= 0:
            raise forms.ValidationError("Цена со скидкой должна быть больше 0.")

        return cleaned


class ProductAdminForm(forms.ModelForm):
    """
    Поля удобного ввода скидки В КАРТОЧКЕ ТОВАРА (не в БД):
    - скидка % или цена со скидкой
    - сброс скидки
    """
    # ВАЖНО: поля должны быть определены ДО Meta класса!
    discount_percent_input = forms.DecimalField(
        label="Скидка, %",
        required=False,
        min_value=Decimal("0"),
        max_value=Decimal("99.99"),
        decimal_places=2,
        help_text="Укажите процент скидки. Если old_price пустая — базой станет текущая price.",
    )
    discount_price_input = forms.DecimalField(
        label="Цена со скидкой",
        required=False,
        min_value=Decimal("0.01"),
        decimal_places=2,
        help_text="Укажите итоговую цену со скидкой. Если old_price пустая — old_price станет текущей price.",
    )
    clear_discount = forms.BooleanField(
        label="Сбросить скидку",
        required=False,
        help_text="Отметьте, чтобы вернуть old_price в price и удалить скидку"
    )

    class Meta:
        model = Product
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        pct = cleaned.get("discount_percent_input")
        dprice = cleaned.get("discount_price_input")
        clear = cleaned.get("clear_discount")

        if clear:
            return cleaned

        if pct and dprice:
            raise forms.ValidationError("Укажите либо 'Скидка, %', либо 'Цена со скидкой', но не оба поля сразу.")
        return cleaned

    def save(self, commit=True):
        obj = super().save(commit=False)

        pct = self.cleaned_data.get("discount_percent_input")
        dprice = self.cleaned_data.get("discount_price_input")
        clear = self.cleaned_data.get("clear_discount")

        if clear:
            # возвращаем цену из old_price, если она была
            if obj.old_price is not None:
                obj.price = obj.old_price
            obj.old_price = None

        elif pct:
            # база: old_price если есть, иначе текущая price
            base = obj.old_price if obj.old_price else obj.price
            if base is not None:
                base = money(base)
                obj.old_price = base
                obj.price = money(base * (Decimal("100") - Decimal(pct)) / Decimal("100"))

        elif dprice:
            base = obj.old_price if obj.old_price else obj.price
            if base is not None:
                base = money(base)
                obj.old_price = base
                obj.price = money(Decimal(dprice))

        if commit:
            obj.save()
            self.save_m2m()
        return obj

@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ("name", "slug", "parent", "products_count", "sort", "is_active", "image_preview")
    list_filter = ("parent", "is_active")
    list_editable = ("sort", "is_active")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ("filter_attributes", "mega_menu_attributes",)

    fieldsets = (
        ("Основное", {"fields": ("name", "slug", "parent", "sort", "image")}),
        ("Фильтры каталога", {"fields": ("filter_attributes",)}),
        ("Мегаменю", {"fields": ("mega_menu_attributes",)}),
    )

    @display(description="Товаров", ordering="name")
    def products_count(self, obj):
        return obj.products.filter(is_active=True).count()

    @display(description="Изображение")
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 80px;" />',
                obj.image.url
            )
        return "—"


@admin.register(Brand)
class BrandAdmin(ModelAdmin):
    list_display = ("name", "logo_preview", "is_featured", "sort", "slug")
    list_filter = ("is_featured",)
    list_editable = ("is_featured", "sort")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort", "name")

    @display(description="Логотип")
    def logo_preview(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" style="max-height: 40px; max-width: 80px;" />',
                obj.logo.url
            )
        return "-"


# ============================================
# АТРИБУТЫ
# ============================================

class AttributeValueInline(TabularInline):
    model = AttributeValue
    extra = 3
    prepopulated_fields = {"slug": ("value",)}


@admin.register(Attribute)
class AttributeAdmin(ModelAdmin):
    list_display = ("name", "slug", "is_filterable", "show_in_product_card", "values_count", "sort")
    list_filter = ("is_filterable", "show_in_product_card")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    list_editable = ("is_filterable", "show_in_product_card", "sort")
    inlines = [AttributeValueInline]

    @display(description="Значений")
    def values_count(self, obj):
        return obj.values.count()


@admin.register(AttributeValue)
class AttributeValueAdmin(ModelAdmin):
    list_display = ("value", "attribute", "slug", "sort")
    list_filter = ("attribute",)
    search_fields = ("value", "attribute__name")
    prepopulated_fields = {"slug": ("value",)}
    autocomplete_fields = ["attribute"]


# ============================================
# ТОВАРЫ
# ============================================

class ProductImageInline(TabularInline):
    model = ProductImage
    extra = 1


class ProductAttributeValueInline(TabularInline):
    """Инлайн для выбора значений атрибутов товара"""
    model = ProductAttributeValue
    extra = 1
    autocomplete_fields = ["attribute", "attribute_value"]
    verbose_name = "Значение атрибута"
    verbose_name_plural = "Атрибуты товара (для вариаций)"


class ProductVariantInline(TabularInline):
    """Инлайн для отображения вариаций товара"""
    model = ProductVariant
    extra = 0
    readonly_fields = ("attribute_values_display", "sku")
    fields = ("attribute_values_display", "sku", "price", "old_price", "stock", "is_active")
    can_delete = True
    show_change_link = True

    @display(description="Комбинация атрибутов")
    def attribute_values_display(self, obj):
        if obj.pk:
            return obj.get_attribute_values_display() or "—"
        return "—"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    form = ProductAdminForm
    action_form = ProductAdminActionForm  # Работает с unfold!

    list_per_page = 100
    actions_on_top = True
    actions_on_bottom = True

    list_display = (
        "name", "sku", "category", "brand",
        "price", "old_price", "discount_percent_display",
        "is_popular", "is_bestseller", "is_new", "is_sale", "is_active",
        "variants_count",
    )

    class Media:
        css = {
            'all': ('admin/css/custom_admin.css',)
        }
        js = ('admin/js/custom_admin.js',)
    list_filter = ("is_active", "is_popular", "is_bestseller", "is_new", "is_sale", "category", "brand")
    # ВАЖНО: list_editable даёт "массовое редактирование" прямо в списке
    list_editable = ("price", "old_price", "is_popular", "is_bestseller", "is_new", "is_sale", "is_active")
    search_fields = ("name", "slug", "sku", "description")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = (
        "views_count", "sales_count", "created_at", "updated_at",
        "image_preview", "generate_variations_button",
        "discount_percent_display",
    )
    inlines = [ProductImageInline, ProductAttributeValueInline, ProductVariantInline]
    save_on_top = True
    list_select_related = ("category", "brand")

    fieldsets = (
        ("Основная информация", {
            "fields": ("name", "slug", "sku", "short_description", "description", "category", "brand")
        }),
        ("Цены", {
            "fields": (
                "price", "old_price",
                "discount_percent_display",
                "discount_percent_input", "discount_price_input", "clear_discount",
            ),
            "description": (
                "Правило скидки для фронта: old_price = цена ДО скидки, price = цена ПОСЛЕ скидки. "
                "Можно заполнить вручную price+old_price или воспользоваться полями 'Скидка, %' / 'Цена со скидкой'."
            )
        }),
        ("Габариты и вес", {
            "fields": ("weight", "length", "width", "height"),
            "classes": ("collapse",)
        }),
        ("Изображение", {"fields": ("main_image", "image_preview")}),
        ("Отображение на главной", {
            "fields": ("is_popular", "is_bestseller", "is_new", "is_sale"),
        }),
        ("Генерация вариаций", {
            "fields": ("generate_variations_button",),
            "description": "Добавьте значения атрибутов ниже и нажмите 'Создать вариации' для генерации комбинаций."
        }),
        ("Статистика", {
            "fields": ("views_count", "sales_count"),
            "classes": ("collapse",)
        }),
        ("Статус и даты", {
            "fields": ("is_active", "created_at", "updated_at"),
            "classes": ("collapse",)
        }),
        ("Отображение вариаций", {"fields": ("variation_attributes", "spec_attributes")}),
    )

    def get_form(self, request, obj=None, change=False, **kwargs):
        """Явно указываем использование ProductAdminForm"""
        kwargs['form'] = ProductAdminForm
        return super().get_form(request, obj, change, **kwargs)


    # ---------- ВЫЧИСЛЯЕМОЕ ПОЛЕ: Скидка % ----------
    @display(description="Скидка", ordering="old_price")
    def discount_percent_display(self, obj):
        try:
            if obj.old_price and obj.price and obj.old_price > obj.price:
                pct = (Decimal(obj.old_price) - Decimal(obj.price)) / Decimal(obj.old_price) * Decimal("100")
                return f"{money(pct)}%"
        except Exception:
            pass
        return "—"

    @display(description="Вариаций", ordering="name")
    def variants_count(self, obj):
        count = obj.variants.filter(is_active=True).count()
        if count > 0:
            return format_html('<span style="color: green; font-weight: bold;">{}</span>', count)
        return "—"

    @display(description="Превью", label=True)
    def image_preview(self, obj):
        if obj.main_image:
            return format_html(
                '<div style="padding: 10px;"><img src="{}" style="max-height: 150px; max-width: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /></div>',
                obj.main_image.url
            )
        return format_html('<span style="color: #999;">Нет изображения</span>', '')

    @display(description="Создать вариации", label=True)
    def generate_variations_button(self, obj):
        if obj.pk:
            attr_count = obj.attribute_values.count()
            if attr_count > 0:
                return format_html(
                    '<div style="padding: 10px;">'
                    '<a class="button" style="display: inline-block; padding: 10px 20px; background: #417690; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;" href="{}">📦 Создать вариации</a>'
                    '<p style="margin-top: 10px; color: #666; font-size: 13px;">✓ Выбрано {} значений атрибутов. Будут созданы все возможные комбинации.</p>'
                    '</div>',
                    "generate-variations/",
                    attr_count
                )
            return format_html('<div style="padding: 10px;"><span style="color: #999;">⚠️ Сначала добавьте значения атрибутов ниже</span></div>')
        return format_html('<div style="padding: 10px;"><span style="color: #999;">💾 Сначала сохраните товар</span></div>', '')

    # ---------- ACTIONS: массовые флаги ----------
    @admin.action(description='Отметить: "Популярное"')
    def action_mark_popular(self, request, queryset):
        updated = queryset.update(is_popular=True)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Снять: "Популярное"')
    def action_unmark_popular(self, request, queryset):
        updated = queryset.update(is_popular=False)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Отметить: "Хит продаж"')
    def action_mark_bestseller(self, request, queryset):
        updated = queryset.update(is_bestseller=True)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Снять: "Хит продаж"')
    def action_unmark_bestseller(self, request, queryset):
        updated = queryset.update(is_bestseller=False)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Отметить: "Новинка"')
    def action_mark_new(self, request, queryset):
        updated = queryset.update(is_new=True)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Снять: "Новинка"')
    def action_unmark_new(self, request, queryset):
        updated = queryset.update(is_new=False)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Отметить: "Распродажа"')
    def action_mark_sale(self, request, queryset):
        updated = queryset.update(is_sale=True)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Снять: "Распродажа"')
    def action_unmark_sale(self, request, queryset):
        updated = queryset.update(is_sale=False)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Сделать "Активен"')
    def action_mark_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        messages.success(request, f"Обновлено товаров: {updated}")

    @admin.action(description='Сделать "Неактивен"')
    def action_unmark_active(self, request, queryset):
        updated = queryset.update(is_active=False)
        messages.success(request, f"Обновлено товаров: {updated}")

    # ---------- ACTIONS: скидки (процент или цена) ----------
    @admin.action(description='💰 Применить скидку (используйте поля внизу)')
    def action_apply_discount(self, request, queryset):
        """Применяет скидку к выбранным товарам используя данные из action_form"""
        # Из-за actions_on_top + actions_on_bottom поля дублируются (2 раза).
        # request.POST.get() часто берёт последнее значение (может быть пустым).
        # Поэтому нормализуем POST: берём ПЕРВОЕ НЕПУСТОЕ значение каждого поля.
        post = request.POST.copy()

        def pick_first_non_empty(name: str):
            vals = [str(v).strip() for v in post.getlist(name)]
            vals = [v for v in vals if v != ""]
            if vals:
                post.setlist(name, [vals[0]])
            else:
                post.pop(name, None)

        pick_first_non_empty("discount_percent")
        pick_first_non_empty("discount_price")

        # checkbox тоже может дублироваться
        sale_vals = [str(v).lower().strip() for v in post.getlist("set_sale_flag")]
        if any(v in ("1", "true", "on", "yes") for v in sale_vals):
            post.setlist("set_sale_flag", ["on"])
        else:
            post.pop("set_sale_flag", None)

        # Валидируем ТОЛЬКО наши поля (action/select_across выкидываем)
        form = ProductAdminActionForm(post)
        form.fields.pop("action", None)
        form.fields.pop("select_across", None)

        if not form.is_valid():
            messages.error(request, f"Некорректные значения в полях скидки: {form.errors.as_text()}")
            return

        pct = form.cleaned_data.get("discount_percent")  # Decimal или None
        dprice = form.cleaned_data.get("discount_price")  # Decimal или None
        set_sale_flag = bool(form.cleaned_data.get("set_sale_flag"))

        if pct is None and dprice is None:
            messages.warning(request, 'Заполните "Скидка, %" или "Цена со скидкой".')
            return

        if pct is not None and dprice is not None:
            messages.error(request, "Укажите либо 'Скидка, %', либо 'Цена со скидкой', но не оба поля сразу.")
            return

        updated = 0
        for p in queryset:
            base = p.old_price if p.old_price else p.price
            if base is None:
                continue

            base = money(Decimal(base))

            if pct is not None:
                p.old_price = base
                p.price = money(base * (Decimal("100") - Decimal(pct)) / Decimal("100"))
            else:
                p.old_price = base
                p.price = money(Decimal(dprice))

            if set_sale_flag:
                p.is_sale = True
                p.save(update_fields=["price", "old_price", "is_sale"])
            else:
                p.save(update_fields=["price", "old_price"])

            updated += 1

        messages.success(request, f"✅ Скидка применена к товарам: {updated}")

    @admin.action(description="Сбросить скидку (вернуть old_price -> price и очистить old_price)")
    def action_clear_discount(self, request, queryset):
        updated = 0
        for p in queryset:
            if p.old_price is None:
                continue
            p.price = p.old_price
            p.old_price = None
            p.save(update_fields=["price", "old_price"])
            updated += 1
        messages.success(request, f"Скидка сброшена у товаров: {updated}")

    # ---------- ACTION: перенос в категорию ----------
    @admin.action(description='📁 Перенести в категорию (выберите в поле "Категория")')
    def action_move_to_category(self, request, queryset):
        """Переносит выбранные товары в указанную категорию"""
        post = request.POST.copy()

        # Нормализуем POST: берём ПЕРВОЕ НЕПУСТОЕ значение (из-за дублирования форм)
        cat_vals = [str(v).strip() for v in post.getlist("target_category")]
        cat_vals = [v for v in cat_vals if v != "" and v != "None"]

        if not cat_vals:
            messages.warning(request, 'Выберите категорию в поле "Категория" перед выполнением действия.')
            return

        try:
            category_id = int(cat_vals[0])
            target_category = Category.objects.get(pk=category_id)
        except (ValueError, Category.DoesNotExist):
            messages.error(request, "Выбранная категория не найдена.")
            return

        updated = queryset.update(category=target_category)
        messages.success(request, f'✅ Перенесено товаров в категорию "{target_category.name}": {updated}')

    actions = (
        "action_mark_popular", "action_unmark_popular",
        "action_mark_bestseller", "action_unmark_bestseller",
        "action_mark_new", "action_unmark_new",
        "action_mark_sale", "action_unmark_sale",
        "action_mark_active", "action_unmark_active",
        "action_apply_discount", "action_clear_discount",
        "action_move_to_category",
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<int:product_id>/generate-variations/",
                self.admin_site.admin_view(self.generate_variations_view),
                name="catalog_product_generate_variations",
            ),
        ]
        return custom_urls + urls

    def generate_variations_view(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        created_count = product.generate_variations()

        if created_count > 0:
            messages.success(request, f'Создано {created_count} новых вариаций для товара "{product.name}"')
        else:
            messages.info(request, "Новые вариации не созданы. Возможно, все комбинации уже существуют или не выбраны значения атрибутов.")

        return redirect("admin:catalog_product_change", product_id)


@admin.register(ProductVariant)
class ProductVariantAdmin(ModelAdmin):
    list_display = ("__str__", "product", "sku", "price", "stock", "is_active")
    list_filter = ("is_active", "product__category")
    search_fields = ("sku", "product__name")
    autocomplete_fields = ["product"]
    filter_horizontal = ("attribute_values",)
    readonly_fields = ("attribute_values_display",)

    fieldsets = (
        ("Товар", {"fields": ("product",)}),
        ("Атрибуты вариации", {
            "fields": ("attribute_values", "attribute_values_display"),
            "description": "Выберите комбинацию значений атрибутов для этой вариации"
        }),
        ("Цены и наличие", {"fields": ("sku", "price", "old_price", "stock", "is_active")}),
    )

    @display(description="Текущая комбинация")
    def attribute_values_display(self, obj):
        if obj.pk:
            return obj.get_attribute_values_display() or "Не выбрано"
        return "—"


from django.utils import timezone
from django.utils.html import format_html
from django.contrib import admin, messages
from unfold.admin import ModelAdmin
from unfold.decorators import display

from .models import Review


@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    class Media:
        css = {
            "all": ("admin/css/custom_admin.css",)
        }
    list_display = (
        "id", "product", "author_name", "rating",
        "review_preview", "status", "is_verified_purchase", "created_at",
    )
    list_display_links = ("id", "author_name")
    list_filter = ("status", "rating", "is_verified_purchase", "created_at")
    search_fields = ("author_name", "product__name", "text", "title")
    raw_id_fields = ("product", "user")
    ordering = ("-created_at",)
    actions = ["approve_reviews", "reject_reviews"]
    list_editable = ("status",)

    # Всё, что показываем в "Содержимом", делаем readonly через *_display
    readonly_fields = (
        "created_at", "updated_at",
        "helpful_count", "not_helpful_count",
        "title_display", "review_text_display", "advantages_display", "disadvantages_display",
    )

    fieldsets = (
        ("Основное", {
            "fields": ("product", "user", "author_name", "rating", "status"),
        }),

        ("📝 Содержимое отзыва", {
            "fields": ("title_display", "review_text_display", "advantages_display", "disadvantages_display"),
            "description": "Отображение данных, как их оставил пользователь (только просмотр).",
            "classes": ("collapse",),
        }),

        ("✏️ Редактировать отзыв", {
            "fields": ("title", "text", "advantages", "disadvantages"),
            "classes": ("collapse",),
            "description": "Раскройте секцию, чтобы отредактировать отзыв (вносите изменения осознанно).",
        }),

        ("💬 Ответ магазина", {
            "fields": ("admin_response", "admin_response_at"),
            "classes": ("collapse",),
        }),

        ("ℹ️ Дополнительная информация", {
            "fields": ("is_verified_purchase", "helpful_count", "not_helpful_count"),
            "classes": ("collapse",),
        }),

        ("📅 Даты", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    # ---------- display поля для "только просмотр" ----------
    @display(description="Заголовок")
    def title_display(self, obj):
        val = (obj.title or "").strip()
        if not val:
            return "—"
        return format_html(
            '<div style="white-space: pre-wrap; padding: 10px; background: #f5f5f5; border-radius: 4px;">{}</div>',
            val
        )

    @display(description="Текст отзыва")
    def review_text_display(self, obj):
        val = (obj.text or "").strip()
        if not val:
            return "—"
        return format_html(
            '<div style="white-space: pre-wrap; padding: 10px; background: #f5f5f5; border-radius: 4px;">{}</div>',
            val
        )

    @display(description="Достоинства")
    def advantages_display(self, obj):
        val = (obj.advantages or "").strip()
        if not val:
            return "—"
        return format_html(
            '<div style="white-space: pre-wrap; padding: 10px; background: #f5f5f5; border-radius: 4px;">{}</div>',
            val
        )

    @display(description="Недостатки")
    def disadvantages_display(self, obj):
        val = (obj.disadvantages or "").strip()
        if not val:
            return "—"
        return format_html(
            '<div style="white-space: pre-wrap; padding: 10px; background: #f5f5f5; border-radius: 4px;">{}</div>',
            val
        )

    # ---------- превью в списке ----------
    @display(description="Превью отзыва")
    def review_preview(self, obj):
        val = (obj.text or "").strip()
        if not val:
            return "—"
        return val[:50] + "..." if len(val) > 50 else val

    # ---------- авто-дата ответа магазина ----------
    def save_model(self, request, obj, form, change):
        if "admin_response" in form.changed_data:
            if (obj.admin_response or "").strip():
                obj.admin_response_at = timezone.now()
            else:
                obj.admin_response_at = None
        super().save_model(request, obj, form, change)

    # ---------- actions ----------
    @admin.action(description="Одобрить выбранные отзывы")
    def approve_reviews(self, request, queryset):
        updated = queryset.update(status=Review.STATUS_APPROVED)
        messages.success(request, f"Одобрено отзывов: {updated}")

    @admin.action(description="Отклонить выбранные отзывы")
    def reject_reviews(self, request, queryset):
        updated = queryset.update(status=Review.STATUS_REJECTED)
        messages.success(request, f"Отклонено отзывов: {updated}")


# ============================================
# НАСТРОЙКИ КАТАЛОГА (Singleton)
# ============================================

@admin.register(CatalogSettings)
class CatalogSettingsAdmin(ModelAdmin):
    """
    Админка настроек каталога.
    Singleton — всегда редактируется одна запись с id=1.
    """
    list_display = ("__str__", "filters_enabled", "show_attribute_count", "show_brand_count", "max_attribute_values")

    fieldsets = (
        ("Глобальные настройки", {
            "fields": ("filters_enabled",),
            "description": "Включение/отключение всех фильтров в каталоге"
        }),
        ("Показывать количество товаров", {
            "fields": ("show_attribute_count", "show_category_count", "show_brand_count"),
            "description": "Показывать количество товаров рядом с каждым значением фильтра (например: Синий (12))"
        }),
        ("Количество элементов до 'Показать все'", {
            "fields": ("max_attribute_values", "max_categories", "max_brands"),
            "description": "Сколько значений показывать в каждом фильтре до кнопки 'Показать все'"
        }),
    )

    def has_add_permission(self, request):
        # Разрешаем добавление только если записи ещё нет
        return not CatalogSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Запрещаем удаление
        return False

    def changelist_view(self, request, extra_context=None):
        # Автоматически редиректим на единственную запись
        obj = CatalogSettings.get_settings()
        return redirect(f"admin:catalog_catalogsettings_change", obj.pk)

