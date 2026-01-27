# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с кодом в этом репозитории.

## Обзор проекта

OpticPlace — это полнофункциональная e-commerce платформа для магазина оптики, построенная на Django REST Framework (бэкенд) и React (фронтенд). Система поддерживает управление каталогом товаров с вариациями (по типу WooCommerce), функционал корзины, аутентификацию пользователей через JWT, запись на приём и интеграцию с Bitrix24 CRM.

## Технологический стек

**Бэкенд:**
- Django 5.0.8 с Django REST Framework
- PostgreSQL 16 (через Docker)
- JWT аутентификация (djangorestframework-simplejwt)
- drf-spectacular для OpenAPI/Swagger документации
- django-cors-headers для обработки CORS
- django-filter для фильтрации в API
- Pillow для обработки изображений
- transliterate для транслитерации русских slug
- **django-unfold** — современная кастомная тема для Django Admin
- WooCommerce REST API интеграция

**Фронтенд:**
- React 19.2.0 с React Router
- Vite 7 для разработки и сборки
- Axios для API запросов
- localStorage для хранения JWT токенов и корзины

## Команды разработки

### Бэкенд (Django)

Из директории `backend/`:

```bash
# Активация виртуального окружения (из корня проекта)
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Unix/Mac

# Установка зависимостей
pip install -r requirements.txt

# Миграции базы данных
python manage.py makemigrations
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Запуск сервера разработки
python manage.py runserver

# Запуск Django shell
python manage.py shell

# Сбор статических файлов (продакшн)
python manage.py collectstatic

# Импорт товаров из WooCommerce CSV
python manage.py import_woocommerce export.csv
python manage.py import_woocommerce export.csv --dry-run  # пробный запуск
python manage.py import_woocommerce export.csv --limit 10  # только 10 товаров
python manage.py import_woocommerce export.csv --skip-images  # без изображений

# Синхронизация с WooCommerce REST API
python manage.py sync_woocommerce
python manage.py sync_woocommerce --dry-run  # пробный запуск
python manage.py sync_woocommerce --skip-images  # без изображений
python manage.py sync_woocommerce --categories-only  # только категории
python manage.py sync_woocommerce --products-only  # только товары
python manage.py sync_woocommerce --limit 10  # только 10 товаров
python manage.py sync_woocommerce --timeout 180  # таймаут запросов в секундах

# Загрузка недостающих изображений товаров
python manage.py download_missing_images
python manage.py download_missing_images --limit 50  # только 50 товаров

# Создание стандартных CMS-страниц
python manage.py bootstrap_pages
```

### Фронтенд (React)

Из директории `frontend/`:

```bash
# Установка зависимостей
npm install

# Запуск сервера разработки (по умолчанию: http://localhost:5173)
npm run dev

# Сборка для продакшна
npm run build

# Проверка кода (линтер)
npm run lint

# Предпросмотр продакшн сборки
npm run preview
```

### Docker

Из корня проекта:

```bash
# Запуск базы данных PostgreSQL
docker-compose up -d

# Остановка базы данных
docker-compose down

# Просмотр логов
docker-compose logs -f
```

## Архитектура

### Структура бэкенда

Django бэкенд следует модульной архитектуре на основе приложений:

- **accounts**: Кастомная модель User с email-аутентификацией, JWT эндпоинты
- **catalog**: Каталог товаров с вариациями, категориями, брендами, атрибутами
- **orders**: Управление корзиной и заказами с поддержкой купонов
- **appointments**: Система записи на приём к офтальмологу/оптометристу
- **integrations**: Интеграция с Bitrix24 CRM для создания лидов
- **content**: Управляемый контент (топ-хедер, баннеры)
- **pages**: CMS-страницы (О нас, Контакты, Доставка и т.п.)
- **config**: Настройки проекта, маршрутизация URL

**Административная панель:**
- Используется **django-unfold** — современная тема для Django Admin
- Путь: `/admin/`
- Особенности:
  - Адаптивный дизайн с темной темой
  - Расширенные фильтры и inline-редактирование
  - Кастомные actions для массовых операций (например, применение скидок к товарам)
  - Визуальные превью изображений
  - Счетчики и статистика прямо в списках

**Функции админки категорий** (`/admin/catalog/category/`):
- Список отображает: название, slug, родительскую категорию, количество товаров, сортировку, активность, превью изображения
- Возможность массового редактирования сортировки и активности прямо в списке
- Фильтрация по родительской категории и активности
- Поиск по названию и slug
- Счетчик товаров — кликабельная ссылка на список товаров категории
- Настройка атрибутов для фильтров каталога и мегаменю

