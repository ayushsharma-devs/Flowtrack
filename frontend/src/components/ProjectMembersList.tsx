'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ProjectMember, MemberRole } from '@/types';
import { membersApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  MoreVertical,
  Plus,
  LogOut,
  Crown,
  Edit2,
  Eye,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface ProjectMembersListProps {
  projectId: number;
  projectOwnerId: number;
  currentUserRole?: MemberRole;
  onOpenInviteModal: () => void;
  onProjectUpdated?: () => void;
}

export function ProjectMembersList({
  projectId,
  projectOwnerId,
  currentUserRole,
  onOpenInviteModal,
  onProjectUpdated,
}: ProjectMembersListProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await membersApi.list(projectId);
      setMembers(res.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const isOwner = currentUserRole === 'owner' || user?.id === projectOwnerId;
  const canManage = isOwner || currentUserRole === 'admin';

  const handleRoleChange = async (memberId: number, newRole: MemberRole) => {
    try {
      setActionLoadingId(memberId);
      setActionError(null);
      await membersApi.updateRole(projectId, memberId, newRole);
      fetchMembers();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to update member role.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    const confirmRemove = window.confirm(
      `Are you sure you want to remove ${member.user.username} from this project?`
    );
    if (!confirmRemove) return;

    try {
      setActionLoadingId(member.id);
      setActionError(null);
      await membersApi.remove(projectId, member.id);
      fetchMembers();
      if (onProjectUpdated) onProjectUpdated();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to remove member.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLeaveProject = async () => {
    const confirmLeave = window.confirm('Are you sure you want to leave this project?');
    if (!confirmLeave) return;

    try {
      await membersApi.leave(projectId);
      window.location.href = '/projects';
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to leave project.');
    }
  };

  const getRoleBadge = (role: MemberRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="w-3 h-3" />
            Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Edit2 className="w-3 h-3" />
            Editor
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Eye className="w-3 h-3" />
            Viewer
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-[#111726] border border-slate-800 p-4 rounded-2xl shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            Project Collaborators & Access Control
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage teammates who have access to keep track of this project and collaborate on tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={onOpenInviteModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Invite Member
            </button>
          )}

          {!isOwner && (
            <button
              onClick={handleLeaveProject}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Project
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-[11px] underline hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Members table */}
      {loading ? (
        <div className="bg-[#111726] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-xs">Loading collaborators...</span>
        </div>
      ) : (
        <div className="bg-[#111726] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {members.map((member) => {
              const isMemberOwner = member.role === 'owner';
              const isCurrentUser = member.user.id === user?.id;

              return (
                <div
                  key={member.id ?? `user-${member.user.id}`}
                  className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Avatar & User details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-sm shrink-0">
                      {member.user.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {member.user.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                            You
                          </span>
                        )}
                        {getRoleBadge(member.role)}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span className="truncate">{member.user.email}</span>
                        {member.joined_at && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Role modification & actions */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {/* Role changer dropdown (only project owner can change roles, cannot change own role) */}
                    {isOwner && !isMemberOwner && member.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">Role:</span>
                        <select
                          disabled={actionLoadingId === member.id}
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value as MemberRole)
                          }
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    )}

                    {/* Remove button */}
                    {canManage && !isMemberOwner && !isCurrentUser && member.id && (
                      <button
                        disabled={actionLoadingId === member.id}
                        onClick={() => handleRemoveMember(member)}
                        title="Remove member"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
