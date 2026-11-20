'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RefreshCw } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] text-slate-400">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
        <span className="text-sm font-medium">Loading FlowTrack...</span>
      </div>
    </div>
  );
}
