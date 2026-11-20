'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GraphNodeData } from '@/types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Zap, GitFork } from 'lucide-react';

export const CustomTaskNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as GraphNodeData;

  const getBorderColor = () => {
    if (selected) return 'border-indigo-400 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20';
    if (nodeData.is_blocked) return 'border-amber-500/60 shadow-amber-500/10';
    if (nodeData.is_overdue) return 'border-rose-500/60 shadow-rose-500/10';
    switch (nodeData.status) {
      case 'completed':
        return 'border-emerald-500/50 shadow-emerald-500/5';
      case 'in_progress':
        return 'border-blue-500/50 shadow-blue-500/5';
      case 'todo':
      default:
        return 'border-slate-800 hover:border-slate-700';
    }
  };

  return (
    <div
      className={`min-w-[240px] max-w-[280px] bg-[#111726] rounded-xl border p-3.5 transition-all duration-200 cursor-pointer shadow-md ${getBorderColor()}`}
    >
      {/* Target handle for incoming prerequisite connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-[#090d16] hover:!scale-125 transition-transform"
      />

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-slate-100 line-clamp-2 leading-tight">
          {nodeData.title}
        </h4>
        {nodeData.bottleneck_score > 0 && (
          <span
            title={`Bottleneck Score: ${nodeData.bottleneck_score} (${nodeData.dependent_count} downstream + ${nodeData.is_overdue ? '2 overdue penalty' : '0'})`}
            className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0"
          >
            <Zap className="w-2.5 h-2.5 mr-0.5" />
            {nodeData.bottleneck_score}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap my-2">
        <StatusBadge
          status={nodeData.status}
          isBlocked={nodeData.is_blocked}
          isOverdue={nodeData.is_overdue}
        />
        <PriorityBadge priority={nodeData.priority} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
        <span className="flex items-center gap-1">
          <GitFork className="w-3 h-3 text-slate-500" />
          <span>{nodeData.prerequisite_count} in / {nodeData.dependent_count} out</span>
        </span>
        {nodeData.due_date ? (
          <span className={nodeData.is_overdue ? 'text-rose-400 font-medium' : 'text-slate-400'}>
            Due {new Date(nodeData.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        ) : (
          <span className="text-slate-600">No deadline</span>
        )}
      </div>

      {/* Source handle for outgoing downstream dependent connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-[#090d16] hover:!scale-125 transition-transform"
      />
    </div>
  );
});

CustomTaskNode.displayName = 'CustomTaskNode';
