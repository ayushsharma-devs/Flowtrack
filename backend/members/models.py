import secrets
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class ProjectMember(models.Model):
    ROLE_ADMIN = 'admin'
    ROLE_EDITOR = 'editor'
    ROLE_VIEWER = 'viewer'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_EDITOR, 'Editor'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='members',
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='project_memberships',
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} - {self.project.title} ({self.role})"


def _default_expires_at():
    return timezone.now() + timedelta(days=7)


class ProjectInvitation(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_EXPIRED = 'expired'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    ROLE_CHOICES = ProjectMember.ROLE_CHOICES

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='invitations',
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations',
    )
    email = models.EmailField()
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ProjectMember.ROLE_VIEWER)
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_expires_at)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation to {self.email} for {self.project.title} ({self.status})"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def accept(self, user):
        """Accept this invitation and create the corresponding ProjectMember."""
        member, created = ProjectMember.objects.get_or_create(
            project=self.project,
            user=user,
            defaults={'role': self.role},
        )
        if not created:
            # User is already a member; update role if needed
            member.role = self.role
            member.save(update_fields=['role'])

        self.status = self.STATUS_ACCEPTED
        self.accepted_at = timezone.now()
        self.save(update_fields=['status', 'accepted_at'])
        return member

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(48)
