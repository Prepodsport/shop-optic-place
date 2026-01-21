"""
Интеграция с YooKassa (ЮKassa)
Документация: https://yookassa.ru/developers/api
"""
import uuid
import hashlib
import hmac
import json
import logging
from decimal import Decimal
from django.conf import settings
import requests

logger = logging.getLogger(__name__)

YOOKASSA_API_URL = "https://api.yookassa.ru/v3"


class YooKassaClient:
    """Клиент для работы с API YooKassa"""

    def __init__(self):
        self.shop_id = getattr(settings, "YOOKASSA_SHOP_ID", "")
        self.secret_key = getattr(settings, "YOOKASSA_SECRET_KEY", "")
        self.return_url = getattr(settings, "YOOKASSA_RETURN_URL", "")

    def _get_auth(self):
        return (self.shop_id, self.secret_key)

    def _get_headers(self, idempotence_key=None):
        headers = {
            "Content-Type": "application/json",
        }
        if idempotence_key:
            headers["Idempotence-Key"] = idempotence_key
        return headers

    def create_payment(
        self,
        amount: Decimal,
        order_id: int,
        description: str,
        customer_email: str,
        return_url: str = None,
        metadata: dict = None,
    ) -> dict:
        """
        Создание платежа в YooKassa

        Args:
            amount: Сумма платежа в рублях
            order_id: ID заказа в нашей системе
            description: Описание платежа
            customer_email: Email покупателя
            return_url: URL для возврата после оплаты
            metadata: Дополнительные данные

        Returns:
            dict: Ответ от YooKassa с id платежа и confirmation_url
        """
        if not self.shop_id or not self.secret_key:
            logger.warning("YooKassa credentials not configured")
            return {"error": "Payment system not configured"}

        idempotence_key = str(uuid.uuid4())

        payload = {
            "amount": {
                "value": str(amount),
                "currency": "RUB"
            },
            "capture": True,  # Автоматическое подтверждение
            "confirmation": {
                "type": "redirect",
                "return_url": return_url or self.return_url or f"{settings.FRONTEND_URL}/orders/{order_id}"
            },
            "description": description[:128],  # Максимум 128 символов
            "metadata": {
                "order_id": str(order_id),
                **(metadata or {})
            },
            "receipt": {
                "customer": {
                    "email": customer_email
                },
                "items": [
                    {
                        "description": description[:128],
                        "quantity": "1",
                        "amount": {
                            "value": str(amount),
                            "currency": "RUB"
                        },
                        "vat_code": 1,  # Без НДС
                        "payment_mode": "full_payment",
                        "payment_subject": "commodity"
                    }
                ]
            }
        }

        try:
            response = requests.post(
                f"{YOOKASSA_API_URL}/payments",
                json=payload,
                auth=self._get_auth(),
                headers=self._get_headers(idempotence_key),
                timeout=30
            )

            data = response.json()

            if response.status_code == 200:
                logger.info(f"YooKassa payment created: {data.get('id')} for order {order_id}")
                return {
                    "payment_id": data.get("id"),
                    "status": data.get("status"),
                    "confirmation_url": data.get("confirmation", {}).get("confirmation_url"),
                    "created_at": data.get("created_at"),
                }
            else:
                logger.error(f"YooKassa error: {data}")
                return {"error": data.get("description", "Payment creation failed")}

        except requests.exceptions.Timeout:
            logger.error("YooKassa timeout")
            return {"error": "Payment service timeout"}
        except Exception as e:
            logger.error(f"YooKassa exception: {e}")
            return {"error": str(e)}

    def get_payment(self, payment_id: str) -> dict:
        """
        Получение информации о платеже

        Args:
            payment_id: ID платежа в YooKassa

        Returns:
            dict: Информация о платеже
        """
        if not self.shop_id or not self.secret_key:
            return {"error": "Payment system not configured"}

        try:
            response = requests.get(
                f"{YOOKASSA_API_URL}/payments/{payment_id}",
                auth=self._get_auth(),
                headers=self._get_headers(),
                timeout=30
            )

            data = response.json()

            if response.status_code == 200:
                return {
                    "payment_id": data.get("id"),
                    "status": data.get("status"),
                    "amount": data.get("amount", {}).get("value"),
                    "paid": data.get("paid"),
                    "metadata": data.get("metadata", {}),
                    "created_at": data.get("created_at"),
                    "captured_at": data.get("captured_at"),
                }
            else:
                return {"error": data.get("description", "Failed to get payment")}

        except Exception as e:
            logger.error(f"YooKassa get_payment exception: {e}")
            return {"error": str(e)}

    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        """
        Проверка подписи webhook от YooKassa

        Args:
            body: Тело запроса
            signature: Подпись из заголовка

        Returns:
            bool: True если подпись валидна
        """
        if not self.secret_key:
            return False

        expected = hmac.new(
            self.secret_key.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected, signature)


# Глобальный экземпляр клиента
yookassa_client = YooKassaClient()
