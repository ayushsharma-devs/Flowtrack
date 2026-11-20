from django.urls import path
from .views import RecentActivityListView

urlpatterns = [
    path('', RecentActivityListView.as_view(), name='activity_recent'),
]
