from rest_framework import serializers
from .models import Page, PageSection


class PageSectionSerializer(serializers.ModelSerializer):
    bullets = serializers.SerializerMethodField()

    class Meta:
        model = PageSection
        fields = ("order", "heading", "body", "bullets")

    def get_bullets(self, obj: PageSection):
        lines = (obj.bullets or "").splitlines()
        return [ln.strip() for ln in lines if ln.strip()]


class PageSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = ("slug", "title", "updated_at", "sections")

    def get_sections(self, obj: Page):
        qs = obj.sections.filter(is_active=True).order_by("order", "id")
        return PageSectionSerializer(qs, many=True, context=self.context).data
