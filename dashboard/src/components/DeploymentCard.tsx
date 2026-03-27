import React from 'react';
import { motion } from 'framer-motion';
import { GitCommitHorizontal, GitBranch, Clock, Tag, ScrollText, RotateCcw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import EnvironmentBadge from './EnvironmentBadge';
import type { Deployment } from '../api';

interface DeploymentCardProps {
  deployment: Deployment;
  index: number;
  onViewLogs: (id: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  return new Date(dateString).toLocaleDateString();
}

const DeploymentCard: React.FC<DeploymentCardProps> = ({ deployment, index, onViewLogs }) => {
  const shortHash = deployment.build.commitHash?.slice(0, 7) ?? '-------';

  return (
    <motion.div
      className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700 hover:shadow-xl hover:shadow-black/30 transition-all duration-300 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 to-blue-600/0 group-hover:from-violet-500/5 group-hover:to-blue-600/5 transition-all duration-500 pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <StatusBadge status={deployment.status} />
          <EnvironmentBadge environment={deployment.environment} />
        </div>
        <span className="flex items-center gap-1 text-slate-500 text-xs shrink-0">
          <Clock size={11} />
          {formatRelativeTime(deployment.createdAt)}
        </span>
      </div>

      {/* Commit info */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
          <GitCommitHorizontal size={14} className="text-slate-400" />
        </div>
        <div>
          <code className="text-sm font-semibold text-slate-100 font-mono tracking-tight">
            {shortHash}
          </code>
        </div>
      </div>

      {/* Branch */}
      <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-3">
        <GitBranch size={12} className="shrink-0" />
        <span className="truncate font-mono">{deployment.build.branch}</span>
      </div>

      {/* Image tag */}
      {deployment.imageTag && (
        <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-4">
          <Tag size={11} className="shrink-0" />
          <span className="font-mono truncate">{deployment.imageTag}</span>
        </div>
      )}

      <div className="h-px bg-slate-800 mb-4" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewLogs(deployment._id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 text-xs font-medium transition-all duration-200"
        >
          <ScrollText size={13} />
          View Logs
        </button>
        <button
          disabled
          title="Rollback coming soon"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-600 text-xs font-medium cursor-not-allowed select-none"
        >
          <RotateCcw size={13} />
          Rollback
        </button>
      </div>
    </motion.div>
  );
};

export default DeploymentCard;
