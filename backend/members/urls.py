from django.urls import path
from . import views

urlpatterns = [
    # Project members
    path('projects/<int:project_id>/members/', views.ProjectMemberListView.as_view(), name='project-member-list'),
    path('projects/<int:project_id>/invite/', views.InviteToProjectView.as_view(), name='project-invite'),
    path('projects/<int:project_id>/members/<int:member_id>/', views.RemoveMemberView.as_view(), name='project-member-remove'),
    path('projects/<int:project_id>/members/<int:member_id>/role/', views.UpdateMemberRoleView.as_view(), name='project-member-role'),
    path('projects/<int:project_id>/leave/', views.LeaveProjectView.as_view(), name='project-leave'),

    # Invitations
    path('invitations/', views.MyInvitationsView.as_view(), name='my-invitations'),
    path('invitations/accept/', views.AcceptInviteView.as_view(), name='accept-invitation'),
    path('invitations/<str:token>/decline/', views.DeclineInviteView.as_view(), name='decline-invitation'),
]
