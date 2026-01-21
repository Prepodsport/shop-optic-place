"""
Команда для импорта товаров из WooCommerce CSV экспорта.

Использование:
    python manage.py import_woocommerce export.csv

Опции:
    --dry-run       Пробный запуск без сохранения в БД
    --skip-images   Пропустить загрузку изображений
    --limit N       Импортировать только N родительских товаров
"""
import csv
import os
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


def make_slug(text):
    """Создаёт slug с транслитерацией русского текста"""
    if not text:
        return ''
    try:
        # Транслитерируем русский текст в латиницу
        text_latin = translit(text, 'ru', reversed=True)
    except Exception:
        text_latin = text
    # Создаём slug
    return slugify(text_latin)


class Command(BaseCommand):
    help = 'Импорт товаров из WooCommerce CSV экспорта'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Путь к CSV файлу')
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
            '--limit',
            type=int,
            default=0,
            help='Импортировать только N родительских товаров (0 = все)',
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        dry_run = options['dry_run']
        skip_images = options['skip_images']
        limit = options['limit']

        if not os.path.exists(csv_file):
            self.stderr.write(self.style.ERROR(f'Файл не найден: {csv_file}'))
            return

        self.stdout.write(f'Чтение файла: {csv_file}')

        # Читаем CSV файл
        rows = self._read_csv(csv_file)
        if not rows:
            self.stderr.write(self.style.ERROR('CSV файл пуст'))
            return

        self.stdout.write(f'Найдено {len(rows)} строк')

        # Группируем строки по родительским товарам
        products_data = self._group_products(rows)
        self.stdout.write(f'Найдено {len(products_data)} родительских товаров')

        if limit > 0:
            products_data = dict(list(products_data.items())[:limit])
            self.stdout.write(f'Ограничено до {len(products_data)} товаров')

        if dry_run:
            self.stdout.write(self.style.WARNING('РЕЖИМ ПРОБНОГО ЗАПУСКА - изменения не будут сохранены'))
            self._print_preview(products_data)
            return

        # Импортируем данные
        with transaction.atomic():
            stats = self._import_products(products_data, skip_images)

        self.stdout.write(self.style.SUCCESS(
            f'\nИмпорт завершён:\n'
            f'  Категорий: {stats["categories"]}\n'
            f'  Брендов: {stats["brands"]}\n'
            f'  Атрибутов: {stats["attributes"]}\n'
            f'  Значений атрибутов: {stats["attribute_values"]}\n'
            f'  Товаров: {stats["products"]}\n'
            f'  Вариаций: {stats["variants"]}\n'
            f'  Изображений: {stats["images"]}'
        ))

    def _read_csv(self, csv_file):
        """Читает CSV файл с учётом BOM и разных кодировок"""
        rows = []
        # Пробуем разные кодировки
        encodings = ['utf-8-sig', 'utf-8', 'cp1251', 'latin-1']

        for encoding in encodings:
            try:
                with open(csv_file, 'r', encoding=encoding, newline='') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    if rows:
                        self.stdout.write(f'Кодировка: {encoding}')
                        break
            except (UnicodeDecodeError, csv.Error):
                continue

        return rows

    def _group_products(self, rows):
        """
        Группирует строки по родительским товарам.
        Родительский товар определяется по наличию описания или категории.
        """
        products = {}
        current_parent = None

        for row in rows:
            sku = (row.get('Артикул') or '').strip()
            name = (row.get('Имя') or '').strip()
            description = (row.get('Описание') or '').strip()
            category = (row.get('Категории') or '').strip()
            images = (row.get('Изображения') or '').strip()

            if not sku or not name:
                continue

            # Определяем, является ли строка родительским товаром
            is_parent = bool(description or category or images)

            if is_parent:
                current_parent = sku
                products[sku] = {
                    'parent': row,
                    'variations': []
                }
            elif current_parent and name == (products[current_parent]['parent'].get('Имя') or '').strip():
                # Это вариация текущего родительского товара
                products[current_parent]['variations'].append(row)

        return products

    def _print_preview(self, products_data):
        """Выводит предпросмотр данных для импорта"""
        for sku, data in products_data.items():
            parent = data['parent']
            variations = data['variations']

            self.stdout.write(f'\n--- {sku}: {parent.get("Имя") or ""} ---')
            self.stdout.write(f'  Категория: {parent.get("Категории") or ""}')
            self.stdout.write(f'  Бренд: {parent.get("Бренды") or ""}')
            self.stdout.write(f'  Цена: {parent.get("Базовая цена") or ""}')
            self.stdout.write(f'  Вариаций: {len(variations)}')

            # Показываем атрибуты
            attrs = self._extract_attributes(parent)
            if attrs:
                self.stdout.write('  Атрибуты:')
                for attr_name, attr_data in attrs.items():
                    values_count = len(attr_data['values'].split(',')) if attr_data['values'] else 0
                    self.stdout.write(f'    - {attr_name}: {values_count} значений')

    def _extract_attributes(self, row):
        """Извлекает атрибуты из строки CSV"""
        attributes = {}

        for i in range(1, 16):
            name_key = f'Название атрибута {i}'
            values_key = f'Значения атрибутов {i}'
            visible_key = f'Видимость атрибута {i}'
            global_key = f'Глобальный атрибут {i}'

            attr_name = (row.get(name_key) or '').strip()
            attr_values = (row.get(values_key) or '').strip()

            if attr_name and attr_values:
                # Парсим видимость и глобальность
                try:
                    visible = int((row.get(visible_key) or '1').strip() or '1')
                except ValueError:
                    visible = 1

                try:
                    is_global = int((row.get(global_key) or '1').strip() or '1')
                except ValueError:
                    is_global = 1

                attributes[attr_name] = {
                    'values': attr_values,
                    'visible': visible == 1,  # show_in_product_card
                    'global': is_global == 1,  # is_filterable
                }

        return attributes

    def _import_products(self, products_data, skip_images):
        """Импортирует товары в БД"""
        stats = {
            'categories': 0,
            'brands': 0,
            'attributes': 0,
            'attribute_values': 0,
            'products': 0,
            'variants': 0,
            'images': 0,
        }

        # Кэш для созданных объектов
        categories_cache = {}
        brands_cache = {}
        attributes_cache = {}
        attr_values_cache = {}

        for sku, data in products_data.items():
            parent = data['parent']
            variations = data['variations']

            self.stdout.write(f'Импорт: {parent.get("Имя") or ""}')

            # 1. Создаём/получаем категорию
            category_name = (parent.get('Категории') or '').strip()
            category = self._get_or_create_category(category_name, categories_cache)
            if category and category_name not in categories_cache:
                categories_cache[category_name] = category
                stats['categories'] += 1

            if not category:
                self.stderr.write(f'  Пропуск: нет категории')
                continue

            # 2. Создаём/получаем бренд
            brand_name = (parent.get('Бренды') or '').strip()
            brand = self._get_or_create_brand(brand_name, brands_cache)
            if brand and brand_name not in brands_cache:
                brands_cache[brand_name] = brand
                stats['brands'] += 1

            # 3. Создаём товар (передаём вариации для определения цены)
            product = self._create_product(parent, category, brand, sku, variations)
            stats['products'] += 1

            # 4. Загружаем изображения
            if not skip_images:
                images_count = self._download_images(product, parent.get('Изображения') or '')
                stats['images'] += images_count

            # 5. Извлекаем и создаём атрибуты
            attributes = self._extract_attributes(parent)
            product_attr_values = []

            for attr_name, attr_data in attributes.items():
                # Создаём/получаем атрибут
                attribute = self._get_or_create_attribute(
                    attr_name,
                    attr_data['visible'],
                    attr_data['global'],
                    attributes_cache
                )
                if attr_name not in attributes_cache:
                    attributes_cache[attr_name] = attribute
                    stats['attributes'] += 1

                # Создаём значения атрибута
                values_str = attr_data['values']
                # Разделяем значения (могут быть через запятую)
                values = self._parse_attribute_values(values_str)

                for value in values:
                    value = value.strip()
                    if not value:
                        continue

                    cache_key = f'{attr_name}:{value}'
                    attr_value = self._get_or_create_attr_value(
                        attribute, value, attr_values_cache
                    )
                    if cache_key not in attr_values_cache:
                        attr_values_cache[cache_key] = attr_value
                        stats['attribute_values'] += 1

                    product_attr_values.append(attr_value)

                    # Связываем с товаром
                    ProductAttributeValue.objects.get_or_create(
                        product=product,
                        attribute=attribute,
                        attribute_value=attr_value
                    )

            # 6. Создаём вариации
            for var_row in variations:
                variant = self._create_variant(product, var_row, attributes_cache, attr_values_cache)
                if variant:
                    stats['variants'] += 1

        return stats

    def _get_or_create_category(self, name, cache):
        """Создаёт или получает категорию по имени"""
        if not name:
            return None

        # Нормализуем имя
        name = name.strip()
        if name in cache:
            return cache[name]

        # Ищем по имени (регистронезависимо)
        category = Category.objects.filter(name__iexact=name).first()
        if category:
            return category

        # Создаём новую категорию с транслитерированным slug
        slug = make_slug(name)
        # Проверяем уникальность slug
        base_slug = slug
        counter = 1
        while Category.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        category = Category.objects.create(name=name, slug=slug)
        return category

    def _get_or_create_brand(self, name, cache):
        """Создаёт или получает бренд по имени"""
        if not name:
            return None

        name = name.strip()
        if name in cache:
            return cache[name]

        # Ищем по имени
        brand = Brand.objects.filter(name__iexact=name).first()
        if brand:
            return brand

        # Создаём новый бренд
        slug = make_slug(name)
        base_slug = slug
        counter = 1
        while Brand.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        brand = Brand.objects.create(name=name, slug=slug)
        return brand

    def _get_or_create_attribute(self, name, show_in_card, is_filterable, cache):
        """Создаёт или получает атрибут по имени"""
        name = name.strip()
        if name in cache:
            return cache[name]

        # Ищем по имени
        attribute = Attribute.objects.filter(name__iexact=name).first()
        if attribute:
            return attribute

        # Создаём новый атрибут
        slug = make_slug(name)
        base_slug = slug
        counter = 1
        while Attribute.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        attribute = Attribute.objects.create(
            name=name,
            slug=slug,
            show_in_product_card=show_in_card,
            is_filterable=is_filterable,
        )
        return attribute

    def _get_or_create_attr_value(self, attribute, value, cache):
        """Создаёт или получает значение атрибута по значению"""
        value = value.strip()
        cache_key = f'{attribute.name}:{value}'
        if cache_key in cache:
            return cache[cache_key]

        # Ищем по значению и атрибуту
        attr_value = AttributeValue.objects.filter(
            attribute=attribute,
            value__iexact=value
        ).first()
        if attr_value:
            return attr_value

        # Создаём новое значение
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
            slug=slug
        )
        return attr_value

    def _parse_attribute_values(self, values_str):
        r"""
        Парсит строку значений атрибута.
        Учитывает экранирование запятых в WooCommerce (через \,)
        """
        if not values_str:
            return []

        # Заменяем экранированные запятые на плейсхолдер
        placeholder = '<<<COMMA>>>'
        values_str = values_str.replace(r'\,', placeholder)

        # Разделяем по запятым
        values = values_str.split(',')

        # Возвращаем экранированные запятые
        values = [v.replace(placeholder, ',').strip() for v in values]

        # Удаляем кавычки если есть
        values = [v.strip("'\"") for v in values]

        return [v for v in values if v]

    def _create_product(self, row, category, brand, sku, variations=None):
        """Создаёт товар"""
        name = (row.get('Имя') or '').strip()
        slug = make_slug(name)

        # Проверяем уникальность slug
        base_slug = slug
        counter = 1
        while Product.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        # Парсим числовые поля
        price = self._parse_decimal(row.get('Базовая цена'), default=Decimal('0'))

        # Если у родительского товара нет цены, берём из первой вариации
        if (not price or price == 0) and variations:
            for var_row in variations:
                var_price = self._parse_decimal(var_row.get('Базовая цена'))
                if var_price and var_price > 0:
                    price = var_price
                    break

        weight = self._parse_decimal(row.get('Вес (г)'))
        length = self._parse_decimal(row.get('Длина (см)'))
        width = self._parse_decimal(row.get('Ширина (см)'))
        height = self._parse_decimal(row.get('Высота (см)'))

        # Конвертируем вес из граммов в килограммы
        if weight:
            weight = weight / 1000

        product = Product.objects.create(
            name=name,
            slug=slug,
            sku=sku,
            description=(row.get('Описание') or '').strip(),
            short_description=(row.get('Краткое описание') or '').strip(),
            category=category,
            brand=brand,
            price=price if price and price > 0 else Decimal('1'),  # Минимум 1 для отображения
            weight=weight,
            length=length,
            width=width,
            height=height,
            is_active=True,
        )

        return product

    def _create_variant(self, product, row, attributes_cache, attr_values_cache):
        """Создаёт вариацию товара"""
        sku = (row.get('Артикул') or '').strip()
        price = self._parse_decimal(row.get('Базовая цена'))

        # Извлекаем значения атрибутов для этой вариации
        variant_attr_values = []

        for i in range(1, 16):
            name_key = f'Название атрибута {i}'
            values_key = f'Значения атрибутов {i}'

            attr_name = (row.get(name_key) or '').strip()
            attr_value_str = (row.get(values_key) or '').strip().strip("'\"")

            if attr_name and attr_value_str:
                # Получаем атрибут из кэша
                attribute = attributes_cache.get(attr_name)
                if not attribute:
                    continue

                # Получаем значение из кэша
                cache_key = f'{attr_name}:{attr_value_str}'
                attr_value = attr_values_cache.get(cache_key)

                if not attr_value:
                    # Создаём значение если его нет
                    attr_value = self._get_or_create_attr_value(
                        attribute, attr_value_str, attr_values_cache
                    )
                    attr_values_cache[cache_key] = attr_value

                variant_attr_values.append(attr_value)

        if not variant_attr_values:
            return None

        # Создаём вариацию (stock=1 чтобы товар отображался на фронте)
        variant = ProductVariant.objects.create(
            product=product,
            sku=sku,
            price=price if price else None,
            stock=1,  # Ставим 1 по умолчанию, чтобы товар был виден
            is_active=True,
        )
        variant.attribute_values.set(variant_attr_values)

        return variant

    def _download_images(self, product, images_str):
        """Загружает изображения товара по URL"""
        if not images_str:
            return 0

        urls = [url.strip() for url in images_str.split(',') if url.strip()]
        count = 0

        for i, url in enumerate(urls):
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()

                # Определяем имя файла
                parsed_url = urlparse(url)
                filename = os.path.basename(parsed_url.path)
                if not filename or '.' not in filename:
                    filename = f'{product.slug}-{i + 1}.jpg'

                # СОЗДАЕМ ContentFile с явным указанием имени
                content = ContentFile(response.content, name=filename)

                if i == 0:
                    # Первое изображение - главное
                    product.main_image.save(filename, content, save=True)
                else:
                    # Остальные - в галерею
                    product_image = ProductImage.objects.create(
                        product=product,
                        sort=i
                    )
                    # Сохраняем файл с явным указанием имени
                    product_image.image.save(filename, content, save=True)

                count += 1
                self.stdout.write(f'  Изображение: {filename}')

            except Exception as e:
                self.stderr.write(f'  Ошибка загрузки {url}: {e}')
                # Пропускаем ошибки загрузки изображений, продолжаем импорт

        return count

    def _parse_decimal(self, value, default=None):
        """Парсит строку в Decimal"""
        if not value:
            return default

        try:
            # Убираем пробелы и заменяем запятую на точку
            value = str(value).strip().replace(',', '.').replace(' ', '')
            return Decimal(value)
        except (InvalidOperation, ValueError):
            return default
