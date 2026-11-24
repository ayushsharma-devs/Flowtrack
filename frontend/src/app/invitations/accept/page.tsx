'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { membersApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { CheckCircle2, ShieldAlert, Sparkles, ArrowRight, Loader2, LogIn } from 'lucide-react';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;

  const [statusState, setStatusState] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  const handleAccept = async () => {
    if (!token) {
      setStatusState('error');
      setErrorMessage('Missing invitation token.');
      return;
    }

    try {
      setStatusState('accepting');
      setErrorMessage(null);
      const res = await membersApi.acceptInvite(token);
      setProjectId(res.data.project_id);
      setStatusState('success');
    } catch (err: any) {
      setStatusState('error');
      setErrorMessage(
        err.response?.data?.token?.[0] ||
        err.response?.data?.detail ||
        'Could not accept invitation. It may have expired or already been accepted.'
      );
    }
  };

  useEffect(() => {
    if (isAuthenticated && token && statusState === 'idle') {
      handleAccept();
    }
  }, [isAuthenticated, token]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-xs">Authenticating session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-[#111726] border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
          <LogIn className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Sign In to Join Project</h2>
          <p className="text-xs text-slate-400 mt-1">
            You received an invitation to collaborate on FlowTrack. Please sign in or register to accept.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <Link
            href={`/login?redirect=/invitations/accept?token=${token || ''}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Log In to Accept
          </Link>
          <Link
            href={`/register?redirect=/invitations/accept?token=${token || ''}`}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Create New Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
      {statusState === 'accepting' && (
        <div className="space-y-3 py-6">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <h2 className="text-base font-semibold text-white">Joining Project Workspace...</h2>
          <p className="text-xs text-slate-400">Setting up your team permissions and access.</p>
        </div>
      )}

      {statusState === 'success' && (
        <div className="space-y-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">You're in the Project!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your invitation has been accepted. You can now view and keep track of tasks on the project board.
            </p>
          </div>
          <button
            onClick={() => router.push(projectId ? `/projects/${projectId}` : '/projects')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
          >
            Open Project Workspace
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusState === 'error' && (
        <div className="space-y-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Invitation Issue</h2>
            <p className="text-xs text-rose-300 mt-1">{errorMessage}</p>
          </div>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Go to My Projects
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="text-slate-400 text-xs flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            Loading invitation...
          </div>
        }
      >
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
