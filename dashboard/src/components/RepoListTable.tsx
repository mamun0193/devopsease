import React, { useState } from 'react';
import {
  Trash2, GitBranch, ExternalLink, Clock,
  AlertCircle, CheckCircle2, RefreshCw, WifiOff,
  Loader2, User, Link2,
} from 'lucide-react';
import type { Repository, RepoStatus } from '../services/repo.api';

interface RepoListTableProps {
  repos: Repository[];
  onDelete: (id: string) => Promise<void>;
}

// ── Status config ───────────────────────────────────────────────────────────────

const statusConfig: Record<
  RepoStatus,
  { label: string; textColor: string; badgeBg: string; badgeBorder: string; dot: string; icon: React.ReactNode }
> = {
  active: {
    label: 'Connected',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: <CheckCircle2 size={11} />,
  },
  disconnected: {
    label: 'Disconnected',
    textColor: 'text-slate-400',
    badgeBg: 'bg-slate-500/10',
    badgeBorder: 'border-slate-500/30',
    dot: 'bg-slate-500',
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
    <div className="w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/60 p-6 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Trash2 size={18} className="text-red-400" />
        </div>
        <div>
          <h3 className="text-slate-100 font-semibold">Delete Repository?</h3>
          <p className="text-slate-500 text-xs mt-0.5">This action cannot be undone.</p>
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-5 leading-relaxed">
        Disconnect{' '}
        <span className="text-slate-100 font-semibold">{repoName}</span>?{' '}
        All associated data will be removed.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 hover:text-slate-100 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-red-900/30"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// Repo card 

interface RepoCardProps {
  repo: Repository;
  isDeleting: boolean;
  onDeleteClick: (id: string) => void;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo, isDeleting, onDeleteClick }) => {
  const status = statusConfig[repo.status] ?? statusConfig.disconnected;

  return (
    <div
      className={`
        group relative bg-slate-900 border border-slate-800 rounded-2xl p-5
        shadow-lg shadow-black/20
        hover:border-slate-700 hover:shadow-xl hover:shadow-black/30
        hover:-translate-y-0.5
        transition-all duration-200 ease-out
        ${isDeleting ? 'opacity-40 pointer-events-none scale-[0.99]' : ''}
      `}
    >
      {/* Top-right status badge */}
      <div className="absolute top-4 right-4">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide
            ${status.textColor} ${status.badgeBg} ${status.badgeBorder}
          `}
        >
          {/* Animated dot for active repos */}
          {repo.status === 'active' ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dot}`} />
            </span>
          ) : (
            status.icon
          )}
          {status.label}
        </span>
      </div>

      {/* Repo icon + name */}
      <div className="flex items-start gap-3.5 mb-4 pr-24">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/25 to-blue-600/25 border border-violet-500/25 flex items-center justify-center flex-shrink-0 shadow-inner">
          <GitBranch size={18} className="text-violet-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-slate-100 font-semibold text-sm leading-tight truncate">{repo.repoName}</h3>
          <p className="text-slate-500 text-xs mt-0.5 truncate">{cloneUrlToDisplayUrl(repo.cloneUrl)}</p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <User size={12} className="flex-shrink-0 text-slate-500" />
          <span className="font-medium text-slate-300">{repo.owner}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <GitBranch size={12} className="flex-shrink-0 text-slate-500" />
          <code className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded-md text-[10px]">
            {repo.defaultBranch}
          </code>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Clock size={12} className="flex-shrink-0 text-slate-500" />
          <span>{formatDate(repo.createdAt)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800 mb-3.5 group-hover:bg-slate-700 transition-colors duration-200" />

      {/* Action row */}
      <div className="flex items-center gap-2">
        <a
          href={repo.cloneUrl.replace(/\.git$/, '')}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex-1 flex items-center justify-center gap-1.5
            py-2 rounded-xl text-xs font-medium
            border border-slate-700 text-slate-400
            hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5
            transition-all duration-200
          "
          title="Open in browser"
        >
          <Link2 size={13} />
          Open Repo
        </a>

        <button
          onClick={() => onDeleteClick(repo._id)}
          disabled={isDeleting}
          className="
            flex-1 flex items-center justify-center gap-1.5
            py-2 rounded-xl text-xs font-medium
            border border-slate-700 text-slate-400
            hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
          "
          title="Delete repository"
        >
          {isDeleting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {/* Subtle gradient top accent on hover */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-violet-500/0 via-violet-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};

// ── Empty state ─────────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
    <div className="relative mb-6">
      <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-xl shadow-black/20">
        <GitBranch size={32} className="text-slate-600" />
      </div>
      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
        <ExternalLink size={12} className="text-violet-400" />
      </div>
    </div>
    <h3 className="text-slate-200 font-semibold text-base mb-2">No repositories connected yet</h3>
    <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
      Connect your first Git repository to start managing deployments, CI/CD pipelines, and build status.
    </p>
  </div>
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

  if (repos.length === 0) return <EmptyState />;

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

      {/* Card grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {repos.map((repo) => (
          <RepoCard
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
