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
