import pytest
from django.contrib.auth.models import User
from projects.models import Project
from tasks.models import Task
from members.models import ProjectMember, ProjectInvitation
from members.permissions import (
    get_user_role,
    is_project_accessible,
    can_edit_project,
    can_manage_members,
)


@pytest.mark.django_db
class TestCollaboration:
    def setup_method(self):
        self.owner = User.objects.create_user(username='alice', email='alice@example.com', password='password123')
        self.admin_user = User.objects.create_user(username='bob', email='bob@example.com', password='password123')
        self.editor_user = User.objects.create_user(username='charlie', email='charlie@example.com', password='password123')
        self.viewer_user = User.objects.create_user(username='david', email='david@example.com', password='password123')
        self.outsider = User.objects.create_user(username='eve', email='eve@example.com', password='password123')

        self.project = Project.objects.create(
            owner=self.owner,
            title='FlowTrack Cloud'
        )

        ProjectMember.objects.create(project=self.project, user=self.admin_user, role='admin')
        ProjectMember.objects.create(project=self.project, user=self.editor_user, role='editor')
        ProjectMember.objects.create(project=self.project, user=self.viewer_user, role='viewer')

    def test_permission_roles(self):
        assert get_user_role(self.owner, self.project) == 'owner'
        assert get_user_role(self.admin_user, self.project) == 'admin'
        assert get_user_role(self.editor_user, self.project) == 'editor'
        assert get_user_role(self.viewer_user, self.project) == 'viewer'
        assert get_user_role(self.outsider, self.project) is None

    def test_project_accessibility(self):
        assert is_project_accessible(self.owner, self.project) is True
        assert is_project_accessible(self.admin_user, self.project) is True
        assert is_project_accessible(self.editor_user, self.project) is True
        assert is_project_accessible(self.viewer_user, self.project) is True
        assert is_project_accessible(self.outsider, self.project) is False

    def test_can_edit_project(self):
        assert can_edit_project(self.owner, self.project) is True
        assert can_edit_project(self.admin_user, self.project) is True
        assert can_edit_project(self.editor_user, self.project) is True
        assert can_edit_project(self.viewer_user, self.project) is False
        assert can_edit_project(self.outsider, self.project) is False

    def test_can_manage_members(self):
        assert can_manage_members(self.owner, self.project) is True
        assert can_manage_members(self.admin_user, self.project) is True
        assert can_manage_members(self.editor_user, self.project) is False
        assert can_manage_members(self.viewer_user, self.project) is False

    def test_invitation_acceptance(self):
        invitation = ProjectInvitation.objects.create(
            project=self.project,
            invited_by=self.owner,
            email=self.outsider.email,
            role='editor',
            token=ProjectInvitation.generate_token(),
        )
        assert invitation.status == 'pending'
        assert not invitation.is_expired

        member = invitation.accept(self.outsider)
        invitation.refresh_from_db()

        assert invitation.status == 'accepted'
        assert member.role == 'editor'
        assert member.user == self.outsider
        assert is_project_accessible(self.outsider, self.project) is True
