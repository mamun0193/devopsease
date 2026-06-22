import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <AnimatePresence>
      {deployment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="relative flex flex-col w-full max-w-6xl h-full max-h-[90vh] bg-dds-bg border border-dds-border shadow-2xl rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-dds-border bg-dds-surface/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-dds-primary/10 border border-dds-primary/20 flex items-center justify-center shadow-inner">
                  <Box size={18} className="text-dds-primary" />
                </div>
                <h2 className="text-base font-semibold text-dds-text-primary">
                  Deployment Details
                </h2>
              </div>
              <div className="h-6 w-px bg-dds-border" />
              <div className="flex items-center gap-2.5">
                <StatusBadge status={deployment.status} />
                <EnvironmentBadge environment={deployment.environment} />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-dds-text-muted hover:text-dds-white hover:bg-dds-surface rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Metadata Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-5 bg-dds-surface border-b border-dds-border shrink-0">
            <div>
              <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">ID</p>
              <p className="text-[13px] font-mono text-dds-text-primary truncate" title={deployment._id}>
                {deployment._id.slice(-8)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">Commit</p>
              <p className="text-[13px] font-mono text-dds-text-primary flex items-center gap-1.5 truncate">
                <GitCommit size={13} className="text-dds-text-muted" />
                {deployment.build?.commitHash?.slice(0, 7) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">Branch</p>
              <p className="text-[13px] font-mono text-dds-text-primary flex items-center gap-1.5 truncate">
                <GitBranch size={13} className="text-dds-text-muted" />
                {deployment.build?.branch || 'N/A'}
              </p>
            </div>
            {deployment.imageTag && (
              <div>
                <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">Image Tag</p>
                <p className="text-[13px] font-mono text-dds-text-primary flex items-center gap-1.5 truncate">
                  <Tag size={13} className="text-dds-text-muted" />
                  {deployment.imageTag}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider mb-1.5">Created</p>
              <p className="text-[13px] font-mono text-dds-text-primary flex items-center gap-1.5 truncate">
                <Clock size={13} className="text-dds-text-muted" />
                {formatRelativeTime(deployment.createdAt)}
              </p>
            </div>
          </div>

          {/* Logs Area */}
          <div className="flex-1 min-h-0 p-4 bg-dds-bg">
            <DeploymentLogsViewer deploymentId={deployment._id} />
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default DeploymentDetailModal;
