"""
Management команда для связывания товаров с брендами на основе атрибута pa_brend.

Использование:
    python manage.py link_brands
    python manage.py link_brands --dry-run  # пробный запуск без сохранения
"""
from django.core.management.base import BaseCommand
from catalog.models import Product, Brand, Attribute, ProductAttributeValue
from django.utils.text import slugify
from transliterate import translit


class Command(BaseCommand):
    help = "Связывает товары с брендами на основе атрибута pa_brend"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Пробный запуск без сохранения изменений",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        if dry_run:
            self.stdout.write(self.style.WARNING("Режим --dry-run: изменения НЕ сохраняются"))

        # Ищем атрибут "Бренд" (pa_brend)
        try:
            brend_attr = Attribute.objects.get(slug="pa_brend")
        except Attribute.DoesNotExist:
            self.stdout.write(self.style.ERROR("Атрибут pa_brend не найден"))
            return

        self.stdout.write(f"Найден атрибут: {brend_attr.name} (ID: {brend_attr.id})")

        # Получаем все товары без бренда, у которых есть значение атрибута pa_brend
        products_with_brend_attr = Product.objects.filter(
            brand__isnull=True,
            attribute_values__attribute=brend_attr
        ).prefetch_related("attribute_values__attribute_value").distinct()

        self.stdout.write(f"Товаров без бренда с атрибутом pa_brend: {products_with_brend_attr.count()}")

        linked_count = 0
        created_brands = 0

        for product in products_with_brend_attr:
            # Получаем значение атрибута pa_brend для этого товара
            pav = product.attribute_values.filter(attribute=brend_attr).first()
            if not pav:
                continue

            brand_name = pav.attribute_value.value.strip()
            if not brand_name:
                continue

            # Ищем или создаём бренд
            brand_slug = self._make_slug(brand_name)
            brand, created = Brand.objects.get_or_create(
                slug=brand_slug,
                defaults={"name": brand_name}
            )

            if created:
                created_brands += 1
                self.stdout.write(self.style.SUCCESS(f"  Создан бренд: {brand.name}"))

            if not dry_run:
                product.brand = brand
                product.save(update_fields=["brand"])

            linked_count += 1
            try:
                self.stdout.write(f"  {product.name} -> {brand.name}")
            except UnicodeEncodeError:
                self.stdout.write(f"  [Product ID:{product.id}] -> {brand.name}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"Связано товаров с брендами: {linked_count}"))
        self.stdout.write(self.style.SUCCESS(f"Создано новых брендов: {created_brands}"))

        if dry_run:
            self.stdout.write(self.style.WARNING("Это был пробный запуск. Изменения НЕ сохранены."))

    def _make_slug(self, name: str) -> str:
        """Создаёт slug из названия"""
        try:
            latin = translit(name, "ru", reversed=True)
        except Exception:
            latin = name
        return slugify(latin)[:50]
