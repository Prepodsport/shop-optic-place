from django.core.management.base import BaseCommand
from pages.models import Page, PageSection


ABOUT_SECTIONS = [
    {
        "order": 10,
        "heading": "Кто мы",
        "body": (
            "OpticPlace — это современный интернет-магазин оптики, который помогает людям\n"
            "видеть мир ярче и чётче. Мы работаем с 2015 года и за это время помогли\n"
            "тысячам клиентов подобрать идеальные очки и контактные линзы."
        ),
        "bullets": "",
    },
    {
        "order": 20,
        "heading": "Наша миссия",
        "body": (
            "Мы стремимся сделать качественную оптику доступной для каждого.\n"
            "Наша команда офтальмологов и оптометристов поможет подобрать оптимальное\n"
            "решение для вашего зрения."
        ),
        "bullets": "",
    },
    {
        "order": 30,
        "heading": "Почему выбирают нас",
        "body": "",
        "bullets": "\n".join(
            [
                "Только сертифицированная продукция от ведущих брендов",
                "Бесплатная консультация специалистов",
                "Быстрая доставка по всей России",
                "Гарантия качества на все товары",
                "Выгодные цены и регулярные акции",
            ]
        ),
    },
    {
        "order": 40,
        "heading": "Наши бренды",
        "body": (
            "Мы сотрудничаем с ведущими мировыми производителями оптики:\n"
            "Acuvue, Bausch & Lomb, CooperVision, Ray-Ban, Oakley, Essilor и многими другими."
        ),
        "bullets": "",
    },
]


class Command(BaseCommand):
    help = "Создаёт стартовые CMS-страницы (about и т.п.)"

    def handle(self, *args, **options):
        page, created = Page.objects.get_or_create(
            slug="about",
            defaults={"title": "О компании OpticPlace", "is_published": True},
        )

        if not created:
            page.title = "О компании OpticPlace"
            page.is_published = True
            page.save(update_fields=["title", "is_published"])

        PageSection.objects.filter(page=page).delete()

        for s in ABOUT_SECTIONS:
            PageSection.objects.create(
                page=page,
                order=s["order"],
                heading=s.get("heading", ""),
                body=s.get("body", ""),
                bullets=s.get("bullets", ""),
                is_active=True,
            )

        self.stdout.write(self.style.SUCCESS("CMS page 'about' создана/обновлена"))
