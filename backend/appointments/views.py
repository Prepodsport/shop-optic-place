from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.conf import settings
from .models import Appointment
from .serializers import AppointmentCreateSerializer, AppointmentSerializer
from integrations.bitrix24 import Bitrix24Client


class AppointmentCreateView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AppointmentCreateSerializer

    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data

        appt = Appointment.objects.create(
            user=request.user if request.user.is_authenticated else None,
            **data,
        )

        client = Bitrix24Client(settings.BITRIX24_WEBHOOK_URL)

        try:
            title = f"Запись: {appt.get_service_type_display()} {appt.desired_datetime}"
            resp = client.create_lead(
                title=title,
                name=appt.full_name,
                phone=appt.phone,
                email=appt.email,
                comment=appt.comment,
            )
            appt.status = Appointment.STATUS_SENT if resp else Appointment.STATUS_NEW
            appt.bitrix_raw = resp
            appt.save(update_fields=["status", "bitrix_raw"])
        except Exception as e:
            appt.status = Appointment.STATUS_FAILED
            appt.bitrix_raw = {"error": str(e)}
            appt.save(update_fields=["status", "bitrix_raw"])

        return Response(AppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)
