from django.urls import path
from .views import DependencyCreateView, DependencyDeleteView

urlpatterns = [
    path('', DependencyCreateView.as_view(), name='dependency_create'),
    path('<int:id>/', DependencyDeleteView.as_view(), name='dependency_delete'),
]
