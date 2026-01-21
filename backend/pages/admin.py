from unfold.admin import ModelAdmin, TabularInline
from django.contrib import admin
from .models import Page, PageSection


class PageSectionInline(TabularInline):
    model = PageSection
    extra = 1
    fields = ("order", "is_active", "heading", "body", "bullets")
    ordering = ("order", "id")
    show_change_link = True


@admin.register(Page)
class PageAdmin(ModelAdmin):
    list_display = ("slug", "title", "is_published", "updated_at")
    list_filter = ("is_published",)
    search_fields = ("slug", "title")
    inlines = [PageSectionInline]


@admin.register(PageSection)
class PageSectionAdmin(ModelAdmin):
    list_display = ("page", "order", "is_active", "heading")
    list_filter = ("is_active", "page")
    search_fields = ("page__slug", "heading", "body")
    ordering = ("page", "order", "id")
