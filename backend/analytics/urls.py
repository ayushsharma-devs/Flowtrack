from django.urls import path
from .views import OverallAnalyticsView, ProjectAnalyticsView

urlpatterns = [
    path('overview/', OverallAnalyticsView.as_view(), name='analytics_overview'),
]
