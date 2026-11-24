from django.contrib import admin
from .models import ProjectMember, ProjectInvitation


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'role', 'joined_at')
    list_filter = ('role',)
    search_fields = ('user__username', 'project__title')


@admin.register(ProjectInvitation)
class ProjectInvitationAdmin(admin.ModelAdmin):
    list_display = ('email', 'project', 'role', 'status', 'created_at', 'expires_at')
    list_filter = ('status', 'role')
    search_fields = ('email', 'project__title')
    readonly_fields = ('token',)
