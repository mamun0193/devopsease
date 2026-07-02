import React from 'react';

export type DeploymentStatus = 'running' | 'deploying' | 'failed' | 'stopped' | 'Draft' | 'Prepared' | 'Deploying' | 'Validating' | 'Promoting' | 'Active' | 'Archived' | 'RolledBack';

interface StatusBadgeProps {
  status: DeploymentStatus;
}

const config: Record<DeploymentStatus, { label: string; dot: string; bg: string; text: string }> = {
  running: {
    label: 'Running',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
  },
  deploying: {
    label: 'Deploying',
    dot: 'bg-amber-400 animate-pulse',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400',
  },
  stopped: {
    label: 'Stopped',
    dot: 'bg-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-400',
  },
  Draft: {
    label: 'Draft',
    dot: 'bg-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-400',
  },
  Prepared: {
    label: 'Prepared',
    dot: 'bg-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-400',
  },
  Deploying: {
    label: 'Deploying',
    dot: 'bg-amber-400 animate-pulse',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-400',
  },
  Validating: {
    label: 'Validating',
    dot: 'bg-purple-400 animate-pulse',
    bg: 'bg-purple-500/10 border-purple-500/20',
    text: 'text-purple-400',
  },
  Promoting: {
    label: 'Promoting',
    dot: 'bg-indigo-400 animate-pulse',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    text: 'text-indigo-400',
  },
  Active: {
    label: 'Active',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-400',
  },
  Archived: {
    label: 'Archived',
    dot: 'bg-slate-500',
    bg: 'bg-slate-500/10 border-slate-500/20',
    text: 'text-slate-400 line-through',
  },
  RolledBack: {
    label: 'Rolled Back',
    dot: 'bg-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-400',
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const c = config[status] ?? config.stopped;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
};

export default StatusBadge;
