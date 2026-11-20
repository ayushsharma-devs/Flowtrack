import React from 'react';
import { TaskStatus } from '@/types';
import { CheckCircle2, Circle, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
  isBlocked?: boolean;
  isOverdue?: boolean;
  className?: string;
}

export function StatusBadge({ status, isBlocked, isOverdue, className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />,
        };
      case 'todo':
      default:
        return {
          label: 'To Do',
          bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
          icon: <Circle className="w-3.5 h-3.5 mr-1" />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.bg}`}
      >
        {config.icon}
        {config.label}
      </span>

      {isBlocked && (
        <span
          title="Blocked by incomplete prerequisite tasks"
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30"
        >
          <ShieldAlert className="w-3 h-3 mr-1" />
          Blocked
        </span>
      )}

      {isOverdue && (
        <span
          title="Task is past its due date"
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse"
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overdue
        </span>
      )}
    </div>
  );
}