**Ключевые настройки Django:**
- Кастомная модель User: `accounts.User` (вход по email вместо username)
- Модуль настроек: `config.settings`
- Базовый путь API: `/api/`
- Админ-панель: `/admin/`
- Swagger документация: `/api/docs/`
- OpenAPI схема: `/api/schema/`

**Поток аутентификации:**
- JWT токены хранятся в localStorage
- Время жизни access токена: 30 минут
- Время жизни refresh токена: 7 дней
- Заголовок аутентификации автоматически добавляется через axios interceptor в `frontend/src/api.js`

### Структура фронтенда

React приложение с маршрутизацией:

- **src/pages/**: Компоненты страниц
  - Home, Catalog, Product, Login, Register
  - Account, Booking, Cart, Favorites
  - About, Contacts, Delivery, Sale, CmsPage
- **src/components/**: Переиспользуемые компоненты
  - **layout/**: TopHeader, Header, MegaMenu, Footer, Layout
  - **home/**: BannerSlider, ProductTabs, CategoryTabs
  - **product/**: ProductCard, ProductGrid
  - **ui/**: Tabs, Badge
  - QuickViewModal
- **src/context/**: Контексты состояния
  - CartContext — корзина с поддержкой вариаций
  - FavoritesContext — избранные товары
- **src/utils/**: Утилиты
  - normalizeRichText.js — обработка HTML/текста для отображения
- **src/api.js**: Axios инстанс с JWT interceptor
- **src/App.jsx**: Основная конфигурация маршрутизации

**Маршруты:**
- `/` — Главная страница
- `/catalog` — Каталог товаров с фильтрами
- `/product/:slug` — Страница товара с выбором вариации
- `/cart` — Корзина
- `/favorites` — Избранные товары
- `/sale` — Распродажа (товары с is_sale=true)
- `/booking` — Запись на приём
- `/account` — Личный кабинет
- `/login`, `/register` — Страницы аутентификации
- `/about`, `/contacts`, `/delivery` — CMS-страницы

## Система атрибутов и вариаций

Проект использует систему атрибутов по типу WooCommerce:

### Модели

- **Attribute** — глобальный атрибут (например: "Оптическая сила", "Цвет линз")
  - `is_filterable` — показывать в фильтрах каталога
  - `show_in_product_card` — показывать для выбора вариации

- **AttributeValue** — значение атрибута (например: "-1.0", "-1.5", "Голубой")

- **ProductAttributeValue** — связь товара с допустимыми значениями атрибутов
  - Определяет, какие значения доступны для данного товара

- **ProductVariant** — конкретная вариация товара
  - Уникальная комбинация значений атрибутов
  - Своя цена, артикул, остаток на складе

### Настройки товара

- **variation_attributes** (M2M) — атрибуты для выбора вариации (SPH, CYL, AXIS)
- **spec_attributes** (M2M) — атрибуты для блока "Характеристики"

### Настройки категории

- **filter_attributes** (M2M) — атрибуты для фильтров в каталоге данной категории
  - Если заполнено — используются только эти атрибуты
  - Если пусто — используются глобальные `Attribute.is_filterable=True`

### Генерация вариаций

В админ-панели товара:
1. Добавить значения атрибутов (инлайн ProductAttributeValue)
2. Нажать кнопку "Создать вариации"
3. Система автоматически создаст все комбинации

## Модели базы данных

### Catalog

- **Category** — категории (с иерархией через parent)
  - `image` — изображение для главной страницы
  - `filter_attributes` — атрибуты для фильтров категории
  - `mega_menu_attributes` — атрибуты для отображения в мегаменю (до 3 шт)
  - `is_active` — активность категории (неактивные не показываются в API и фронтенде)
  - `sort` — порядок сортировки

**Текущая структура категорий:**
1. Контактные линзы (101 товар)
2. Линзы для очков (13 товаров) — оптические линзы Nikon, Essilor, CRYOL
3. Оправы (348 товаров)
4. Оптика для детей (106 товаров)
5. Растворы и уход (137 товаров)
6. Солнцезащитные очки (138 товаров)

- **Brand** — бренды товаров

- **Product** — товар
  - `variation_attributes` — атрибуты вариаций
  - `spec_attributes` — атрибуты характеристик
  - `is_popular`, `is_bestseller`, `is_new`, `is_sale` — флаги для отображения

- **ProductImage** — галерея товара

- **ProductVariant** — вариация товара
  - `attribute_values` (M2M) — комбинация значений
  - `price`, `old_price`, `stock`, `sku`

### Orders

- **Order** — заказ
  - Статусы: `cart`, `placed`, `paid`, `cancelled`

- **OrderItem** — позиция заказа

- **Coupon** — купоны на скидку
  - Типы: процент или фиксированная сумма

### Content

- **TopHeader** — промо-сообщения в шапке сайта
- **Banner** — баннеры для слайдера

### Pages

- **Page** — CMS-страница
- **PageSection** — секция страницы (заголовок + текст + список)

### Appointments

- **Appointment** — запись на приём
  - Типы: офтальмолог, оптометрист
  - Статусы: new, sent_to_bitrix, bitrix_failed

## Структура API

Все эндпоинты имеют префикс `/api/`:

### Каталог `/api/catalog/`

- `GET /categories/` — список категорий
- `GET /brands/` — список брендов
- `GET /attributes/` — список атрибутов
- `GET /attributes/filterable/` — атрибуты для фильтров
- `GET /products/` — список товаров с пагинацией и фильтрами
- `GET /products/{slug}/` — детали товара с вариациями
- `GET /products/featured/` — товары для табов (popular/bestseller/new)
- `GET /products/filters/` — доступные фильтры для каталога

**Фильтрация товаров:**
```
/products/?category=linzy
/products/?brand=acuvue
/products/?min_price=100&max_price=500
/products/?attr_color=blue,green
/products/?is_sale=true
/products/?ordering=-price
```

### Аутентификация `/api/auth/`

- `POST /register/` — регистрация
- `POST /token/` — получение JWT токенов
- `POST /token/refresh/` — обновление access токена
- `GET /me/` — данные текущего пользователя

### Заказы `/api/orders/`

- `POST /checkout/` — оформление заказа
- `GET /my/` — заказы текущего пользователя

### Записи `/api/appointments/`

- `POST /` — создание записи на приём

### Контент `/api/content/`

- `GET /topheader/` — сообщения топ-хедера
- `GET /banners/` — баннеры для слайдера

### Страницы `/api/pages/`

- `GET /{slug}/` — CMS-страница по slug

## Конфигурация окружения

**Бэкенд** (`backend/.env`):
```
DEBUG=1
SECRET_KEY=your-secret-key
DB_NAME=opticplace
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
BITRIX24_WEBHOOK_URL=https://your-portal.bitrix24.ru/rest/...
```

**Фронтенд** (`frontend/.env`):
```
VITE_API_URL=http://127.0.0.1:8000/api
```

## Общие паттерны

**Генерация slug:**
- Используется `transliterate` для русского текста → латиница
- Затем `slugify` для безопасного URL
- Автоматическая генерация при сохранении если slug не указан

**Корзина (фронтенд):**
- Хранится в localStorage под ключом `optic_cart`
- Поддерживает вариации через `key = productId:variantId`
- Синхронизация между вкладками через storage event

**Фильтры каталога:**
- Динамические — показывают только доступные значения
- В категории фильтры НЕ сужаются при выборе бренда
- Атрибуты фильтруются через `attr_{slug}={value_slug}`

**Загрузка изображений:**
- Основные изображения товаров: `media/products/main/`
- Галерея товаров: `media/products/gallery/`
- Категории: `media/categories/`
- Баннеры: `media/banners/`

**Флаги товаров:**
- `is_popular` — раздел "Популярное"
- `is_bestseller` — раздел "Хиты продаж"
- `is_new` — раздел "Новинки"
- `is_sale` — страница "Распродажа"
- `views_count`, `sales_count` — автоматические счётчики

## Импорт из WooCommerce

Команда `import_woocommerce` импортирует товары из CSV экспорта WooCommerce:

```bash
python manage.py import_woocommerce export.csv
```

**Опции:**
- `--dry-run` — пробный запуск без сохранения
- `--skip-images` — не загружать изображения
- `--limit N` — импортировать только N товаров

**Особенности:**
- Автоматическое создание категорий, брендов, атрибутов
- Поддержка вариаций товаров
- Транслитерация русских slug
- Загрузка изображений по URL
- Вариации создаются со stock=1 по умолчанию

## Локализация

- Язык: Русский (`ru-ru`)
- Часовой пояс: `Europe/Moscow`
- Интернационализация включена (`USE_I18N`, `USE_TZ`)
