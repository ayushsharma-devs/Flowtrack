import React from 'react';
import { TaskPriority } from '@/types';
import { Flame, ArrowUp, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const getConfig = () => {
    switch (priority) {
      case 'high':
        return {
          label: 'High',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <Flame className="w-3 h-3 mr-1" />,
        };
      case 'medium':
        return {
          label: 'Medium',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <ArrowUp className="w-3 h-3 mr-1" />,
        };
      case 'low':
      default:
        return {
          label: 'Low',
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <ArrowDown className="w-3 h-3 mr-1" />,
        };
    }
  };

  const config = getConfig();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
