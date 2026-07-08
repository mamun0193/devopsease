import React, { useState } from 'react';
import {
  Trash2, GitBranch, ExternalLink, Clock,
  CheckCircle2, WifiOff, Loader2, User, Link2,
} from 'lucide-react';
import type { Repository, RepoStatus } from '../services/repo.api';
import { EmptyState } from './ui/empty-state';

interface RepoListTableProps {
  repos: Repository[];
  onDelete: (id: string) => Promise<void>;
}

// ── Status config ───────────────────────────────────────────────────────────────

const statusConfig: Record<
  RepoStatus,
  { badgeClass: string; label: string; dot?: string; icon: React.ReactNode }
> = {
  active: {
    label: 'Connected',
    badgeClass: 'badge badge-success',
    dot: 'bg-dds-green',
    icon: <CheckCircle2 size={11} />,
  },
  disconnected: {
    label: 'Disconnected',
    badgeClass: 'badge badge-queued',
    dot: 'bg-dds-text-muted',
    icon: <WifiOff size={11} />,
  },
};

// Helpers 

const formatDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '—';
  }
};

const cloneUrlToDisplayUrl = (url: string): string =>
  url.replace(/^https?:\/\//, '').replace(/\.git$/, '');

// Delete confirm modal 

interface ConfirmDeleteModalProps {
  repoName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ repoName, onConfirm, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    onClick={(e) => e.target === e.currentTarget && onCancel()}
  >
    <div className="w-full max-w-sm bg-dds-surface border border-dds-border rounded-xl shadow-2xl shadow-black/60 p-6 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-dds-red/10 border border-dds-red/30 flex items-center justify-center">
          <Trash2 size={18} className="text-dds-red" />
        </div>
        <div>
          <h3 className="text-dds-text-primary font-semibold text-[15px]">Delete Repository?</h3>
          <p className="text-dds-text-secondary text-[12px] mt-0.5">This action cannot be undone.</p>
        </div>
      </div>
      <p className="text-dds-text-secondary text-[13px] mb-5 leading-relaxed">
        Disconnect{' '}
        <span className="text-dds-white font-medium">{repoName}</span>?{' '}
        All associated data will be removed.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-[6px] border border-dds-border text-dds-text-secondary bg-dds-bg hover:bg-dds-surface hover:text-dds-white text-[13px] font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-[6px] bg-dds-red hover:bg-dds-red/90 text-white text-[13px] font-semibold transition-colors shadow-sm"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// Repo List Row 

interface RepoRowProps {
  repo: Repository;
  isDeleting: boolean;
  onDeleteClick: (id: string) => void;
}

const RepoRow: React.FC<RepoRowProps> = ({ repo, isDeleting, onDeleteClick }) => {
  const status = statusConfig[repo.status] ?? statusConfig.disconnected;

  return (
    <div
      className={`
        group relative flex flex-col md:flex-row md:items-center gap-4 bg-dds-surface border border-dds-border rounded-xl p-4
        hover:border-dds-primary/30 transition-all duration-200
        ${isDeleting ? 'opacity-40 pointer-events-none' : ''}
      `}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-dds-primary/10 border border-dds-primary/30 flex items-center justify-center flex-shrink-0 shadow-sm hidden sm:flex">
        <GitBranch size={18} className="text-dds-primary" />
      </div>
      
      {/* Name and URL */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-dds-text-primary font-semibold text-[15px] truncate">{repo.repoName}</h3>
          <span className={status.badgeClass}>
            {repo.status === 'active' ? (
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dds-green opacity-60" />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dot}`} />
              </span>
            ) : (
              <span className="mr-1">{status.icon}</span>
            )}
            {status.label}
          </span>
        </div>
        <p className="text-dds-text-muted text-[13px] mt-1 truncate font-mono">{cloneUrlToDisplayUrl(repo.cloneUrl)}</p>
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 text-[12px] text-dds-text-secondary">
        <div className="flex items-center gap-1.5">
          <User size={14} className="text-dds-text-muted" />
          <span className="font-medium text-dds-text-primary">{repo.owner}</span>
        </div>
        <div className="hidden sm:block w-px h-3 bg-dds-border" />
        <div className="flex items-center gap-1.5">
          <GitBranch size={14} className="text-dds-text-muted" />
          <code className="font-mono text-dds-text-primary">{repo.defaultBranch}</code>
        </div>
        <div className="hidden sm:block w-px h-3 bg-dds-border" />
        <div className="flex items-center gap-1.5 min-w-max">
          <Clock size={14} className="text-dds-text-muted" />
          <span>{formatDate(repo.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
        <a
          href={repo.cloneUrl.replace(/\.git$/, '')}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center justify-center gap-1.5
            px-3 py-1.5 rounded-[6px] text-[12px] font-medium
            border border-dds-border bg-dds-bg text-dds-text-secondary
            hover:text-dds-white hover:border-dds-primary/50 hover:bg-dds-primary/5
            transition-colors duration-200
          "
          title="Open in browser"
        >
          <Link2 size={14} />
          Open
        </a>
        <button
          onClick={() => onDeleteClick(repo._id)}
          disabled={isDeleting}
          className="
            flex items-center justify-center gap-1.5
            px-3 py-1.5 rounded-[6px] text-[12px] font-medium
            border border-dds-red/30 bg-dds-red/10 text-dds-red
            hover:bg-dds-red/20 hover:border-dds-red/50
            transition-colors duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
          title="Delete repository"
        >
          {isDeleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

// ── Empty state ─────────────────────────────────────────────────────────────────

const RepoEmptyState: React.FC = () => (
  <EmptyState
    icon={<GitBranch size={28} className="text-dds-text-muted" />}
    title="No repositories connected yet"
    description="Connect your first Git repository to start managing deployments, CI/CD pipelines, and build status."
  />
);

// Main component 

const RepoListTable: React.FC<RepoListTableProps> = ({ repos, onDelete }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => setConfirmId(id);

  const handleConfirmDelete = async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (repos.length === 0) return <RepoEmptyState />;

  const confirmRepo = repos.find((r) => r._id === confirmId);

  return (
    <>
      {/* Delete confirmation modal */}
      {confirmId && confirmRepo && (
        <ConfirmDeleteModal
          repoName={confirmRepo.repoName}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {/* List wrapper */}
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {repos.map((repo) => (
          <RepoRow
            key={repo._id}
            repo={repo}
            isDeleting={deletingId === repo._id}
            onDeleteClick={handleDeleteClick}
          />
        ))}
      </div>
    </>
  );
};

export default RepoListTable;
