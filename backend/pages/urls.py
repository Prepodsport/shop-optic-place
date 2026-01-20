from django.urls import path
from .views import PageListView, PageRetrieveView

urlpatterns = [
    path("", PageListView.as_view(), name="pages-list"),
    path("<slug:slug>/", PageRetrieveView.as_view(), name="pages-detail"),
]
