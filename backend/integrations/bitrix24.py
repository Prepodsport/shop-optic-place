import requests
import logging

logger = logging.getLogger(__name__)


class Bitrix24Client:
    def __init__(self, webhook_base_url: str):
        self.webhook_base_url = (webhook_base_url or "").strip().rstrip("/")

    def is_configured(self) -> bool:
        return bool(self.webhook_base_url)

    def _post(self, method: str, payload: dict):
        url = f"{self.webhook_base_url}/{method}.json"
        resp = requests.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def create_lead(self, title: str, name: str, phone: str, email: str, comment: str):
        if not self.is_configured():
            logger.info("Bitrix24 webhook not configured; skipping create_lead")
            return None

        fields = {
            "TITLE": title,
            "NAME": name,
            "PHONE": [{"VALUE": phone, "VALUE_TYPE": "WORK"}] if phone else [],
            "EMAIL": [{"VALUE": email, "VALUE_TYPE": "WORK"}] if email else [],
            "COMMENTS": comment or "",
            "SOURCE_ID": "WEB",
        }
        return self._post("crm.lead.add", {"fields": fields})
