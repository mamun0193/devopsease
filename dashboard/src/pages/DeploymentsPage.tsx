import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Rocket,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowLeft,
  GitCommitHorizontal,
  GitBranch,
  Clock,
  Tag,
  CheckCircle2,
  XCircle,
  ScrollText,
  RotateCcw,
  AlertTriangle,
  Square,
  Trash2,
} from 'lucide-react';
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import { useDeployments } from '../hooks/useDeployments';
import { useDeploymentSocket } from '../hooks/useDeploymentSocket';
import { deploymentApi } from '../api';
import type { Deployment } from '../api';
import DeploymentDetailModal from '../components/DeploymentDetailModal';
import ConfirmModal from '../components/ConfirmModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; label: string }> = {
  running:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400',              label: 'Running'   },
  deploying: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400 animate-pulse',  label: 'Deploying' },
  failed:    { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400',                  label: 'Failed'    },
  stopped:   { color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-600/30',   dot: 'bg-slate-500',                label: 'Stopped'   },
};

const ENV_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  dev:        { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25'   },
  staging:    { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25' },
  production: { color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/25'   },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, color,
}: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <motion.div
      className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold text-slate-100">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const variantClasses = {
    default: 'text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-slate-200 border-slate-700 hover:border-slate-600',
    danger:  'text-red-400/80 bg-red-500/5 hover:bg-red-500/15 hover:text-red-300 border-red-500/20 hover:border-red-500/40',
    warning: 'text-amber-400/80 bg-amber-500/5 hover:bg-amber-500/15 hover:text-amber-300 border-amber-500/20 hover:border-amber-500/40',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      {disabled ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      {label}
    </button>
  );
}

function DeploymentRow({
  deployment,
  onViewLogs,
  onStop,
  onRemove,
  onRollback,
  loadingAction,
}: {
  deployment: Deployment;
  onViewLogs: (id: string) => void;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
  onRollback: (id: string) => void;
  loadingAction: string | null;
}) {
  const status = STATUS_CONFIG[deployment.status] ?? STATUS_CONFIG.stopped;
  const env = ENV_CONFIG[deployment.environment] ?? ENV_CONFIG.dev;
  const shortHash = deployment.build.commitHash?.slice(0, 7) ?? '-------';
  const isThisLoading = (action: string) => loadingAction === `${action}:${deployment._id}`;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
          <Rocket size={14} className="text-slate-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${status.color} ${status.bg} ${status.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
              {status.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${env.color} ${env.bg} ${env.border}`}>
              {deployment.environment}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 font-mono">
              <GitCommitHorizontal size={11} />
              {shortHash}
            </span>
            <span className="flex items-center gap-1">
              <GitBranch size={11} />
              <span className="truncate max-w-[120px]">{deployment.build.branch}</span>
            </span>
            {deployment.imageTag && (
              <span className="hidden sm:flex items-center gap-1">
                <Tag size={11} />
                <span className="truncate max-w-[100px]">{deployment.imageTag}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
          <Clock size={11} />
          {formatRelativeTime(deployment.createdAt)}
        </span>
        <button
          onClick={() => onViewLogs(deployment._id)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-all"
        >
          <ScrollText size={12} />
          Logs
        </button>

        {deployment.status === 'running' && (
          <ActionButton
            icon={Square}
            label="Stop"
            onClick={() => onStop(deployment._id)}
            disabled={isThisLoading('stop')}
            variant="warning"
          />
        )}

        {['running', 'stopped', 'failed'].includes(deployment.status) && (
          <ActionButton
            icon={Trash2}
            label="Remove"
            onClick={() => onRemove(deployment._id)}
            disabled={isThisLoading('remove')}
            variant="danger"
          />
        )}

        <ActionButton
          icon={RotateCcw}
          label="Rollback"
          onClick={() => onRollback(deployment._id)}
          disabled={isThisLoading('rollback')}
        />
      </div>
    </div>
  );
}

// Filter tab config 

type FilterStatus = 'all' | 'running' | 'deploying' | 'failed' | 'stopped';

const FILTER_TABS: { key: FilterStatus; label: string; activeClass: string }[] = [
  { key: 'all',       label: 'All',       activeClass: 'bg-slate-700 text-slate-100 border-slate-600'       },
  { key: 'running',   label: 'Running',   activeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' },
  { key: 'deploying', label: 'Deploying', activeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/50'    },
  { key: 'failed',    label: 'Failed',    activeClass: 'bg-red-500/20 text-red-400 border-red-500/50'          },
  { key: 'stopped',   label: 'Stopped',   activeClass: 'bg-slate-600/30 text-slate-400 border-slate-500/50'    },
];

// ── Page ──────────────────────────────────────────────────────────────────────

const DeploymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [rollbackModal, setRollbackModal] = useState<{ open: boolean; deploymentId: string | null }>({
    open: false,
    deploymentId: null,
  });
  const [rollbackReason, setRollbackReason] = useState('');

  const { data: deployments = [], isLoading, refetch, isFetching, error } = useDeployments();

  // Real-time updates via WebSocket
  useDeploymentSocket();

    const stopMutation = useMutation({
    mutationFn: deploymentApi.stop,
    onMutate: (id) => setLoadingAction(`stop:${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      dispatch(addToast({ message: 'Deployment stopped', type: 'info', duration: 3000 }));
    },
    onError: (err: any) => {
      dispatch(addToast({ message: err?.response?.data?.message ?? 'Failed to stop deployment', type: 'error', duration: 5000 }));
    },
    onSettled: () => setLoadingAction(null),
  });

  const removeMutation = useMutation({
    mutationFn: deploymentApi.remove,
    onMutate: (id) => setLoadingAction(`remove:${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      dispatch(addToast({ message: 'Deployment removed', type: 'info', duration: 3000 }));
    },
    onError: (err: any) => {
      dispatch(addToast({ message: err?.response?.data?.message ?? 'Failed to remove deployment', type: 'error', duration: 5000 }));
    },
    onSettled: () => setLoadingAction(null),
  });

  const rollbackMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => deploymentApi.rollback(id, reason),
    onMutate: ({ id }) => setLoadingAction(`rollback:${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      dispatch(addToast({ message: 'Rollback initiated — new deployment created', type: 'info', duration: 4000 }));
    },
    onError: (err: any) => {
      dispatch(addToast({ message: err?.response?.data?.message ?? 'Rollback failed', type: 'error', duration: 5000 }));
    },
    onSettled: () => setLoadingAction(null),
  });

  const handleRollback = (id: string) => {
    setRollbackReason('');
    setRollbackModal({ open: true, deploymentId: id });
  };

  const confirmRollback = () => {
    if (!rollbackModal.deploymentId) {
      return;
    }

    const reason = rollbackReason.trim();
    rollbackMutation.mutate({
      id: rollbackModal.deploymentId,
      reason: reason || undefined,
    });
    setRollbackModal({ open: false, deploymentId: null });
    setRollbackReason('');
  };

  const closeRollbackModal = () => {
    setRollbackModal({ open: false, deploymentId: null });
    setRollbackReason('');
  };

  const handleViewLogs = useCallback((id: string) => {
    const deployment = deployments.find(d => d._id === id);
    if (deployment) {
      setSelectedDeployment(deployment);
    }
  }, [deployments]);

  const counts = useMemo(() => ({
    all:       deployments.length,
    running:   deployments.filter(d => d.status === 'running').length,
    deploying: deployments.filter(d => d.status === 'deploying').length,
    failed:    deployments.filter(d => d.status === 'failed').length,
    stopped:   deployments.filter(d => d.status === 'stopped').length,
  }), [deployments]);

  const filterItems: FilterItem[] = useMemo(() => [
    { key: 'all',       label: 'All',       count: counts.all,       color: 'text-slate-100',   activeBg: 'bg-slate-700',          activeBorder: 'border-slate-600',          icon: <Rocket size={15} className="text-slate-400" /> },
    { key: 'running',   label: 'Running',   count: counts.running,   color: 'text-emerald-400', activeBg: 'bg-emerald-500/20',     activeBorder: 'border-emerald-500/50',     dot: 'bg-emerald-500 animate-pulse' },
    { key: 'deploying', label: 'Deploying', count: counts.deploying, color: 'text-amber-400',   activeBg: 'bg-amber-500/20',       activeBorder: 'border-amber-500/50',       dot: 'bg-amber-500 animate-pulse' },
    { key: 'failed',    label: 'Failed',    count: counts.failed,    color: 'text-red-400',     activeBg: 'bg-red-500/20',         activeBorder: 'border-red-500/50',         icon: <AlertCircle size={15} className="text-red-400" /> },
    { key: 'stopped',   label: 'Stopped',   count: counts.stopped,   color: 'text-slate-400',   activeBg: 'bg-slate-600/30',       activeBorder: 'border-slate-500/50',       icon: <XCircle size={15} className="text-slate-400" /> },
  ], [counts]);

  const filtered = useMemo(() =>
    activeFilter === 'all' ? deployments : deployments.filter(d => d.status === activeFilter),
    [deployments, activeFilter],
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Plain header — no filter items so the center stays clean */}
      <Header onFilterChange={(f) => setActiveFilter(f as FilterStatus)} activeFilter={activeFilter} filterItems={filterItems} />
      <ResourceNav />

      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">

          {/* ── Page header ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold text-slate-100">Deployments</h1>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/50 transition-all disabled:opacity-40"
            >
              {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>

          {/* ── Loading ────────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
          ) : error ? (
            /* ── Error state ─────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <h3 className="text-slate-200 font-semibold mb-2">Failed to load deployments</h3>
              <p className="text-slate-500 text-sm mb-5 max-w-xs">
                {(error as any)?.response?.data?.message ?? 'Could not reach the server.'}
              </p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-all border border-slate-700"
              >
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          ) : (
            <>
              {/* ── Summary cards ───────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                <SummaryCard icon={Rocket}        label="Total"     value={counts.all}       color="bg-violet-600/20"  />
                <SummaryCard icon={CheckCircle2}  label="Running"   value={counts.running}   color="bg-emerald-600/20" />
                <SummaryCard icon={AlertTriangle} label="Deploying" value={counts.deploying} color="bg-amber-600/20"   />
                <SummaryCard icon={AlertCircle}   label="Failed"    value={counts.failed}    color="bg-red-600/20"     />
                <SummaryCard icon={XCircle}       label="Stopped"   value={counts.stopped}   color="bg-slate-600/30"   />
              </div>

              {/* ── Inline filter tabs ──────────────────────────────────── */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activeFilter === tab.key
                        ? tab.activeClass
                        : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] ${activeFilter === tab.key ? 'opacity-80' : 'opacity-50'}`}>
                      {counts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── List ─────────────────────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {filtered.length === 0 ? (
                  <motion.div
                    key="empty"
                    className="text-center py-20"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <Rocket size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-500 text-lg">No deployments yet</p>
                    <p className="text-slate-600 text-sm mt-1">
                      {activeFilter !== 'all'
                        ? `No ${activeFilter} deployments found`
                        : 'Deployments will appear here once your pipelines run'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {filtered.map(deployment => (
                      <DeploymentRow
                        key={deployment._id}
                        deployment={deployment}
                        onViewLogs={handleViewLogs}
                        onStop={(id) => stopMutation.mutate(id)}
                        onRemove={(id) => removeMutation.mutate(id)}
                        onRollback={handleRollback}
                        loadingAction={loadingAction}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </main>

      <DeploymentDetailModal
        deployment={selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
      />

      <ConfirmModal
        isOpen={rollbackModal.open}
        onClose={closeRollbackModal}
        onConfirm={confirmRollback}
        title="Rollback Deployment"
        message="This will create a new deployment from the latest stable version."
        confirmLabel="Rollback"
        cancelLabel="Cancel"
        inputLabel="Reason (optional)"
        inputPlaceholder="e.g., recent deploy is unstable"
        inputValue={rollbackReason}
        onInputChange={setRollbackReason}
      />
    </div>
  );
};

export default DeploymentsPage;
