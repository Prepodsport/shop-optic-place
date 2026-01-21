from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Prescription

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "password", "password_confirm", "first_name", "last_name", "phone")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует")
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Пароли не совпадают"})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "phone", "date_joined")
        read_only_fields = ("id", "email", "date_joined")

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.phone = validated_data.get("phone", instance.phone)
        instance.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Неверный текущий пароль")
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Пароли не совпадают"})
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "Новый пароль должен отличаться от текущего"})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Запрос на сброс пароля"""
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Подтверждение сброса пароля"""
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Пароли не совпадают"})
        return attrs


class PrescriptionSerializer(serializers.ModelSerializer):
    """Сериализатор рецепта"""
    od_display = serializers.CharField(source="get_od_display", read_only=True)
    os_display = serializers.CharField(source="get_os_display", read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    prescription_type_display = serializers.CharField(
        source="get_prescription_type_display",
        read_only=True
    )

    class Meta:
        model = Prescription
        fields = [
            "id", "name", "prescription_type", "prescription_type_display",
            # Правый глаз
            "od_sph", "od_cyl", "od_axis", "od_add", "od_bc", "od_dia",
            # Левый глаз
            "os_sph", "os_cyl", "os_axis", "os_add", "os_bc", "os_dia",
            # Общие
            "pd", "pd_left", "pd_right",
            # Информация
            "doctor_name", "clinic_name", "exam_date", "expiry_date", "notes",
            # Флаги
            "is_primary", "is_expired",
            # Отображение
            "od_display", "os_display",
            # Даты
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_od_axis(self, value):
        if value is not None and (value < 0 or value > 180):
            raise serializers.ValidationError("Ось должна быть от 0 до 180 градусов")
        return value

    def validate_os_axis(self, value):
        if value is not None and (value < 0 or value > 180):
            raise serializers.ValidationError("Ось должна быть от 0 до 180 градусов")
        return value

    def validate(self, attrs):
        # Проверяем что хотя бы одно значение SPH указано
        od_sph = attrs.get("od_sph")
        os_sph = attrs.get("os_sph")
        if od_sph is None and os_sph is None:
            raise serializers.ValidationError(
                "Необходимо указать SPH хотя бы для одного глаза"
            )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
