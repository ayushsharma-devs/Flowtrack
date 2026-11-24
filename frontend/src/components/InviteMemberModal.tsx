'use client';

import React, { useState } from 'react';
import { membersApi } from '@/services/api';
import { MemberRole } from '@/types';
import { Mail, Shield, UserCheck, X, Check, Copy, AlertCircle, Loader2 } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectTitle: string;
  onMemberInvited?: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  onMemberInvited,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessLink(null);

    try {
      const res = await membersApi.invite(projectId, {
        email: email.trim().toLowerCase(),
        role,
      });

      // Construct invite link
      const inviteUrl = `${window.location.origin}/invitations/accept?token=${(res.data as any).token || ''}`;
      setSuccessLink(inviteUrl);
      setEmail('');
      if (onMemberInvited) onMemberInvited();
    } catch (err: any) {
      const errMsg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to send invitation. Please check the email and try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (successLink) {
      navigator.clipboard.writeText(successLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccessLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111726] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Invite Collaborator</h3>
            <p className="text-xs text-slate-400">
              Add a teammate to <span className="text-indigo-300 font-medium">{projectTitle}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successLink ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">Invitation created!</p>
                <p className="text-emerald-400/90 mt-0.5">
                  An email has been dispatched. You can also directly copy and share this invite link:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={successLink}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Teammate's Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Project Role & Permissions
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'viewer' as MemberRole,
                    label: 'Viewer',
                    desc: 'Read-only access to tasks & graph',
                  },
                  {
                    id: 'editor' as MemberRole,
                    label: 'Editor',
                    desc: 'Can create and update tasks',
                  },
                  {
                    id: 'admin' as MemberRole,
                    label: 'Admin',
                    desc: 'Can invite members & edit project',
                  },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === r.id
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm shadow-indigo-500/20'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      {r.label}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                      {r.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send Invitation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
