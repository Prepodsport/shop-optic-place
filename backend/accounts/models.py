import secrets
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, email: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.is_active = True
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self.create_user(email=email, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField("Email",unique=True)
    first_name = models.CharField("Имя",max_length=80, blank=True)
    last_name = models.CharField("Фамилия",max_length=80, blank=True)
    phone = models.CharField("Телефон",max_length=32, blank=True)

    is_active = models.BooleanField("Активен",default=True)
    is_staff = models.BooleanField("Администратор",default=False)
    date_joined = models.DateTimeField("Дата регистрации",default=timezone.now)

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


class PasswordResetToken(models.Model):
    """Токен для сброса пароля"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
        verbose_name="Пользователь"
    )
    token = models.CharField("Токен", max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    used_at = models.DateTimeField("Использован", null=True, blank=True)
    expires_at = models.DateTimeField("Истекает")

    class Meta:
        verbose_name = "Токен сброса пароля"
        verbose_name_plural = "Токены сброса пароля"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_valid(self):
        """Проверяет, что токен валиден"""
        return self.used_at is None and self.expires_at > timezone.now()

    def mark_used(self):
        """Помечает токен как использованный"""
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @classmethod
    def create_for_user(cls, user):
        """Создаёт новый токен для пользователя"""
        # Инвалидируем старые токены
        cls.objects.filter(user=user, used_at__isnull=True).update(
            used_at=timezone.now()
        )
        return cls.objects.create(user=user)

    def __str__(self):
        return f"Reset token for {self.user.email}"


class Prescription(models.Model):
    """Оптический рецепт пользователя"""
    TYPE_GLASSES = "glasses"
    TYPE_CONTACTS = "contacts"
    PRESCRIPTION_TYPES = [
        (TYPE_GLASSES, "Очки"),
        (TYPE_CONTACTS, "Контактные линзы"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="prescriptions",
        verbose_name="Пользователь"
    )
    name = models.CharField(
        "Название",
        max_length=100,
        blank=True,
        help_text="Например: 'Основной рецепт', 'Для вождения'"
    )
    prescription_type = models.CharField(
        "Тип рецепта",
        max_length=20,
        choices=PRESCRIPTION_TYPES,
        default=TYPE_GLASSES
    )

    # Правый глаз (OD - Oculus Dexter)
    od_sph = models.DecimalField(
        "OD SPH (сфера)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Сфера правого глаза, от -20.00 до +20.00"
    )
    od_cyl = models.DecimalField(
        "OD CYL (цилиндр)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Цилиндр правого глаза для коррекции астигматизма"
    )
    od_axis = models.PositiveSmallIntegerField(
        "OD AXIS (ось)",
        null=True,
        blank=True,
        help_text="Ось цилиндра правого глаза, от 0 до 180 градусов"
    )
    od_add = models.DecimalField(
        "OD ADD (аддидация)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Аддидация для прогрессивных/бифокальных линз"
    )
    od_bc = models.DecimalField(
        "OD BC (базовая кривизна)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Базовая кривизна для контактных линз"
    )
    od_dia = models.DecimalField(
        "OD DIA (диаметр)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Диаметр контактной линзы"
    )

    # Левый глаз (OS - Oculus Sinister)
    os_sph = models.DecimalField(
        "OS SPH (сфера)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Сфера левого глаза, от -20.00 до +20.00"
    )
    os_cyl = models.DecimalField(
        "OS CYL (цилиндр)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Цилиндр левого глаза для коррекции астигматизма"
    )
    os_axis = models.PositiveSmallIntegerField(
        "OS AXIS (ось)",
        null=True,
        blank=True,
        help_text="Ось цилиндра левого глаза, от 0 до 180 градусов"
    )
    os_add = models.DecimalField(
        "OS ADD (аддидация)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Аддидация для прогрессивных/бифокальных линз"
    )
    os_bc = models.DecimalField(
        "OS BC (базовая кривизна)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Базовая кривизна для контактных линз"
    )
    os_dia = models.DecimalField(
        "OS DIA (диаметр)",
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Диаметр контактной линзы"
    )

    # Общие параметры
    pd = models.DecimalField(
        "PD (межзрачковое расстояние)",
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Расстояние между зрачками в мм"
    )
    pd_left = models.DecimalField(
        "PD левый",
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Полумежзрачковое расстояние слева"
    )
    pd_right = models.DecimalField(
        "PD правый",
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
        help_text="Полумежзрачковое расстояние справа"
    )

    # Дополнительная информация
    doctor_name = models.CharField(
        "Врач",
        max_length=200,
        blank=True,
        help_text="ФИО врача, выписавшего рецепт"
    )
    clinic_name = models.CharField(
        "Клиника",
        max_length=200,
        blank=True,
        help_text="Название клиники"
    )
    exam_date = models.DateField(
        "Дата осмотра",
        null=True,
        blank=True
    )
    expiry_date = models.DateField(
        "Срок действия",
        null=True,
        blank=True,
        help_text="Рецепт обычно действителен 1-2 года"
    )
    notes = models.TextField(
        "Примечания",
        blank=True
    )

    # Флаги
    is_primary = models.BooleanField(
        "Основной рецепт",
        default=False,
        help_text="Использовать по умолчанию при заказе"
    )

    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        verbose_name = "Рецепт"
        verbose_name_plural = "Рецепты"
        ordering = ["-is_primary", "-created_at"]

    def __str__(self):
        name = self.name or self.get_prescription_type_display()
        return f"{name} - {self.user.email}"

    def save(self, *args, **kwargs):
        # Если это основной рецепт, убираем флаг у других
        if self.is_primary:
            Prescription.objects.filter(
                user=self.user,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)

    def get_od_display(self):
        """Форматированное отображение правого глаза"""
        parts = []
        if self.od_sph is not None:
            parts.append(f"SPH {self.od_sph:+.2f}")
        if self.od_cyl is not None:
            parts.append(f"CYL {self.od_cyl:+.2f}")
        if self.od_axis is not None:
            parts.append(f"AXIS {self.od_axis}°")
        return " ".join(parts) if parts else "—"

    def get_os_display(self):
        """Форматированное отображение левого глаза"""
        parts = []
        if self.os_sph is not None:
            parts.append(f"SPH {self.os_sph:+.2f}")
        if self.os_cyl is not None:
            parts.append(f"CYL {self.os_cyl:+.2f}")
        if self.os_axis is not None:
            parts.append(f"AXIS {self.os_axis}°")
        return " ".join(parts) if parts else "—"

    def is_expired(self):
        """Проверяет, истёк ли срок действия рецепта"""
        if not self.expiry_date:
            return False
        return self.expiry_date < timezone.now().date()


class LensReminder(models.Model):
    """Напоминание о замене линз"""
    TYPE_DAILY = "daily"
    TYPE_WEEKLY = "weekly"
    TYPE_BIWEEKLY = "biweekly"
    TYPE_MONTHLY = "monthly"
    TYPE_QUARTERLY = "quarterly"
    TYPE_CUSTOM = "custom"

    LENS_TYPES = [
        (TYPE_DAILY, "Однодневные"),
        (TYPE_WEEKLY, "Недельные"),
        (TYPE_BIWEEKLY, "Двухнедельные"),
        (TYPE_MONTHLY, "Месячные"),
        (TYPE_QUARTERLY, "Квартальные"),
        (TYPE_CUSTOM, "Свой срок"),
    ]

    # Количество дней для каждого типа
    TYPE_DAYS = {
        TYPE_DAILY: 1,
        TYPE_WEEKLY: 7,
        TYPE_BIWEEKLY: 14,
        TYPE_MONTHLY: 30,
        TYPE_QUARTERLY: 90,
    }

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="lens_reminders",
        verbose_name="Пользователь"
    )
    name = models.CharField(
        "Название",
        max_length=100,
        help_text="Например: 'Acuvue Oasys', 'Основные линзы'"
    )
    lens_type = models.CharField(
        "Тип линз",
        max_length=20,
        choices=LENS_TYPES,
        default=TYPE_MONTHLY
    )
    custom_days = models.PositiveIntegerField(
        "Свой срок (дней)",
        null=True,
        blank=True,
        help_text="Укажите количество дней, если выбран свой срок"
    )
    start_date = models.DateField(
        "Дата начала ношения",
        help_text="Когда вы начали носить эту пару линз"
    )
    notify_days_before = models.PositiveSmallIntegerField(
        "Напоминать за (дней)",
        default=1,
        help_text="За сколько дней до замены напомнить"
    )
    is_active = models.BooleanField(
        "Активно",
        default=True
    )
    notes = models.TextField(
        "Примечания",
        blank=True
    )

    created_at = models.DateTimeField("Создано", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)

    class Meta:
        verbose_name = "Напоминание о замене линз"
        verbose_name_plural = "Напоминания о замене линз"
        ordering = ["start_date"]

    def __str__(self):
        return f"{self.name} - {self.user.email}"

    @property
    def replacement_days(self):
        """Количество дней до замены"""
        if self.lens_type == self.TYPE_CUSTOM:
            return self.custom_days or 30
        return self.TYPE_DAYS.get(self.lens_type, 30)

    @property
    def replacement_date(self):
        """Дата замены линз"""
        return self.start_date + timedelta(days=self.replacement_days)

    @property
    def days_until_replacement(self):
        """Дней до замены"""
        today = timezone.now().date()
        delta = self.replacement_date - today
        return delta.days

    @property
    def is_overdue(self):
        """Просрочено ли напоминание"""
        return self.days_until_replacement < 0

    @property
    def needs_reminder(self):
        """Пора ли отправить напоминание"""
        days = self.days_until_replacement
        return days <= self.notify_days_before and days >= 0

    @property
    def status(self):
        """Статус напоминания"""
        days = self.days_until_replacement
        if days < 0:
            return "overdue"
        elif days == 0:
            return "today"
        elif days <= self.notify_days_before:
            return "soon"
        else:
            return "ok"

    def renew(self, new_start_date=None):
        """Обновить напоминание (начать новый период)"""
        self.start_date = new_start_date or timezone.now().date()
        self.save(update_fields=["start_date", "updated_at"])
