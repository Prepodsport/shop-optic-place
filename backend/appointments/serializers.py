from rest_framework import serializers
from .models import Appointment


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ("service_type", "desired_datetime", "full_name", "phone", "email", "comment")


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ("id", "service_type", "desired_datetime", "full_name", "phone", "email", "comment", "status", "created_at")
