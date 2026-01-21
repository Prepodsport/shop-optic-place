from django.urls import path
from .views import (
    RegisterView, MeView, PasswordChangeView, LogoutView,
    ThrottledTokenObtainPairView, ThrottledTokenRefreshView,
    PasswordResetRequestView, PasswordResetConfirmView, PasswordResetValidateTokenView,
    PrescriptionListCreateView, PrescriptionDetailView, PrescriptionSetPrimaryView,
    LensReminderListCreateView, LensReminderDetailView, LensReminderRenewView, LensReminderActiveView
)

urlpatterns = [
    # Регистрация и авторизация
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),

    # Профиль
    path("me/", MeView.as_view(), name="me"),
    path("password/change/", PasswordChangeView.as_view(), name="password_change"),

    # Сброс пароля
    path("password/reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("password/reset/validate/", PasswordResetValidateTokenView.as_view(), name="password_reset_validate"),

    # Рецепты
    path("prescriptions/", PrescriptionListCreateView.as_view(), name="prescription_list"),
    path("prescriptions/<int:pk>/", PrescriptionDetailView.as_view(), name="prescription_detail"),
    path("prescriptions/<int:pk>/set-primary/", PrescriptionSetPrimaryView.as_view(), name="prescription_set_primary"),

    # Напоминания о замене линз
    path("lens-reminders/", LensReminderListCreateView.as_view(), name="lens_reminder_list"),
    path("lens-reminders/active/", LensReminderActiveView.as_view(), name="lens_reminder_active"),
    path("lens-reminders/<int:pk>/", LensReminderDetailView.as_view(), name="lens_reminder_detail"),
    path("lens-reminders/<int:pk>/renew/", LensReminderRenewView.as_view(), name="lens_reminder_renew"),
]
