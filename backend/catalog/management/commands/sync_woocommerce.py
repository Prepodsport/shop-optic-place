"""
Команда для синхронизации товаров из WooCommerce REST API.

Умная синхронизация: обновляет только при реальных изменениях.

Использование:
    python manage.py sync_woocommerce

Опции:
    --dry-run           Пробный запуск без сохранения в БД
    --skip-images       Пропустить загрузку изображений
    --categories-only   Синхронизировать только категории
    --attributes-only   Синхронизировать только атрибуты
    --products-only     Синхронизировать только товары
    --limit N           Ограничить количество товаров
    --timeout N         Таймаут запросов в секундах
"""
import os
import time
import hashlib
import requests
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from transliterate import translit

from catalog.models import (
    Category, Brand, Product, ProductImage,
    Attribute, AttributeValue, ProductAttributeValue, ProductVariant
)
from integrations.woocommerce import WooCommerceClient


def make_slug(text):
    """Создаёт slug с транслитерацией русского текста"""
    if not text:
        return ''
    try:
        text_latin = translit(text, 'ru', reversed=True)
    except Exception:
        text_latin = text
    return slugify(text_latin)


def clean_wc_slug(slug):
    """Убирает префикс pa_ из WooCommerce slug атрибутов"""
    if slug and slug.startswith('pa_'):
        return slug[3:]  # Убираем 'pa_'
    return slug


# Список названий атрибута "Бренд" в разных вариантах
BRAND_ATTRIBUTE_NAMES = {'бренд', 'brand', 'brend', 'pa_brend'}


def ensure_unique_slug(slug, model_class, existing_obj=None):
    """Обеспечивает уникальность slug для модели"""
    base_slug = slug
    counter = 1
    while True:
        qs = model_class.objects.filter(slug=slug)
        if existing_obj:
            qs = qs.exclude(pk=existing_obj.pk)
        if not qs.exists():
            return slug
        slug = f'{base_slug}-{counter}'
        counter += 1


def normalize_decimal(value):
    """Нормализует Decimal для сравнения (убирает trailing zeros)"""
    if value is None:
        return None
    return value.quantize(Decimal('0.01'))


def strip_html(text):
    """Простая очистка HTML для сравнения"""
    if not text:
        return ''
    # Убираем переносы строк и лишние пробелы для сравнения
    return ' '.join(text.split())


