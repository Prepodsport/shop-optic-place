import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    RegisterSerializer, MeSerializer, PasswordChangeSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PrescriptionSerializer
)
from .models import PasswordResetToken, Prescription
from .throttling import AuthRateThrottle, RegisterRateThrottle

logger = logging.getLogger(__name__)
User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Регистрация нового пользователя"""
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """JWT авторизация с rate limiting"""
    throttle_classes = [AuthRateThrottle]


class ThrottledTokenRefreshView(TokenRefreshView):
    """Обновление JWT токена с rate limiting"""
    throttle_classes = [AuthRateThrottle]


class MeView(generics.RetrieveUpdateAPIView):
    """Профиль текущего пользователя"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """Смена пароля для авторизованного пользователя"""
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"detail": "Пароль успешно изменён"})


class LogoutView(APIView):
    """Выход из системы (инвалидация refresh токена)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"detail": "Вы успешно вышли из системы"})
        except Exception:
            return Response(
                {"detail": "Ошибка при выходе"},
                status=status.HTTP_400_BAD_REQUEST
            )


class PasswordResetRequestView(APIView):
    """Запрос на сброс пароля"""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()

        # Всегда возвращаем успех (защита от перебора email)
        success_message = {
            "detail": "Если указанный email зарегистрирован, вы получите письмо с инструкциями по сбросу пароля."
        }

        if not user:
            return Response(success_message)

        # Создаём токен
        reset_token = PasswordResetToken.create_for_user(user)

        # Формируем ссылку для сброса
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_url = f"{frontend_url}/reset-password?token={reset_token.token}"

        # Отправляем email
        try:
            subject = "Сброс пароля - OpticPlace"
            message = f"""
Здравствуйте!

Вы запросили сброс пароля для вашего аккаунта в OpticPlace.

Для сброса пароля перейдите по ссылке:
{reset_url}

Ссылка действительна в течение 24 часов.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

С уважением,
Команда OpticPlace
            """.strip()

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Password reset email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {e}")
            # Не раскрываем ошибку пользователю

        return Response(success_message)


class PasswordResetConfirmView(APIView):
    """Подтверждение сброса пароля"""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_str = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        # Ищем токен
        reset_token = PasswordResetToken.objects.filter(token=token_str).first()

        if not reset_token or not reset_token.is_valid():
            return Response(
                {"detail": "Недействительная или просроченная ссылка для сброса пароля"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Устанавливаем новый пароль
        user = reset_token.user
        user.set_password(new_password)
        user.save()

        # Помечаем токен как использованный
        reset_token.mark_used()

        logger.info(f"Password reset successful for {user.email}")

        return Response({"detail": "Пароль успешно изменён. Теперь вы можете войти с новым паролем."})


class PasswordResetValidateTokenView(APIView):
    """Проверка валидности токена сброса пароля"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_str = request.data.get("token", "")

        if not token_str:
            return Response(
                {"valid": False, "detail": "Токен не указан"},
                status=status.HTTP_400_BAD_REQUEST
            )

        reset_token = PasswordResetToken.objects.filter(token=token_str).first()

        if not reset_token or not reset_token.is_valid():
            return Response({
                "valid": False,
                "detail": "Недействительная или просроченная ссылка"
            })

        return Response({
            "valid": True,
            "email": reset_token.user.email
        })


class PrescriptionListCreateView(generics.ListCreateAPIView):
    """Список и создание рецептов пользователя"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        return Prescription.objects.filter(user=self.request.user)


class PrescriptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Просмотр, редактирование и удаление рецепта"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PrescriptionSerializer

    def get_queryset(self):
        return Prescription.objects.filter(user=self.request.user)


class PrescriptionSetPrimaryView(APIView):
    """Установка рецепта как основного"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            prescription = Prescription.objects.get(pk=pk, user=request.user)
        except Prescription.DoesNotExist:
            return Response(
                {"detail": "Рецепт не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        prescription.is_primary = True
        prescription.save()

        return Response(PrescriptionSerializer(prescription).data)
