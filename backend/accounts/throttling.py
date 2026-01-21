from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """
    Throttle для авторизации - более строгий лимит.
    Защита от брутфорса паролей.
    """
    scope = "auth"
    rate = "5/minute"


class RegisterRateThrottle(AnonRateThrottle):
    """
    Throttle для регистрации - защита от массовой регистрации.
    """
    scope = "auth"
    rate = "3/minute"


class CheckoutRateThrottle(UserRateThrottle):
    """
    Throttle для оформления заказов.
    """
    scope = "checkout"
    rate = "10/hour"
