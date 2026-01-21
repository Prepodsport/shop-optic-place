from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
import re
from .models import Appointment


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ("service_type", "desired_datetime", "full_name", "phone", "email", "comment")

    def validate_desired_datetime(self, value):
        now = timezone.now()

        # Нельзя записаться в прошлое
        if value < now:
            raise serializers.ValidationError("Нельзя записаться на прошедшую дату")

        # Нельзя записаться раньше чем через 1 час
        if value < now + timedelta(hours=1):
            raise serializers.ValidationError("Запись возможна минимум за 1 час до приёма")

        # Нельзя записаться более чем на 3 месяца вперёд
        if value > now + timedelta(days=90):
            raise serializers.ValidationError("Запись возможна не более чем на 3 месяца вперёд")

        # Проверка рабочего времени (9:00 - 20:00)
        if value.hour < 9 or value.hour >= 20:
            raise serializers.ValidationError("Приём возможен только с 9:00 до 20:00")

        # Проверка рабочих дней (пн-сб, воскресенье выходной)
        if value.weekday() == 6:  # Воскресенье
            raise serializers.ValidationError("В воскресенье приём не ведётся")

        return value

    def validate_phone(self, value):
        # Убираем всё кроме цифр и +
        cleaned = re.sub(r'[^\d+]', '', value)

        # Проверяем формат
        if not re.match(r'^\+?[78]\d{10}$', cleaned):
            raise serializers.ValidationError(
                "Введите корректный номер телефона (например: +79001234567)"
            )

        return cleaned

    def validate_email(self, value):
        return value.lower().strip()

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Имя слишком короткое")
        if len(value.split()) < 2:
            raise serializers.ValidationError("Укажите имя и фамилию")
        return value

    def validate(self, attrs):
        # Проверка на дубликат записи
        email = attrs.get("email")
        phone = attrs.get("phone")
        desired_datetime = attrs.get("desired_datetime")

        # Проверяем нет ли уже записи на это время
        existing = Appointment.objects.filter(
            desired_datetime=desired_datetime,
            status__in=[Appointment.STATUS_NEW, Appointment.STATUS_SENT]
        ).exists()

        if existing:
            raise serializers.ValidationError({
                "desired_datetime": "На это время уже есть запись. Выберите другое время."
            })

        # Проверяем нет ли записи от этого пользователя на ближайшие 24 часа
        now = timezone.now()
        recent_booking = Appointment.objects.filter(
            email__iexact=email,
            created_at__gte=now - timedelta(hours=24),
            status__in=[Appointment.STATUS_NEW, Appointment.STATUS_SENT]
        ).exists()

        if recent_booking:
            raise serializers.ValidationError(
                "Вы уже записались на приём в течение последних 24 часов. "
                "Для изменения записи свяжитесь с нами по телефону."
            )

        return attrs


class AppointmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id", "service_type", "service_type_display",
            "desired_datetime", "full_name", "phone", "email", "comment",
            "status", "status_display", "created_at"
        )
