from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ProjectMember, ProjectInvitation


class MemberUserSerializer(serializers.ModelSerializer):
    """Nested read-only user representation for member listings."""

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = fields


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = MemberUserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ProjectMember
        fields = ('id', 'user', 'user_id', 'role', 'joined_at')
        read_only_fields = ('id', 'joined_at')


class InviteSerializer(serializers.Serializer):
    """Validates an invitation request."""
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=ProjectMember.ROLE_CHOICES,
        default=ProjectMember.ROLE_VIEWER,
    )

    def validate_email(self, value):
        return value.lower().strip()

    def validate(self, attrs):
        request = self.context.get('request')
        project = self.context.get('project')
        email = attrs['email']

        # Can't invite yourself
        if request and request.user.email and request.user.email.lower() == email:
            raise serializers.ValidationError(
                {'email': 'You cannot invite yourself to a project.'}
            )

        # Can't invite someone who is already a member
        if project:
            existing_member = User.objects.filter(email__iexact=email).first()
            if existing_member:
                if project.owner_id == existing_member.id:
                    raise serializers.ValidationError(
                        {'email': 'This user is the project owner.'}
                    )
                if ProjectMember.objects.filter(project=project, user=existing_member).exists():
                    raise serializers.ValidationError(
                        {'email': 'This user is already a member of this project.'}
                    )

            # Can't invite if a pending invitation already exists for this email+project
            if ProjectInvitation.objects.filter(
                project=project,
                email__iexact=email,
                status=ProjectInvitation.STATUS_PENDING,
            ).exists():
                raise serializers.ValidationError(
                    {'email': 'A pending invitation already exists for this email.'}
                )

        return attrs


class InvitationProjectSerializer(serializers.Serializer):
    """Minimal project info for invitation listings."""
    id = serializers.IntegerField()
    title = serializers.CharField()


class InvitationSerializer(serializers.ModelSerializer):
    project = InvitationProjectSerializer(read_only=True)
    invited_by = serializers.CharField(source='invited_by.username', read_only=True)

    class Meta:
        model = ProjectInvitation
        fields = (
            'id', 'project', 'invited_by', 'email',
            'role', 'status', 'created_at', 'expires_at',
        )
        read_only_fields = fields


class AcceptInviteSerializer(serializers.Serializer):
    """Validates a token-based invitation acceptance."""
    token = serializers.CharField(max_length=64)

    def validate_token(self, value):
        try:
            invitation = ProjectInvitation.objects.select_related('project').get(token=value)
        except ProjectInvitation.DoesNotExist:
            raise serializers.ValidationError('Invalid invitation token.')

        if invitation.status != ProjectInvitation.STATUS_PENDING:
            raise serializers.ValidationError(
                f'This invitation has already been {invitation.status}.'
            )

        if invitation.is_expired:
            invitation.status = ProjectInvitation.STATUS_EXPIRED
            invitation.save(update_fields=['status'])
            raise serializers.ValidationError('This invitation has expired.')

        self.invitation = invitation
        return value


class UpdateMemberRoleSerializer(serializers.Serializer):
    """Validates role update for a project member."""
    role = serializers.ChoiceField(choices=ProjectMember.ROLE_CHOICES)
