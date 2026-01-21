"""
Команда для докачки отсутствующих изображений товаров.
Использование: python manage.py download_missing_images
"""
import os
import csv
import requests
import time
from urllib.parse import urlparse
from decimal import Decimal, InvalidOperation

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction

from catalog.models import Product, ProductImage


class Command(BaseCommand):
    help = 'Докачка отсутствующих изображений товаров'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-file',
            type=str,
            default='../export.csv',
            help='Путь к CSV файлу (по умолчанию: ../export.csv)',
        )
        parser.add_argument(
            '--start-from',
            type=int,
            default=0,
            help='Начать с указанного индекса товара (0 - сначала)',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            default=True,
            help='Пропускать товары с уже загруженными изображениями (по умолчанию: True)',
        )
        parser.add_argument(
            '--no-skip-existing',
            action='store_false',
            dest='skip_existing',
            help='Не пропускать товары с уже загруженными изображениями',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.5,
            help='Задержка между загрузками изображений в секундах (по умолчанию: 0.5)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Количество товаров между паузами (по умолчанию: 10)',
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        start_from = options['start_from']
        skip_existing = options['skip_existing']
        delay = options['delay']
        batch_size = options['batch_size']

        # Проверяем существование файла
        if not os.path.exists(csv_file):
            self.stderr.write(self.style.ERROR(f'Файл не найден: {csv_file}'))
            self.stderr.write(self.style.WARNING('Укажите правильный путь с помощью --csv-file'))
            return

        self.stdout.write(self.style.SUCCESS(f'Чтение файла: {csv_file}'))

        # Загружаем данные из CSV
        sku_to_images = self._load_image_urls_from_csv(csv_file)
        if not sku_to_images:
            return

        total_skus = len(sku_to_images)
        self.stdout.write(self.style.SUCCESS(f'Найдено {total_skus} SKU с изображениями'))

        # Обрабатываем товары
        self._process_products(
            sku_to_images,
            start_from,
            skip_existing,
            delay,
            batch_size
        )

    def _load_image_urls_from_csv(self, csv_file):
        """Загружает соответствие SKU -> URLs изображений из CSV"""
        sku_to_images = {}

        try:
            # Пробуем разные кодировки
            encodings = ['utf-8-sig', 'utf-8', 'cp1251', 'latin-1']

            for encoding in encodings:
                try:
                    with open(csv_file, 'r', encoding=encoding, newline='') as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            sku = (row.get('Артикул') or '').strip()
                            images = (row.get('Изображения') or '').strip()

                            if sku and images:
                                urls = [url.strip() for url in images.split(',') if url.strip()]
                                if urls:
                                    sku_to_images[sku] = urls

                    self.stdout.write(self.style.SUCCESS(f'Кодировка: {encoding}'))
                    break

                except (UnicodeDecodeError, csv.Error):
                    continue

            return sku_to_images

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Ошибка чтения CSV: {e}'))
            return {}

    def _process_products(self, sku_to_images, start_from, skip_existing, delay, batch_size):
        """Обрабатывает товары и загружает изображения"""
        total_skus = len(sku_to_images)
        processed = 0
        successful = 0
        failed = 0

        # Создаем сессию с retry
        session = self._create_session()

        items = list(sku_to_images.items())[start_from:]

        for idx, (sku, urls) in enumerate(items, start=1):
            try:
                # Ищем товар по SKU
                product = Product.objects.filter(sku=sku).first()
                if not product:
                    self.stdout.write(self.style.WARNING(f'[{idx}/{total_skus}] Товар с SKU {sku} не найден'))
                    failed += 1
                    continue

                self.stdout.write(f'\n[{idx}/{total_skus}] Товар: {product.name}')
                self.stdout.write(f'   SKU: {sku}')

                # Проверяем существующие изображения
                if skip_existing:
                    existing_count = self._count_existing_images(product)
                    if existing_count >= len(urls):
                        self.stdout.write(self.style.SUCCESS(f'   ✅ Все {existing_count} изображений уже загружены, пропускаем'))
                        processed += 1
                        continue
                    elif existing_count > 0:
                        self.stdout.write(f'   ℹ️  Уже загружено {existing_count} из {len(urls)} изображений')

                # Загружаем изображения
                downloaded = self._download_product_images(
                    product, urls, session, delay
                )

                if downloaded > 0:
                    self.stdout.write(self.style.SUCCESS(f'   ✅ Загружено {downloaded} новых изображений'))
                    successful += 1
                else:
                    self.stdout.write(f'   ℹ️  Новых изображений не загружено')

                processed += 1

                # Пауза после batch_size товаров
                if processed % batch_size == 0:
                    self.stdout.write(f'\n⏸️  Пауза 2 секунды...')
                    time.sleep(2)

            except Exception as e:
                self.stderr.write(self.style.ERROR(f'   ❌ Ошибка обработки товара {sku}: {e}'))
                failed += 1
                continue

        # Итоговая статистика
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('ИТОГОВАЯ СТАТИСТИКА:'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS(f'Всего товаров в CSV: {total_skus}'))
        self.stdout.write(self.style.SUCCESS(f'Обработано: {processed}'))
        self.stdout.write(self.style.SUCCESS(f'Успешно обновлено: {successful}'))
        self.stdout.write(self.style.SUCCESS(f'Не найдено в БД: {failed}'))
        self.stdout.write(self.style.SUCCESS('=' * 60))

    def _create_session(self):
        """Создает requests сессию с retry"""
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry

        session = requests.Session()

        retry = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        )

        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)

        return session

    def _count_existing_images(self, product):
        """Считает количество уже загруженных изображений"""
        count = 0

        # Главное изображение
        if product.main_image:
            count += 1

        # Дополнительные изображения
        # Используем правильное имя связи - images вместо productimage_set
        count += product.images.count()

        return count

    def _download_product_images(self, product, urls, session, delay):
        """Загружает изображения для товара"""
        downloaded = 0

        for i, url in enumerate(urls):
            try:
                # Пауза между загрузками
                if i > 0:
                    time.sleep(delay)

                # Проверяем, нужно ли загружать это изображение
                if i == 0 and product.main_image:
                    self.stdout.write(f'   ⏭️  Главное изображение уже есть, пропускаем')
                    continue

                # Пропускаем если дополнительное изображение уже существует
                if i > 0 and self._additional_image_exists(product, i):
                    self.stdout.write(f'   ⏭️  Дополнительное изображение {i} уже есть, пропускаем')
                    continue

                self.stdout.write(f'   📥 Загрузка изображения {i+1}/{len(urls)}...')

                response = session.get(url, timeout=30)
                response.raise_for_status()

                # Определяем имя файла
                parsed = urlparse(url)
                filename = os.path.basename(parsed.path)
                if not filename or '.' not in filename:
                    # Определяем расширение по content-type
                    content_type = response.headers.get('content-type', '')
                    if 'jpeg' in content_type or 'jpg' in content_type:
                        ext = 'jpg'
                    elif 'png' in content_type:
                        ext = 'png'
                    elif 'webp' in content_type:
                        ext = 'webp'
                    else:
                        ext = 'jpg'

                    filename = f'{product.slug}-{i+1}.{ext}'

                # Создаем ContentFile
                content = ContentFile(response.content, name=filename)

                if i == 0:
                    # Главное изображение
                    product.main_image.save(filename, content, save=True)
                    self.stdout.write(self.style.SUCCESS(f'   ✅ Главное изображение сохранено'))
                else:
                    # Дополнительное изображение
                    # Используем правильную связь
                    product_image = ProductImage.objects.create(
                        product=product,
                        sort=i
                    )
                    product_image.image.save(filename, content, save=True)
                    self.stdout.write(self.style.SUCCESS(f'   ✅ Дополнительное изображение {i} сохранено'))

                downloaded += 1

            except Exception as e:
                self.stderr.write(self.style.ERROR(f'   ❌ Ошибка загрузки {url}: {e}'))
                continue

        return downloaded

    def _additional_image_exists(self, product, index):
        """Проверяет, существует ли дополнительное изображение с данным индексом"""
        # Проверяем, есть ли изображение с таким sort
        return product.images.filter(sort=index).exists()

    def _parse_decimal(self, value, default=None):
        """Парсит строку в Decimal"""
        if not value:
            return default

        try:
            value = str(value).strip().replace(',', '.').replace(' ', '')
            return Decimal(value)
        except (InvalidOperation, ValueError):
            return default