class Command(BaseCommand):
    help = 'Умная синхронизация товаров из WooCommerce REST API'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.client = None
        self.dry_run = False
        self.skip_images = False

        # Кэши для ускорения работы
        self.categories_cache = {}  # wc_id -> Category
        self.brands_cache = {}  # name -> Brand
        self.attributes_cache = {}  # wc_id -> Attribute
        self.attr_values_cache = {}  # (attribute_name, value) -> AttributeValue

        # Расширенная статистика
        self.stats = {
            'categories_created': 0,
            'categories_updated': 0,
            'categories_skipped': 0,
            'brands_created': 0,
            'brands_skipped': 0,
            'attributes_created': 0,
            'attributes_skipped': 0,
            'attribute_values_created': 0,
            'attribute_values_skipped': 0,
            'products_created': 0,
            'products_updated': 0,
            'products_skipped': 0,
            'variants_created': 0,
            'variants_updated': 0,
            'variants_skipped': 0,
            'images_downloaded': 0,
            'images_skipped': 0,
        }

        # Детали изменений для отладки
        self.changes_log = []

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Пробный запуск без сохранения в БД',
        )
        parser.add_argument(
            '--skip-images',
            action='store_true',
            help='Пропустить загрузку изображений',
        )
        parser.add_argument(
            '--categories-only',
            action='store_true',
            help='Синхронизировать только категории',
        )
        parser.add_argument(
            '--attributes-only',
            action='store_true',
            help='Синхронизировать только атрибуты',
        )
        parser.add_argument(
            '--products-only',
            action='store_true',
            help='Синхронизировать только товары',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Ограничить количество товаров (0 = все)',
        )
        parser.add_argument(
            '--timeout',
            type=int,
            default=120,
            help='Таймаут запросов в секундах (по умолчанию 120)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Подробный вывод изменений',
        )

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.skip_images = options['skip_images']
        self.verbose = options.get('verbose', False)
        categories_only = options['categories_only']
        attributes_only = options['attributes_only']
        products_only = options['products_only']
        limit = options['limit']
        timeout = options['timeout']

        # Инициализируем клиент
        self.client = WooCommerceClient()

        # Устанавливаем таймаут
        from integrations import woocommerce as wc_module
        wc_module.DEFAULT_TIMEOUT = timeout
        self.stdout.write(f'Таймаут запросов: {timeout} сек')

        if not self.client.is_configured():
            self.stderr.write(self.style.ERROR(
                'WooCommerce API не настроен. Укажите в .env:\n'
                '  WOOCOMMERCE_URL=https://your-shop.com\n'
                '  WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx\n'
                '  WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx'
            ))
            return

        # Тестируем соединение
        self.stdout.write('Проверка соединения с WooCommerce...')
        if not self.client.test_connection():
            self.stderr.write(self.style.ERROR('Не удалось подключиться к WooCommerce API'))
            return

        self.stdout.write(self.style.SUCCESS('Соединение установлено'))

        if self.dry_run:
            self.stdout.write(self.style.WARNING(
                'РЕЖИМ ПРОБНОГО ЗАПУСКА - изменения не будут сохранены'
            ))

        try:
            if self.dry_run:
                self._sync(categories_only, attributes_only, products_only, limit)
            else:
                with transaction.atomic():
                    self._sync(categories_only, attributes_only, products_only, limit)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Ошибка синхронизации: {e}'))
            raise

        # Выводим статистику
        self._print_stats()

    def _sync(self, categories_only, attributes_only, products_only, limit):
        """Основная логика синхронизации"""
        sync_all = not (categories_only or attributes_only or products_only)

        # Всегда загружаем кэши для умного сравнения
        self._load_caches()

        if sync_all or categories_only:
            self._sync_categories()

        if sync_all or attributes_only:
            self._sync_attributes()

        if sync_all or products_only:
            self._sync_products(limit)

    def _load_caches(self):
        """Загружает существующие данные в кэши"""
        self.stdout.write('Загрузка кэшей из БД...')

        # Категории по имени и slug
        for cat in Category.objects.select_related('parent').all():
            self.categories_cache[cat.name.lower()] = cat
            self.categories_cache[f'slug:{cat.slug}'] = cat

        # Бренды по имени
        for brand in Brand.objects.all():
            self.brands_cache[brand.name.lower()] = brand

        # Атрибуты по имени
        for attr in Attribute.objects.all():
            self.attributes_cache[attr.name.lower()] = attr

        # Значения атрибутов
        for av in AttributeValue.objects.select_related('attribute').all():
            key = (av.attribute.name.lower(), av.value.lower())
            self.attr_values_cache[key] = av

        self.stdout.write(f'  Категорий: {Category.objects.count()}')
        self.stdout.write(f'  Брендов: {Brand.objects.count()}')
        self.stdout.write(f'  Атрибутов: {Attribute.objects.count()}')
        self.stdout.write(f'  Товаров: {Product.objects.count()}')

    def _sync_categories(self):
        """Синхронизирует категории с поддержкой иерархии"""
        self.stdout.write('\n=== Синхронизация категорий ===')

        wc_categories = list(self.client.get_categories())
        self.stdout.write(f'Найдено категорий в WooCommerce: {len(wc_categories)}')

        # Маппинг WC ID -> Category для установки parent
        wc_id_to_category = {}

        # Сортируем: сначала родительские (parent=0), потом дочерние
        wc_categories.sort(key=lambda x: x.get('parent', 0))

        for wc_cat in wc_categories:
            wc_id = wc_cat['id']
            name = wc_cat['name']
            slug = wc_cat.get('slug') or make_slug(name)
            parent_wc_id = wc_cat.get('parent', 0)

            # Ищем существующую категорию
            category = self.categories_cache.get(f'slug:{slug}')
            if not category:
                category = self.categories_cache.get(name.lower())

            # Определяем родителя
            parent = wc_id_to_category.get(parent_wc_id) if parent_wc_id else None

            # Проверяем, является ли категория "Uncategorized" или пустой
            is_uncategorized = slug.lower() in ('uncategorized', 'bez-kategorii', 'без-категории')

            if self.dry_run:
                status = 'существует' if category else 'новая'
                parent_name = parent.name if parent else '-'
                self.stdout.write(f'  {name} (родитель: {parent_name}) [{status}]')
                if category:
                    wc_id_to_category[wc_id] = category
                continue

            if category:
                # Проверяем изменения
                changes = []
                if category.name != name:
                    changes.append(f'имя: {category.name} -> {name}')
                    category.name = name
                if category.parent != parent:
                    old_parent = category.parent.name if category.parent else '-'
                    new_parent = parent.name if parent else '-'
                    changes.append(f'родитель: {old_parent} -> {new_parent}')
                    category.parent = parent

                # Устанавливаем is_active для uncategorized
                if is_uncategorized and category.is_active:
                    changes.append('активность: True -> False (uncategorized)')
                    category.is_active = False

                if changes:
                    category.slug = ensure_unique_slug(slug, Category, category)
                    category.save()
                    self.stats['categories_updated'] += 1
                    self.stdout.write(f'  [UPD] {name}: обновлено ({", ".join(changes)})')
                else:
                    self.stats['categories_skipped'] += 1
                    if self.verbose:
                        self.stdout.write(f'  - {name}: без изменений')
            else:
                # Создаём новую
                category = Category.objects.create(
                    name=name,
                    slug=ensure_unique_slug(slug, Category),
                    parent=parent,
                    is_active=not is_uncategorized,  # Uncategorized создаём неактивной
                )
                self.stats['categories_created'] += 1
                status_text = 'создана (неактивна)' if is_uncategorized else 'создана'
                self.stdout.write(f'  + {name}: {status_text}')
                self.categories_cache[name.lower()] = category
                self.categories_cache[f'slug:{category.slug}'] = category

            wc_id_to_category[wc_id] = category
            self.categories_cache[wc_id] = category

    def _sync_attributes(self):
        """Синхронизирует атрибуты и их значения"""
        self.stdout.write('\n=== Синхронизация атрибутов ===')

        wc_attributes = self.client.get_attributes()
        total = len(wc_attributes)
        self.stdout.write(f'Найдено атрибутов в WooCommerce: {total}')

        for idx, wc_attr in enumerate(wc_attributes, 1):
            wc_attr_id = wc_attr['id']
            name = wc_attr['name']
            wc_slug = wc_attr.get('slug', '')

            # Пропускаем атрибут "Бренд" - он обрабатывается отдельно
            if name.lower().strip() in BRAND_ATTRIBUTE_NAMES or wc_slug.lower().strip() in BRAND_ATTRIBUTE_NAMES:
                self.stdout.write(f'  [{idx}/{total}] {name}: пропущен (это атрибут бренда)')
                continue

            # Убираем pa_ из slug
            slug = clean_wc_slug(wc_slug) if wc_slug else make_slug(name)

            # Ищем существующий атрибут
            attribute = self.attributes_cache.get(name.lower())

            if self.dry_run:
                terms = list(self.client.get_attribute_terms(wc_attr_id, per_page=50))
                status = 'существует' if attribute else 'новый'
                self.stdout.write(f'  [{idx}/{total}] {name}: {len(terms)} значений [{status}]')
                time.sleep(0.3)
                continue

            if attribute:
                # Атрибут существует - проверяем изменения
                changes = []
                if attribute.name != name:
                    changes.append(f'имя: {attribute.name} -> {name}')
                    attribute.name = name

                if changes:
                    attribute.slug = ensure_unique_slug(slug, Attribute, attribute)
                    attribute.save()
                    self.stats['attributes_updated'] += 1
                else:
                    self.stats['attributes_skipped'] += 1
            else:
                # Создаём новый атрибут
                attribute = Attribute.objects.create(
                    name=name,
                    slug=ensure_unique_slug(slug, Attribute),
                    is_filterable=True,
                    show_in_product_card=True,
                )
                self.stats['attributes_created'] += 1
                self.attributes_cache[name.lower()] = attribute

            self.attributes_cache[wc_attr_id] = attribute

            # Синхронизируем значения атрибута
            terms = list(self.client.get_attribute_terms(wc_attr_id, per_page=50))
            new_values = 0

            for term in terms:
                value = term['name']
                value_slug = term.get('slug') or make_slug(value)
                cache_key = (attribute.name.lower(), value.lower())

                if cache_key in self.attr_values_cache:
                    self.stats['attribute_values_skipped'] += 1
                    continue

                # Проверяем в БД
                attr_value = AttributeValue.objects.filter(
                    attribute=attribute,
                    value__iexact=value
                ).first()

                if not attr_value:
                    # Создаём новое значение
                    final_slug = value_slug
                    counter = 1
                    while AttributeValue.objects.filter(attribute=attribute, slug=final_slug).exists():
                        final_slug = f'{value_slug}-{counter}'
                        counter += 1

                    attr_value = AttributeValue.objects.create(
                        attribute=attribute,
                        value=value,
                        slug=final_slug,
                    )
                    self.stats['attribute_values_created'] += 1
                    new_values += 1

                self.attr_values_cache[cache_key] = attr_value

            status = f'+{new_values} новых' if new_values else 'без изменений'
            self.stdout.write(f'  [{idx}/{total}] {name}: {len(terms)} значений ({status})')
            time.sleep(0.3)

    def _sync_products(self, limit):
        """Синхронизирует товары"""
        self.stdout.write('\n=== Синхронизация товаров ===')

        count = 0
        for wc_product in self.client.get_products():
            if limit > 0 and count >= limit:
                self.stdout.write(f'\nДостигнут лимит: {limit} товаров')
                break

            # Пропускаем вариации
            if wc_product.get('type') == 'variation':
                continue

            self._sync_product(wc_product)
            count += 1

        self.stdout.write(f'\nОбработано товаров: {count}')

    def _sync_product(self, wc_product):
        """Синхронизирует один товар с проверкой изменений"""
        name = wc_product['name']
        sku = wc_product.get('sku', '')
        slug = wc_product.get('slug') or make_slug(name)
        product_type = wc_product.get('type', 'simple')
        wc_id = wc_product['id']

        # Ищем существующий товар по SKU или slug
        product = None
        if sku:
            product = Product.objects.filter(sku=sku).first()
        if not product:
            product = Product.objects.filter(slug=slug).first()

        # Парсим данные из WC
        wc_data = self._parse_product_data(wc_product)

        if self.dry_run:
            status = 'существует' if product else 'новый'
            self.stdout.write(f'\n  [{status}] {name} (SKU: {sku})')
            if product_type == 'variable':
                variations = list(self.client.get_variations(wc_id))
                self.stdout.write(f'    Вариаций: {len(variations)}')
            return

        if product:
            # Проверяем изменения
            changes = self._check_product_changes(product, wc_data)

            if changes:
                # Применяем изменения
                self._apply_product_changes(product, wc_data)
                product.save()
                self.stats['products_updated'] += 1
                self.stdout.write(f'\n  [UPD] {name}: обновлен')
                for change in changes:
                    self.stdout.write(f'      {change}')
            else:
                self.stats['products_skipped'] += 1
                if self.verbose:
                    self.stdout.write(f'\n  - {name}: без изменений')
        else:
            # Создаём новый товар
            product = self._create_product(wc_data)
            self.stats['products_created'] += 1
            self.stdout.write(f'\n  + {name}: создан')

        # Синхронизируем атрибуты
        self._sync_product_attributes(product, wc_product)

        # Синхронизируем изображения
        if not self.skip_images:
            self._sync_product_images(product, wc_product)

        # Синхронизируем вариации
        if product_type == 'variable':
            self._sync_product_variations(product, wc_product)

    def _parse_product_data(self, wc_product):
        """Парсит данные товара из WooCommerce"""
        price = self._parse_decimal(wc_product.get('price')) or Decimal('0')
        regular_price = self._parse_decimal(wc_product.get('regular_price'))
        sale_price = self._parse_decimal(wc_product.get('sale_price'))

        old_price = None
        if sale_price and regular_price and sale_price < regular_price:
            price = sale_price
            old_price = regular_price

        is_sale = bool(sale_price and regular_price and sale_price < regular_price)

        # Определяем категорию
        category = self._get_product_category(wc_product)

        # Определяем бренд
        brand = self._get_product_brand(wc_product)

        return {
            'name': wc_product['name'],
            'sku': wc_product.get('sku', ''),
            'slug': wc_product.get('slug') or make_slug(wc_product['name']),
            'description': wc_product.get('description', ''),
            'short_description': wc_product.get('short_description', ''),
            'price': price if price > 0 else Decimal('1'),
            'old_price': old_price,
            'is_sale': is_sale,
            'is_active': wc_product.get('status') == 'publish',
            'category': category,
            'brand': brand,
            'stock_quantity': wc_product.get('stock_quantity') or 0,
        }

    def _check_product_changes(self, product, wc_data):
        """Проверяет какие поля товара изменились"""
        changes = []

        # Цена (важно!)
        current_price = normalize_decimal(product.price)
        new_price = normalize_decimal(wc_data['price'])
        if current_price != new_price:
            changes.append(f'цена: {current_price} -> {new_price}')

        # Старая цена
        current_old = normalize_decimal(product.old_price)
        new_old = normalize_decimal(wc_data['old_price'])
        if current_old != new_old:
            changes.append(f'старая цена: {current_old} -> {new_old}')

        # Название
        if product.name != wc_data['name']:
            changes.append(f'название изменено')

        # SKU
        if product.sku != wc_data['sku']:
            changes.append(f'SKU: {product.sku} -> {wc_data["sku"]}')

        # Категория
        if product.category != wc_data['category']:
            old_cat = product.category.name if product.category else '-'
            new_cat = wc_data['category'].name if wc_data['category'] else '-'
            changes.append(f'категория: {old_cat} -> {new_cat}')

        # Бренд
        if product.brand != wc_data['brand']:
            old_brand = product.brand.name if product.brand else '-'
            new_brand = wc_data['brand'].name if wc_data['brand'] else '-'
            changes.append(f'бренд: {old_brand} -> {new_brand}')

        # Описание (сравниваем без HTML-форматирования)
        if strip_html(product.description) != strip_html(wc_data['description']):
            changes.append('описание изменено')

        # Краткое описание
        if strip_html(product.short_description) != strip_html(wc_data['short_description']):
            changes.append('краткое описание изменено')

        # Флаг распродажи
        if product.is_sale != wc_data['is_sale']:
            changes.append(f'распродажа: {product.is_sale} -> {wc_data["is_sale"]}')

        # Активность
        if product.is_active != wc_data['is_active']:
            changes.append(f'активен: {product.is_active} -> {wc_data["is_active"]}')

        return changes

    def _apply_product_changes(self, product, wc_data):
        """Применяет изменения к товару"""
        product.name = wc_data['name']
        product.sku = wc_data['sku']
        product.slug = ensure_unique_slug(wc_data['slug'], Product, product)
        product.description = wc_data['description']
        product.short_description = wc_data['short_description']
        product.price = wc_data['price']
        product.old_price = wc_data['old_price']
        product.is_sale = wc_data['is_sale']
        product.is_active = wc_data['is_active']
        product.category = wc_data['category']
        product.brand = wc_data['brand']

    def _create_product(self, wc_data):
        """Создаёт новый товар"""
        return Product.objects.create(
            name=wc_data['name'],
            sku=wc_data['sku'],
            slug=ensure_unique_slug(wc_data['slug'], Product),
            description=wc_data['description'],
            short_description=wc_data['short_description'],
            price=wc_data['price'],
            old_price=wc_data['old_price'],
            is_sale=wc_data['is_sale'],
            is_active=wc_data['is_active'],
            category=wc_data['category'],
            brand=wc_data['brand'],
        )

    def _get_product_category(self, wc_product):
        """Определяет категорию товара"""
        wc_categories = wc_product.get('categories', [])
        if not wc_categories:
            return None

        # Берём первую (основную) категорию
        wc_cat = wc_categories[0]
        wc_cat_id = wc_cat['id']
        cat_name = wc_cat.get('name', '')
        cat_slug = wc_cat.get('slug', '')

        # Ищем в кэше
        if wc_cat_id in self.categories_cache:
            return self.categories_cache[wc_cat_id]
        if cat_name.lower() in self.categories_cache:
            return self.categories_cache[cat_name.lower()]
        if cat_slug and f'slug:{cat_slug}' in self.categories_cache:
            return self.categories_cache[f'slug:{cat_slug}']

        # Ищем в БД
        category = Category.objects.filter(name__iexact=cat_name).first()
        if not category and cat_slug:
            category = Category.objects.filter(slug=cat_slug).first()

        if category:
            self.categories_cache[cat_name.lower()] = category
            return category

        # Создаём новую категорию
        slug = make_slug(cat_name)
        is_uncategorized = slug.lower() in ('uncategorized', 'bez-kategorii', 'без-категории')
        category = Category.objects.create(
            name=cat_name,
            slug=ensure_unique_slug(slug, Category),
            is_active=not is_uncategorized,  # Uncategorized создаём неактивной
        )
        self.categories_cache[cat_name.lower()] = category
        self.stats['categories_created'] += 1
        return category

    def _get_product_brand(self, wc_product):
        """Определяет бренд товара (из тегов или атрибута 'Бренд')"""
        brand_name = None

        # 1. Сначала ищем в атрибутах (атрибут "Бренд" / pa_brend)
        wc_attributes = wc_product.get('attributes', [])
        for wc_attr in wc_attributes:
            attr_name = wc_attr.get('name', '').lower().strip()
            attr_slug = wc_attr.get('slug', '').lower().strip()

            # Проверяем, является ли это атрибутом бренда
            if attr_name in BRAND_ATTRIBUTE_NAMES or attr_slug in BRAND_ATTRIBUTE_NAMES:
                options = wc_attr.get('options', [])
                if options:
                    brand_name = options[0].strip()
                    break

        # 2. Если не нашли в атрибутах, ищем в тегах
        if not brand_name:
            tags = wc_product.get('tags', [])
            if tags:
                tag = tags[0]
                brand_name = tag.get('name', '').strip()

        # 3. Если не нашли в тегах, ищем в brands (если WC поддерживает)
        if not brand_name:
            brands = wc_product.get('brands', [])
            if brands:
                brand_name = brands[0].get('name', '').strip()

        if not brand_name:
            return None

        # Ищем в кэше
        if brand_name.lower() in self.brands_cache:
            return self.brands_cache[brand_name.lower()]

        # Ищем в БД
        brand = Brand.objects.filter(name__iexact=brand_name).first()
        if brand:
            self.brands_cache[brand_name.lower()] = brand
            return brand

        # Создаём новый бренд
        slug = make_slug(brand_name)
        brand = Brand.objects.create(
            name=brand_name,
            slug=ensure_unique_slug(slug, Brand),
        )
        self.brands_cache[brand_name.lower()] = brand
        self.stats['brands_created'] += 1
        return brand

    def _sync_product_attributes(self, product, wc_product):
        """Синхронизирует атрибуты товара"""
        wc_attributes = wc_product.get('attributes', [])

        # Получаем текущие атрибуты товара
        current_attrs = set(
            ProductAttributeValue.objects.filter(product=product)
            .values_list('attribute__name', 'attribute_value__value')
        )

        for wc_attr in wc_attributes:
            attr_id = wc_attr.get('id', 0)
            attr_name = wc_attr.get('name', '')
            attr_slug = wc_attr.get('slug', '')
            options = wc_attr.get('options', [])
            variation = wc_attr.get('variation', False)

            if not attr_name or not options:
                continue

            # Пропускаем атрибут "Бренд" - он обрабатывается отдельно через _get_product_brand
            if attr_name.lower().strip() in BRAND_ATTRIBUTE_NAMES or attr_slug.lower().strip() in BRAND_ATTRIBUTE_NAMES:
                continue

            attribute = self._get_or_create_attribute(attr_id, attr_name)

            # Добавляем в variation_attributes если используется для вариаций
            if variation and attribute not in product.variation_attributes.all():
                product.variation_attributes.add(attribute)

            for option in options:
                # Проверяем, есть ли уже эта связь
                if (attr_name, option) in current_attrs:
                    continue

                attr_value = self._get_or_create_attr_value(attribute, option)

                ProductAttributeValue.objects.get_or_create(
                    product=product,
                    attribute=attribute,
                    attribute_value=attr_value
                )

    def _get_or_create_attribute(self, wc_attr_id, name, wc_slug=None):
        """Находит или создаёт атрибут"""
        if wc_attr_id and wc_attr_id in self.attributes_cache:
            return self.attributes_cache[wc_attr_id]

        if name.lower() in self.attributes_cache:
            return self.attributes_cache[name.lower()]

        attribute = Attribute.objects.filter(name__iexact=name).first()
        if attribute:
            self.attributes_cache[name.lower()] = attribute
            if wc_attr_id:
                self.attributes_cache[wc_attr_id] = attribute
            return attribute

        # Создаём slug, убирая префикс pa_ если он есть
        if wc_slug:
            slug = clean_wc_slug(wc_slug)
        else:
            slug = make_slug(name)

        # Убираем pa_ из slug если он всё ещё есть
        slug = clean_wc_slug(slug)

        attribute = Attribute.objects.create(
            name=name,
            slug=ensure_unique_slug(slug, Attribute),
            is_filterable=True,
            show_in_product_card=True,
        )
        self.attributes_cache[name.lower()] = attribute
        if wc_attr_id:
            self.attributes_cache[wc_attr_id] = attribute
        self.stats['attributes_created'] += 1
        return attribute

    def _get_or_create_attr_value(self, attribute, value):
        """Находит или создаёт значение атрибута"""
        cache_key = (attribute.name.lower(), value.lower())

        if cache_key in self.attr_values_cache:
            return self.attr_values_cache[cache_key]

        attr_value = AttributeValue.objects.filter(
            attribute=attribute,
            value__iexact=value
        ).first()

        if attr_value:
            self.attr_values_cache[cache_key] = attr_value
            return attr_value

        slug = make_slug(value)
        if not slug:
            slug = f'value-{abs(hash(value)) % 100000}'

        base_slug = slug
        counter = 1
        while AttributeValue.objects.filter(attribute=attribute, slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        attr_value = AttributeValue.objects.create(
            attribute=attribute,
            value=value,
            slug=slug,
        )
        self.attr_values_cache[cache_key] = attr_value
        self.stats['attribute_values_created'] += 1
        return attr_value

    def _sync_product_images(self, product, wc_product):
        """Синхронизирует изображения товара"""
        images = wc_product.get('images', [])
        if not images:
            return

        # Получаем существующие URL изображений
        existing_main = product.main_image.name if product.main_image else None
        existing_gallery = set(product.images.values_list('image', flat=True))

        for i, img in enumerate(images):
            src = img.get('src', '')
            if not src:
                continue

            # Получаем имя файла из URL
            parsed_url = urlparse(src)
            filename = os.path.basename(parsed_url.path)
            if not filename or '.' not in filename:
                filename = f'{product.slug}-{i}.jpg'

            if i == 0:
                # Главное изображение
                if existing_main and filename in existing_main:
                    self.stats['images_skipped'] += 1
                    continue
                if not product.main_image:
                    self._download_image(product, src, is_main=True, filename=filename)
                else:
                    self.stats['images_skipped'] += 1
            else:
                # Галерея - проверяем есть ли уже
                if any(filename in img_path for img_path in existing_gallery if img_path):
                    self.stats['images_skipped'] += 1
                    continue

                if product.images.count() < i:
                    self._download_image(product, src, is_main=False, sort=i, filename=filename)
                else:
                    self.stats['images_skipped'] += 1

    def _download_image(self, product, url, is_main=False, sort=0, filename=None):
        """Загружает изображение по URL"""
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()

            if not filename:
                parsed_url = urlparse(url)
                filename = os.path.basename(parsed_url.path)
                if not filename or '.' not in filename:
                    filename = f'{product.slug}-{sort or "main"}.jpg'

            content = ContentFile(response.content, name=filename)

            if is_main:
                product.main_image.save(filename, content, save=True)
            else:
                product_image = ProductImage.objects.create(
                    product=product,
                    sort=sort
                )
                product_image.image.save(filename, content, save=True)

            self.stats['images_downloaded'] += 1
            if self.verbose:
                self.stdout.write(f'      [IMG] {filename}')

        except Exception as e:
            self.stderr.write(f'      Ошибка загрузки изображения: {e}')

    def _sync_product_variations(self, product, wc_product):
        """Синхронизирует вариации товара"""
        wc_product_id = wc_product['id']
        variations = list(self.client.get_variations(wc_product_id))

        if self.verbose:
            self.stdout.write(f'    Вариаций в WC: {len(variations)}')

        for wc_var in variations:
            self._sync_variation(product, wc_var)

    def _sync_variation(self, product, wc_var):
        """Синхронизирует одну вариацию с проверкой изменений"""
        sku = wc_var.get('sku', '')
        wc_price = self._parse_decimal(wc_var.get('price'))
        wc_regular = self._parse_decimal(wc_var.get('regular_price'))
        wc_sale = self._parse_decimal(wc_var.get('sale_price'))
        wc_stock = wc_var.get('stock_quantity') or 0

        # Определяем цены
        price = wc_price
        old_price = None
        if wc_sale and wc_regular and wc_sale < wc_regular:
            price = wc_sale
            old_price = wc_regular

        # Собираем значения атрибутов вариации
        variant_attr_values = []
        wc_attributes = wc_var.get('attributes', [])

        for wc_attr in wc_attributes:
            attr_name = wc_attr.get('name', '')
            attr_option = wc_attr.get('option', '')

            if not attr_name or not attr_option:
                continue

            attribute = self._get_or_create_attribute(0, attr_name)
            attr_value = self._get_or_create_attr_value(attribute, attr_option)
            variant_attr_values.append(attr_value)

        if not variant_attr_values:
            return

        # Ищем существующую вариацию
        variant = None
        if sku:
            variant = ProductVariant.objects.filter(product=product, sku=sku).first()

        if not variant:
            sorted_value_ids = sorted([v.id for v in variant_attr_values])
            for existing_var in product.variants.prefetch_related('attribute_values').all():
                existing_ids = sorted([av.id for av in existing_var.attribute_values.all()])
                if existing_ids == sorted_value_ids:
                    variant = existing_var
                    break

        if variant:
            # Проверяем изменения
            changes = []

            current_price = normalize_decimal(variant.price)
            new_price = normalize_decimal(price)
            if current_price != new_price:
                changes.append(f'цена: {current_price} -> {new_price}')

            current_old = normalize_decimal(variant.old_price)
            new_old = normalize_decimal(old_price)
            if current_old != new_old:
                changes.append(f'старая цена: {current_old} -> {new_old}')

            # Сравниваем остаток (минимум 1 для отображения)
            new_stock = max(wc_stock, 1)
            if variant.stock != new_stock:
                changes.append(f'остаток: {variant.stock} -> {new_stock}')

            if variant.sku != sku:
                changes.append(f'SKU: {variant.sku} -> {sku}')

            if changes:
                variant.sku = sku
                variant.price = price
                variant.old_price = old_price
                variant.stock = new_stock
                variant.is_active = True
                variant.save()
                variant.attribute_values.set(variant_attr_values)
                self.stats['variants_updated'] += 1
                if self.verbose:
                    attrs_display = ', '.join([f'{av.attribute.name}={av.value}' for av in variant_attr_values])
                    self.stdout.write(f'      [UPD] вариация [{attrs_display}]: {", ".join(changes)}')
            else:
                self.stats['variants_skipped'] += 1
        else:
            # Создаём новую вариацию
            variant = ProductVariant.objects.create(
                product=product,
                sku=sku,
                price=price,
                old_price=old_price,
                stock=max(wc_stock, 1),
                is_active=True,
            )
            variant.attribute_values.set(variant_attr_values)
            self.stats['variants_created'] += 1
            if self.verbose:
                attrs_display = ', '.join([f'{av.attribute.name}={av.value}' for av in variant_attr_values])
                self.stdout.write(f'      + вариация [{attrs_display}]: создана')

    def _parse_decimal(self, value):
        """Парсит строку в Decimal"""
        if not value:
            return None
        try:
            value = str(value).strip().replace(',', '.').replace(' ', '')
            return Decimal(value)
        except (InvalidOperation, ValueError):
            return None

    def _print_stats(self):
        """Выводит статистику синхронизации"""
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 50))
        self.stdout.write(self.style.SUCCESS('РЕЗУЛЬТАТЫ СИНХРОНИЗАЦИИ'))
        self.stdout.write(self.style.SUCCESS('=' * 50))

        # Категории
        self.stdout.write('\nКатегории:')
        self.stdout.write(f'  + Создано: {self.stats["categories_created"]}')
        self.stdout.write(f'  [UPD] Обновлено: {self.stats["categories_updated"]}')
        self.stdout.write(f'  - Без изменений: {self.stats["categories_skipped"]}')

        # Бренды
        self.stdout.write('\nБренды:')
        self.stdout.write(f'  + Создано: {self.stats["brands_created"]}')
        self.stdout.write(f'  - Без изменений: {self.stats["brands_skipped"]}')

        # Атрибуты
        self.stdout.write('\nАтрибуты:')
        self.stdout.write(f'  + Создано: {self.stats["attributes_created"]}')
        self.stdout.write(f'  - Без изменений: {self.stats["attributes_skipped"]}')
        self.stdout.write(f'  + Значений создано: {self.stats["attribute_values_created"]}')
        self.stdout.write(f'  - Значений без изменений: {self.stats["attribute_values_skipped"]}')

        # Товары
        self.stdout.write('\nТовары:')
        self.stdout.write(f'  + Создано: {self.stats["products_created"]}')
        self.stdout.write(f'  [UPD] Обновлено: {self.stats["products_updated"]}')
        self.stdout.write(f'  - Без изменений: {self.stats["products_skipped"]}')

        # Вариации
        self.stdout.write('\nВариации:')
        self.stdout.write(f'  + Создано: {self.stats["variants_created"]}')
        self.stdout.write(f'  [UPD] Обновлено: {self.stats["variants_updated"]}')
        self.stdout.write(f'  - Без изменений: {self.stats["variants_skipped"]}')

        # Изображения
        self.stdout.write('\nИзображения:')
        self.stdout.write(f'  + Загружено: {self.stats["images_downloaded"]}')
        self.stdout.write(f'  - Пропущено: {self.stats["images_skipped"]}')

        self.stdout.write('')
