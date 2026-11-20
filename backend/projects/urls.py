from django.urls import path
from .views import ProjectListCreateView, ProjectDetailView
from tasks.views import ProjectTaskListCreateView
from dependencies.views import ProjectGraphView
from analytics.views import ProjectAnalyticsView
from activity.views import ProjectActivityListView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project_list_create'),
    path('<int:id>/', ProjectDetailView.as_view(), name='project_detail'),
    path('<int:project_id>/tasks/', ProjectTaskListCreateView.as_view(), name='project_tasks'),
    path('<int:project_id>/graph/', ProjectGraphView.as_view(), name='project_graph'),
    path('<int:project_id>/analytics/', ProjectAnalyticsView.as_view(), name='project_analytics'),
    path('<int:project_id>/activity/', ProjectActivityListView.as_view(), name='project_activity'),
]
