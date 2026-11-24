from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from activity.services import log_activity
from .models import ProjectMember, ProjectInvitation
from .permissions import is_project_accessible, can_manage_members, get_user_role
from .serializers import (
    ProjectMemberSerializer,
    InviteSerializer,
    InvitationSerializer,
    AcceptInviteSerializer,
    UpdateMemberRoleSerializer,
)


class ProjectMemberListView(generics.ListAPIView):
    """
    GET  /api/members/projects/<project_id>/members/
    Lists all members of a project. Accessible by project owner and members.
    """
    serializer_class = ProjectMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project = get_object_or_404(Project, id=self.kwargs['project_id'])
        if not is_project_accessible(self.request.user, project):
            return ProjectMember.objects.none()
        return ProjectMember.objects.filter(project=project).select_related('user')

    def list(self, request, *args, **kwargs):
        project = get_object_or_404(Project, id=self.kwargs['project_id'])
        if not is_project_accessible(request.user, project):
            return Response(
                {'detail': 'You do not have access to this project.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().list(request, *args, **kwargs)


class InviteToProjectView(APIView):
    """
    POST /api/members/projects/<project_id>/invite/
    Invite a user to a project by email. Only owner and admins can invite.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)

        if not can_manage_members(request.user, project):
            return Response(
                {'detail': 'You do not have permission to invite members.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = InviteSerializer(
            data=request.data,
            context={'request': request, 'project': project},
        )
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        role = serializer.validated_data['role']

        invitation = ProjectInvitation.objects.create(
            project=project,
            invited_by=request.user,
            email=email,
            role=role,
            token=ProjectInvitation.generate_token(),
        )

        # Build invite link
        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invite_link = f"{frontend_base}/invitations/accept?token={invitation.token}"

        # Send email (best-effort, don't fail the request)
        try:
            send_mail(
                subject=f"You've been invited to join '{project.title}' on FlowTrack",
                message=(
                    f"Hi,\n\n"
                    f"{request.user.username} has invited you to collaborate on "
                    f"the project \"{project.title}\" as {role}.\n\n"
                    f"Click the link below to accept the invitation:\n"
                    f"{invite_link}\n\n"
                    f"This invitation expires in 7 days.\n\n"
                    f"— FlowTrack"
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@flowtrack.app'),
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass  # Email delivery failure should not block invitation creation

        log_activity(
            project=project,
            user=request.user,
            action='member_invited',
            description=f"Invited {email} as {role}",
            entity_type='member',
            entity_id=invitation.id,
        )

        return Response(
            InvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class RemoveMemberView(APIView):
    """
    DELETE /api/members/projects/<project_id>/members/<member_id>/
    Remove a member from a project. Owner + admins can remove.
    Admins cannot remove the owner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, project_id, member_id):
        project = get_object_or_404(Project, id=project_id)
        member = get_object_or_404(ProjectMember, id=member_id, project=project)

        if not can_manage_members(request.user, project):
            return Response(
                {'detail': 'You do not have permission to remove members.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Admins cannot remove the project owner (owner is not in members table,
        # but guard against edge cases)
        if member.user_id == project.owner_id:
            return Response(
                {'detail': 'The project owner cannot be removed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # An admin cannot remove another admin — only owner can
        user_role = get_user_role(request.user, project)
        if user_role == 'admin' and member.role == ProjectMember.ROLE_ADMIN:
            return Response(
                {'detail': 'Only the project owner can remove admins.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        username = member.user.username
        member.delete()

        log_activity(
            project=project,
            user=request.user,
            action='member_removed',
            description=f"Removed {username} from the project",
            entity_type='member',
            entity_id=member_id,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class UpdateMemberRoleView(APIView):
    """
    PATCH /api/members/projects/<project_id>/members/<member_id>/role/
    Change a member's role. Only the project owner can change roles.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, project_id, member_id):
        project = get_object_or_404(Project, id=project_id)

        if project.owner_id != request.user.id:
            return Response(
                {'detail': 'Only the project owner can change member roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        member = get_object_or_404(ProjectMember, id=member_id, project=project)

        serializer = UpdateMemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_role = member.role
        new_role = serializer.validated_data['role']
        member.role = new_role
        member.save(update_fields=['role'])

        log_activity(
            project=project,
            user=request.user,
            action='member_role_changed',
            description=f"Changed {member.user.username}'s role from {old_role} to {new_role}",
            entity_type='member',
            entity_id=member.id,
        )

        return Response(ProjectMemberSerializer(member).data)


class MyInvitationsView(generics.ListAPIView):
    """
    GET /api/members/invitations/
    Lists pending invitations for the current authenticated user (matched by email).
    """
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProjectInvitation.objects.filter(
            email__iexact=self.request.user.email,
            status=ProjectInvitation.STATUS_PENDING,
        ).select_related('project', 'invited_by')


class AcceptInviteView(APIView):
    """
    POST /api/members/invitations/accept/
    Accept an invitation using a token. User must be authenticated.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invitation = serializer.invitation
        member = invitation.accept(request.user)

        log_activity(
            project=invitation.project,
            user=request.user,
            action='member_joined',
            description=f"{request.user.username} joined the project as {invitation.role}",
            entity_type='member',
            entity_id=member.id,
        )

        return Response(
            {
                'detail': 'Invitation accepted successfully.',
                'project_id': invitation.project_id,
                'role': invitation.role,
            },
            status=status.HTTP_200_OK,
        )


class DeclineInviteView(APIView):
    """
    POST /api/members/invitations/<token>/decline/
    Decline an invitation by token. User must be authenticated.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, token):
        invitation = get_object_or_404(ProjectInvitation, token=token)

        if invitation.status != ProjectInvitation.STATUS_PENDING:
            return Response(
                {'detail': f'This invitation has already been {invitation.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invitation.is_expired:
            invitation.status = ProjectInvitation.STATUS_EXPIRED
            invitation.save(update_fields=['status'])
            return Response(
                {'detail': 'This invitation has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = ProjectInvitation.STATUS_DECLINED
        invitation.save(update_fields=['status'])

        return Response({'detail': 'Invitation declined.'}, status=status.HTTP_200_OK)


class LeaveProjectView(APIView):
    """
    POST /api/members/projects/<project_id>/leave/
    Lets a member leave a project voluntarily. The owner cannot leave.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)

        if project.owner_id == request.user.id:
            return Response(
                {'detail': 'The project owner cannot leave the project. Transfer ownership or delete it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member = ProjectMember.objects.filter(project=project, user=request.user).first()
        if not member:
            return Response(
                {'detail': 'You are not a member of this project.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        member.delete()

        log_activity(
            project=project,
            user=request.user,
            action='member_left',
            description=f"{request.user.username} left the project",
            entity_type='member',
        )

        return Response({'detail': 'You have left the project.'}, status=status.HTTP_200_OK)
