"""
WooCommerce REST API клиент для синхронизации товаров.

Использует библиотеку WooCommerce для работы с REST API.
Документация API: https://woocommerce.github.io/woocommerce-rest-api-docs/
"""
import logging
import time
from typing import Iterator, Optional

from django.conf import settings
from requests.exceptions import ReadTimeout, ConnectionError as RequestsConnectionError
from woocommerce import API

logger = logging.getLogger(__name__)

# Настройки retry
DEFAULT_TIMEOUT = 120  # секунд
MAX_RETRIES = 3
RETRY_DELAY = 5  # секунд между попытками


class WooCommerceClient:
    """Клиент для работы с WooCommerce REST API"""

    def __init__(
        self,
        url: str = None,
        consumer_key: str = None,
        consumer_secret: str = None
    ):
        self.url = (url or settings.WOOCOMMERCE_URL or "").strip().rstrip("/")
        self.consumer_key = consumer_key or settings.WOOCOMMERCE_CONSUMER_KEY or ""
        self.consumer_secret = consumer_secret or settings.WOOCOMMERCE_CONSUMER_SECRET or ""

        self._api = None

    def is_configured(self) -> bool:
        """Проверяет, настроены ли API ключи"""
        return bool(self.url and self.consumer_key and self.consumer_secret)

    @property
    def api(self) -> API:
        """Ленивая инициализация API клиента"""
        if self._api is None:
            if not self.is_configured():
                raise ValueError(
                    "WooCommerce API не настроен. Укажите WOOCOMMERCE_URL, "
                    "WOOCOMMERCE_CONSUMER_KEY и WOOCOMMERCE_CONSUMER_SECRET в .env"
                )
            self._api = API(
                url=self.url,
                consumer_key=self.consumer_key,
                consumer_secret=self.consumer_secret,
                version="wc/v3",
                timeout=DEFAULT_TIMEOUT,
            )
        return self._api

    def _request_with_retry(self, endpoint: str, params: dict = None):
        """
        Выполняет запрос с повторными попытками при таймауте.

        Args:
            endpoint: API endpoint
            params: Параметры запроса

        Returns:
            Response объект
        """
        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.api.get(endpoint, params=params)
                return response
            except (ReadTimeout, RequestsConnectionError) as e:
                last_error = e
                if attempt < MAX_RETRIES:
                    logger.warning(
                        f"Таймаут при запросе {endpoint} (попытка {attempt}/{MAX_RETRIES}). "
                        f"Повтор через {RETRY_DELAY} сек..."
                    )
                    time.sleep(RETRY_DELAY)
                else:
                    logger.error(f"Превышено количество попыток для {endpoint}")
                    raise

        raise last_error

    def _paginate(self, endpoint: str, per_page: int = 100, **params) -> Iterator[dict]:
        """
        Генератор для пагинации результатов API.

        Args:
            endpoint: API endpoint (например, "products")
            per_page: Количество записей на страницу
            **params: Дополнительные параметры запроса

        Yields:
            Записи из API по одной
        """
        page = 1
        while True:
            params_with_pagination = {
                "per_page": per_page,
                "page": page,
                **params,
            }

            logger.debug(f"Запрос {endpoint}, страница {page}")
            response = self._request_with_retry(endpoint, params=params_with_pagination)

            if response.status_code != 200:
                logger.error(f"Ошибка API: {response.status_code} - {response.text}")
                raise Exception(f"WooCommerce API error: {response.status_code}")

            data = response.json()
            if not data:
                break

            for item in data:
                yield item

            # Проверяем, есть ли ещё страницы
            total_pages = int(response.headers.get("X-WP-TotalPages", 1))
            if page >= total_pages:
                break

            page += 1

    def get_categories(self, per_page: int = 100) -> Iterator[dict]:
        """
        Получает все категории товаров.

        Returns:
            Генератор словарей с данными категорий
        """
        return self._paginate("products/categories", per_page=per_page, orderby="id")

    def get_attributes(self) -> list[dict]:
        """
        Получает все глобальные атрибуты товаров.

        Returns:
            Список словарей с данными атрибутов
        """
        response = self._request_with_retry("products/attributes")

        if response.status_code != 200:
            logger.error(f"Ошибка API: {response.status_code} - {response.text}")
            raise Exception(f"WooCommerce API error: {response.status_code}")

        return response.json()

    def get_attribute_terms(self, attribute_id: int, per_page: int = 100) -> Iterator[dict]:
        """
        Получает все значения (terms) для атрибута.

        Args:
            attribute_id: ID атрибута в WooCommerce

        Returns:
            Генератор словарей с данными значений атрибута
        """
        return self._paginate(
            f"products/attributes/{attribute_id}/terms",
            per_page=per_page,
            orderby="id"
        )

    def get_products(
        self,
        per_page: int = 100,
        status: str = "publish",
        **params
    ) -> Iterator[dict]:
        """
        Получает все товары.

        Args:
            per_page: Количество товаров на страницу
            status: Статус товара (publish, draft, pending)
            **params: Дополнительные фильтры

        Returns:
            Генератор словарей с данными товаров
        """
        return self._paginate(
            "products",
            per_page=per_page,
            status=status,
            **params
        )

    def get_product(self, product_id: int) -> Optional[dict]:
        """
        Получает один товар по ID.

        Args:
            product_id: ID товара в WooCommerce

        Returns:
            Словарь с данными товара или None
        """
        response = self._request_with_retry(f"products/{product_id}")

        if response.status_code == 404:
            return None

        if response.status_code != 200:
            logger.error(f"Ошибка API: {response.status_code} - {response.text}")
            raise Exception(f"WooCommerce API error: {response.status_code}")

        return response.json()

    def get_variations(self, product_id: int, per_page: int = 100) -> Iterator[dict]:
        """
        Получает все вариации товара.

        Args:
            product_id: ID родительского товара в WooCommerce
            per_page: Количество вариаций на страницу

        Returns:
            Генератор словарей с данными вариаций
        """
        return self._paginate(
            f"products/{product_id}/variations",
            per_page=per_page,
        )

    def get_tags(self, per_page: int = 100) -> Iterator[dict]:
        """
        Получает все теги товаров (используются для брендов).

        Returns:
            Генератор словарей с данными тегов
        """
        return self._paginate("products/tags", per_page=per_page, orderby="id")

    def test_connection(self) -> bool:
        """
        Тестирует соединение с WooCommerce API.

        Returns:
            True если соединение успешно
        """
        try:
            response = self._request_with_retry("products", params={"per_page": 1})
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ошибка соединения с WooCommerce: {e}")
            return False
