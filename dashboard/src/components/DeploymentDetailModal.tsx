import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCommit, GitBranch, Box, Clock, Tag } from 'lucide-react';
import type { Deployment } from '../api';
import StatusBadge from './StatusBadge';
import EnvironmentBadge from './EnvironmentBadge';
import DeploymentLogsViewer from './DeploymentLogsViewer';

interface DeploymentDetailModalProps {
  deployment: Deployment | null;
  onClose: () => void;
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

const DeploymentDetailModal: React.FC<DeploymentDetailModalProps> = ({ deployment, onClose }) => {
  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (deployment) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deployment, onClose]);

  if (!deployment) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="relative flex flex-col w-full max-w-6xl h-full max-h-[90vh] bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Box size={20} className="text-blue-400" />
                Deployment Details
              </h2>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex items-center gap-2">
                <StatusBadge status={deployment.status} />
                <EnvironmentBadge environment={deployment.environment} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Metadata Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-4 bg-slate-800/30 border-b border-slate-800 shrink-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">ID</p>
              <p className="text-sm font-mono text-slate-300 truncate" title={deployment._id}>
                {deployment._id.slice(-8)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Commit</p>
              <p className="text-sm font-mono text-slate-300 flex items-center gap-1.5 truncate">
                <GitCommit size={14} className="text-slate-500" />
                {deployment.build?.commitHash?.slice(0, 7) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Branch</p>
              <p className="text-sm font-mono text-slate-300 flex items-center gap-1.5 truncate">
                <GitBranch size={14} className="text-slate-500" />
                {deployment.build?.branch || 'N/A'}
              </p>
            </div>
            {deployment.imageTag && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Image Tag</p>
                <p className="text-sm font-mono text-slate-300 flex items-center gap-1.5 truncate">
                  <Tag size={14} className="text-slate-500" />
                  {deployment.imageTag}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-slate-300 flex items-center gap-1.5 truncate">
                <Clock size={14} className="text-slate-500" />
                {formatRelativeTime(deployment.createdAt)}
              </p>
            </div>
          </div>

          {/* Logs Area */}
          <div className="flex-1 min-h-0 p-4 bg-slate-900 border-t border-slate-950 shadow-inner">
            <DeploymentLogsViewer deploymentId={deployment._id} />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeploymentDetailModal;
