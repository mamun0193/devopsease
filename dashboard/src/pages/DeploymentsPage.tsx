import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Rocket,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ScrollText,
  RotateCcw,
  AlertTriangle,
  Square,
  Trash2,
  Play,
  ExternalLink,
  Search,
  GitBranch,
  GitCommit,
} from 'lucide-react';
import RefreshButton from '../components/RefreshButton';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import { useDeployments } from '../hooks/useDeployments';
import { useDeploymentSocket } from '../hooks/useDeploymentSocket';
import { deploymentApi } from '../api';
import type { Deployment } from '../api';
import DeploymentDetailModal from '../components/DeploymentDetailModal';
import ConfirmModal from '../components/ConfirmModal';

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

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="card p-4 flex flex-col justify-between hover:bg-dds-surface/80 transition-colors">
      <div className="flex items-center gap-2 text-[11px] font-medium text-dds-text-muted uppercase tracking-wider mb-2">
        <Icon size={14} className="text-dds-text-secondary" />
        {label}
      </div>
      <div className="text-2xl font-mono text-dds-white font-medium">{value}</div>
    </div>
  );
}

type FilterStatus = 'all' | 'running' | 'deploying' | 'failed' | 'stopped';

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'running',   label: 'Running' },
  { key: 'deploying', label: 'Deploying' },
  { key: 'failed',    label: 'Failed' },
  { key: 'stopped',   label: 'Stopped' },
];

const DeploymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [rollbackModal, setRollbackModal] = useState<{ open: boolean; deploymentId: string | null }>({
    open: false,
    deploymentId: null,
  });
  const [rollbackReason, setRollbackReason] = useState('');

  const { data: deployments = [], isLoading, refetch, isFetching } = useDeployments();

  // Real-time updates via WebSocket
  useDeploymentSocket();

  const startMutation = useMutation({
    mutationFn: deploymentApi.start,
    onMutate: (id) => setLoadingAction(`start:${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      dispatch(addToast({ message: 'Deployment starting', type: 'info', duration: 3000 }));
    },
    onError: (err: any) => {
      dispatch(addToast({ message: err?.response?.data?.message ?? 'Failed to start deployment', type: 'error', duration: 5000 }));
    },
    onSettled: () => setLoadingAction(null),
  });

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
      dispatch(addToast({ message: 'Rollback initiated', type: 'info', duration: 4000 }));
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
    if (!rollbackModal.deploymentId) return;
    rollbackMutation.mutate({
      id: rollbackModal.deploymentId,
      reason: rollbackReason.trim() || undefined,
    });
    setRollbackModal({ open: false, deploymentId: null });
  };

  const closeRollbackModal = () => {
    setRollbackModal({ open: false, deploymentId: null });
    setRollbackReason('');
  };

  const counts = useMemo(() => ({
    all:       deployments.length,
    running:   deployments.filter(d => d.status === 'running').length,
    deploying: deployments.filter(d => d.status === 'deploying').length,
    failed:    deployments.filter(d => d.status === 'failed').length,
    stopped:   deployments.filter(d => d.status === 'stopped').length,
  }), [deployments]);

  const filtered = useMemo(() => {
    let res = activeFilter === 'all' ? deployments : deployments.filter(d => d.status === activeFilter);
    if (search) {
      res = res.filter(d => d.build.branch.toLowerCase().includes(search.toLowerCase()) || d.environment.toLowerCase().includes(search.toLowerCase()));
    }
    return res;
  }, [deployments, activeFilter, search]);

  const isActionLoading = (id: string) => loadingAction?.includes(id);

  return (
    <div className="h-full flex flex-col bg-dds-bg text-dds-white overflow-hidden relative">
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-dds-surface border border-dds-border flex items-center justify-center">
                <Rocket size={18} className="text-dds-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dds-white">Deployments</h1>
                <p className="text-[13px] text-dds-text-secondary mt-1">Manage and monitor live application deployments</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RefreshButton onRefresh={() => { refetch(); }} isFetching={isFetching} isLoading={isLoading} size="md" />
              <button 
                onClick={() => navigate('/deployments/new')}
                className="btn-primary"
              >
                <Rocket size={14} /> New Deployment
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard icon={Rocket} label="Total" value={counts.all} />
            <SummaryCard icon={CheckCircle2} label="Running" value={counts.running} />
            <SummaryCard icon={AlertTriangle} label="Deploying" value={counts.deploying} />
            <SummaryCard icon={AlertCircle} label="Failed" value={counts.failed} />
            <SummaryCard icon={XCircle} label="Stopped" value={counts.stopped} />
          </div>

          {/* Table Container */}
          <div className="card flex flex-col">
            <div className="p-4 border-b border-dds-border flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Tabs */}
              <div className="flex items-center gap-2">
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-all ${
                      activeFilter === tab.key
                        ? 'bg-dds-elevated text-dds-white border border-dds-border shadow-sm'
                        : 'text-dds-text-muted hover:text-dds-text-secondary border border-transparent'
                    }`}
                  >
                    {tab.label} <span className="opacity-50 ml-1">({counts[tab.key]})</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter deployments..."
                  className="pl-9 pr-4 py-1.5 bg-dds-bg border border-dds-border rounded-[6px] text-[12px] text-dds-white placeholder:text-dds-text-muted outline-none focus:border-dds-primary transition-colors w-64"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dds-surface/50 border-b border-dds-border text-[10px] font-medium text-dds-text-muted uppercase tracking-wider">
                    <th className="px-4 py-3 w-[20%]">Repository / Branch</th>
                    <th className="px-4 py-3 w-[15%]">Environment</th>
                    <th className="px-4 py-3 w-[15%]">Commit</th>
                    <th className="px-4 py-3 w-[15%]">Status</th>
                    <th className="px-4 py-3 w-[15%]">Created</th>
                    <th className="px-4 py-3 w-[20%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8">
                        <div className="flex justify-center"><Loader2 size={16} className="animate-spin text-dds-text-muted" /></div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-dds-text-muted">
                        No deployments found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(deployment => {
                      const shortHash = deployment.build.commitHash ? deployment.build.commitHash.slice(0, 7) : '-------';
                      const repoName = deployment.repositoryName || 'Unknown';
                      const isBusy = isActionLoading(deployment._id);
                      
                      return (
                        <tr key={deployment._id} className="border-b border-dds-border/50 hover:bg-dds-surface/80 hover:border-l-2 hover:border-l-dds-primary transition-all group">
                          <td className="px-4 py-3 font-medium text-dds-white">
                            <div className="flex items-center gap-2">
                              <GitBranch size={14} className="text-dds-text-muted" />
                              <span>{repoName}</span>
                              <span className="text-dds-text-muted">/</span>
                              <span className="text-dds-text-secondary font-normal">{deployment.build.branch}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="badge badge-queued">{deployment.environment}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-dds-text-secondary">
                            <div className="flex items-center gap-1.5">
                              <GitCommit size={14} className="text-dds-text-muted" />
                              {shortHash}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${deployment.status === 'running' ? 'badge-running' : deployment.status === 'failed' ? 'badge-failed' : deployment.status === 'deploying' ? 'badge-warning' : ''}`}>
                              {deployment.status === 'running' && <span className="pulse-dot pulse-dot-blue mr-1" />}
                              {deployment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-dds-text-muted flex items-center gap-1.5 h-full mt-1.5">
                            <Clock size={12} /> {formatRelativeTime(deployment.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Logs Action */}
                              <button onClick={() => setSelectedDeployment(deployment)} className="p-1.5 text-dds-text-muted hover:text-dds-white rounded-[4px] hover:bg-dds-bg transition-all" title="View Logs">
                                <ScrollText size={14} />
                              </button>
                              
                              {/* Open App */}
                              {deployment.status === 'running' && deployment.applicationSlug && (
                                <a href={`/apps/${deployment.applicationSlug}`} target="_blank" rel="noreferrer" className="p-1.5 text-dds-text-muted hover:text-dds-blue rounded-[4px] hover:bg-dds-bg transition-all" title="Open Application">
                                  <ExternalLink size={14} />
                                </a>
                              )}

                              {/* Stop / Start */}
                              {deployment.status === 'running' && (
                                <button disabled={isBusy} onClick={() => stopMutation.mutate(deployment._id)} className="p-1.5 text-dds-text-muted hover:text-dds-warning rounded-[4px] hover:bg-dds-bg transition-all disabled:opacity-50" title="Stop">
                                  {isBusy && loadingAction === `stop:${deployment._id}` ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                                </button>
                              )}
                              {['stopped', 'failed'].includes(deployment.status) && (
                                <button disabled={isBusy} onClick={() => startMutation.mutate(deployment._id)} className="p-1.5 text-dds-text-muted hover:text-dds-green rounded-[4px] hover:bg-dds-bg transition-all disabled:opacity-50" title="Start">
                                  {isBusy && loadingAction === `start:${deployment._id}` ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                </button>
                              )}

                              {/* Remove */}
                              <button disabled={isBusy} onClick={() => removeMutation.mutate(deployment._id)} className="p-1.5 text-dds-text-muted hover:text-dds-red rounded-[4px] hover:bg-dds-bg transition-all disabled:opacity-50" title="Remove">
                                {isBusy && loadingAction === `remove:${deployment._id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>

                              {/* Rollback */}
                              <button disabled={isBusy} onClick={() => handleRollback(deployment._id)} className="p-1.5 text-dds-text-muted hover:text-dds-white rounded-[4px] hover:bg-dds-bg transition-all disabled:opacity-50" title="Rollback">
                                {isBusy && loadingAction === `rollback:${deployment._id}` ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <DeploymentDetailModal deployment={selectedDeployment} onClose={() => setSelectedDeployment(null)} />

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
