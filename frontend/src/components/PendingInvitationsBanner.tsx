'use client';

import React, { useState, useEffect } from 'react';
import { ProjectInvitation } from '@/types';
import { membersApi } from '@/services/api';
import { Mail, Check, X, Shield, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PendingInvitationsBannerProps {
  onInvitationHandled?: () => void;
}

export function PendingInvitationsBanner({ onInvitationHandled }: PendingInvitationsBannerProps) {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingToken, setActionLoadingToken] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await membersApi.getMyInvitations();
      setInvitations(res.data);
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitation: ProjectInvitation) => {
    const token = (invitation as any).token || (invitation as any).id;
    try {
      setActionLoadingToken(invitation.email + invitation.project.id);
      await membersApi.acceptInvite((invitation as any).token);
      fetchInvitations();
      if (onInvitationHandled) onInvitationHandled();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to accept invitation.');
    } finally {
      setActionLoadingToken(null);
    }
  };

  const handleDecline = async (invitation: ProjectInvitation) => {
    try {
      setActionLoadingToken(invitation.email + invitation.project.id);
      await membersApi.declineInvite((invitation as any).token);
      fetchInvitations();
      if (onInvitationHandled) onInvitationHandled();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to decline invitation.');
    } finally {
      setActionLoadingToken(null);
    }
  };

  if (loading || invitations.length === 0) return null;

  return (
    <div className="space-y-3">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white">Project Invitation</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {inv.role}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                <strong className="text-white font-medium">{inv.invited_by}</strong> invited you to
                collaborate on <span className="text-indigo-300 font-semibold">{inv.project.title}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              disabled={actionLoadingToken === inv.email + inv.project.id}
              onClick={() => handleAccept(inv)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
            >
              <Check className="w-3.5 h-3.5" />
              Accept & Join
            </button>
            <button
              disabled={actionLoadingToken === inv.email + inv.project.id}
              onClick={() => handleDecline(inv)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
