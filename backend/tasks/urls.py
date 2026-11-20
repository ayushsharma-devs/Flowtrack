from django.urls import path
from .views import TaskDetailView

urlpatterns = [
    path('<int:id>/', TaskDetailView.as_view(), name='task_detail'),
]
