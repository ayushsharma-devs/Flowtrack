'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Bell, Search, Sparkles } from 'lucide-react';

interface HeaderProps {
  title?: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-[#090d16] border-b border-slate-800/80 px-8 flex items-center justify-between shrink-0">
      <div>
        {title && <h1 className="text-base font-semibold text-slate-100">{title}</h1>}
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Dependency Engine Active</span>
        </div>
      </div>
    </header>
  );
}
