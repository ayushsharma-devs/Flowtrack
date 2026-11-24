from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/dependencies/', include('dependencies.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/activity/', include('activity.urls')),
    path('api/members/', include('members.urls')),
]
