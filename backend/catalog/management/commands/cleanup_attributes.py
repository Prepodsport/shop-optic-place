"""
Команда для очистки атрибутов:
1. Убирает префикс pa_ из slug существующих атрибутов
2. Переносит значения атрибута "Бренд" (pa_brend) в модель Brand
3. Удаляет атрибут "Бренд" после переноса

Использование:
    python manage.py cleanup_attributes
    python manage.py cleanup_attributes --dry-run
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from transliterate import translit

from catalog.models import (
    Attribute, AttributeValue, ProductAttributeValue,
    Product, Brand
)


# Названия атрибута "Бренд" в разных вариантах
BRAND_ATTRIBUTE_NAMES = {'бренд', 'brand', 'brend'}
BRAND_ATTRIBUTE_SLUGS = {'pa_brend', 'pa-brend', 'brend', 'brand'}


def make_slug(text):
    if not text:
        return ''
    try:
        text_latin = translit(text, 'ru', reversed=True)
    except Exception:
        text_latin = text
    return slugify(text_latin)


class Command(BaseCommand):
    help = 'Очистка атрибутов: убираем pa_ из slug, переносим бренды'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Пробный запуск без сохранения',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('Режим --dry-run: изменения НЕ сохраняются'))

        try:
            if dry_run:
                self._cleanup(dry_run=True)
            else:
                with transaction.atomic():
                    self._cleanup(dry_run=False)
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Ошибка: {e}'))
            raise

    def _cleanup(self, dry_run):
        # 1. Убираем pa_ из slug атрибутов
        self._cleanup_attribute_slugs(dry_run)

        # 2. Переносим атрибут "Бренд" в модель Brand
        self._migrate_brand_attribute(dry_run)

    def _cleanup_attribute_slugs(self, dry_run):
        """Убирает префикс pa_ из slug атрибутов"""
        self.stdout.write('\n=== Очистка slug атрибутов от pa_ ===')

        updated = 0
        for attr in Attribute.objects.all():
            old_slug = attr.slug
            if old_slug.startswith('pa_') or old_slug.startswith('pa-'):
                # Убираем pa_ или pa-
                new_slug = old_slug[3:] if old_slug.startswith('pa_') else old_slug[3:]

                # Проверяем уникальность
                if Attribute.objects.filter(slug=new_slug).exclude(pk=attr.pk).exists():
                    # Slug уже занят, добавляем суффикс
                    counter = 1
                    base_slug = new_slug
                    while Attribute.objects.filter(slug=new_slug).exclude(pk=attr.pk).exists():
                        new_slug = f'{base_slug}-{counter}'
                        counter += 1

                self.stdout.write(f'  {attr.name}: {old_slug} -> {new_slug}')

                if not dry_run:
                    attr.slug = new_slug
                    attr.save(update_fields=['slug'])

                updated += 1

        self.stdout.write(self.style.SUCCESS(f'Обновлено атрибутов: {updated}'))

    def _migrate_brand_attribute(self, dry_run):
        """Переносит значения атрибута Бренд в модель Brand"""
        self.stdout.write('\n=== Перенос атрибута "Бренд" в модель Brand ===')

        # Ищем атрибут "Бренд"
        brand_attr = None
        for attr in Attribute.objects.all():
            if attr.name.lower().strip() in BRAND_ATTRIBUTE_NAMES:
                brand_attr = attr
                break
            if attr.slug.lower().strip() in BRAND_ATTRIBUTE_SLUGS:
                brand_attr = attr
                break

        if not brand_attr:
            self.stdout.write('  Атрибут "Бренд" не найден - пропускаем')
            return

        self.stdout.write(f'  Найден атрибут: {brand_attr.name} (ID: {brand_attr.id}, slug: {brand_attr.slug})')

        # Получаем все товары с этим атрибутом
        product_attrs = ProductAttributeValue.objects.filter(
            attribute=brand_attr
        ).select_related('product', 'attribute_value')

        self.stdout.write(f'  Товаров с атрибутом "Бренд": {product_attrs.count()}')

        brands_created = 0
        products_linked = 0

        for pav in product_attrs:
            product = pav.product
            brand_name = pav.attribute_value.value.strip()

            if not brand_name:
                continue

            # Ищем или создаём бренд
            brand = Brand.objects.filter(name__iexact=brand_name).first()
            if not brand:
                brand_slug = make_slug(brand_name)
                # Проверяем уникальность slug
                counter = 1
                base_slug = brand_slug
                while Brand.objects.filter(slug=brand_slug).exists():
                    brand_slug = f'{base_slug}-{counter}'
                    counter += 1

                if not dry_run:
                    brand = Brand.objects.create(name=brand_name, slug=brand_slug)
                brands_created += 1
                self.stdout.write(f'    + Создан бренд: {brand_name}')

            # Связываем товар с брендом (если ещё не связан)
            if product.brand is None:
                if not dry_run:
                    product.brand = brand
                    product.save(update_fields=['brand'])
                products_linked += 1

        self.stdout.write(self.style.SUCCESS(f'  Создано брендов: {brands_created}'))
        self.stdout.write(self.style.SUCCESS(f'  Связано товаров: {products_linked}'))

        # Удаляем атрибут "Бренд" и его значения
        if not dry_run:
            values_count = brand_attr.values.count()
            pav_count = ProductAttributeValue.objects.filter(attribute=brand_attr).count()

            # Удаляем связи товаров с этим атрибутом
            ProductAttributeValue.objects.filter(attribute=brand_attr).delete()
            self.stdout.write(f'  Удалено связей ProductAttributeValue: {pav_count}')

            # Удаляем значения атрибута
            brand_attr.values.all().delete()
            self.stdout.write(f'  Удалено значений атрибута: {values_count}')

            # Удаляем сам атрибут
            brand_attr.delete()
            self.stdout.write(self.style.SUCCESS(f'  Атрибут "{brand_attr.name}" удалён'))
        else:
            self.stdout.write(self.style.WARNING('  (dry-run: атрибут НЕ удалён)'))

        self.stdout.write('')
