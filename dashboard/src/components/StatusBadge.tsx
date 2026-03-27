import React from 'react';

export type DeploymentStatus = 'running' | 'deploying' | 'failed' | 'stopped';

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
