import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Search,
  Plus,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useContainers } from '../hooks/useContainers';
import { useContainerHealthBatch } from '../hooks/useContainerHealth';
import { containerActionsApi } from '../api/containerActions';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';
import HealthBadge from '../components/ui/HealthBadge';
import CreateContainerModal from '../components/CreateContainerModal';
import ConfirmModal from '../components/ConfirmModal';
import {
  formatContainerName,
  truncateId,
  formatRelativeTime,
  formatPorts,
  formatImageName
} from '../utils/formatters';

type FilterType = 'all' | 'running' | 'stopped' | 'paused';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'paused',  label: 'Paused' },
];

const ContainersPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const { data: containers = [], isLoading, error } = useContainers();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const containerIds = useMemo(() => containers.map(c => c.id), [containers]);
  const { data: healthMap = {} } = useContainerHealthBatch(containerIds);

  const counts = useMemo(() => ({
    all:     containers.length,
    running: containers.filter(c => c.state?.status?.toLowerCase() === 'running').length,
    stopped: containers.filter(c => ['exited', 'dead'].includes(c.state?.status?.toLowerCase() || '')).length,
    paused:  containers.filter(c => c.state?.status?.toLowerCase() === 'paused').length,
  }), [containers]);

  const filteredContainers = useMemo(() => {
    let result = containers;
    if (activeFilter === 'running') {
      result = result.filter(c => c.state?.status?.toLowerCase() === 'running');
    } else if (activeFilter === 'stopped') {
      result = result.filter(c => ['exited', 'dead'].includes(c.state?.status?.toLowerCase() || ''));
    } else if (activeFilter === 'paused') {
      result = result.filter(c => c.state?.status?.toLowerCase() === 'paused');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.image?.toLowerCase().includes(query) ||
        c.id?.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => {
      const aRunning = a.state?.status?.toLowerCase() === 'running' ? 1 : 0;
      const bRunning = b.state?.status?.toLowerCase() === 'running' ? 1 : 0;
      if (aRunning !== bRunning) return bRunning - aRunning;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }, [containers, activeFilter, searchQuery]);

  const handleRemoveAll = async () => {
    setShowConfirm(false);
    setIsRemoving(true);
    try {
      const result = await containerActionsApi.removeAll();
      dispatch(addToast({ message: result.message, type: 'success', duration: 4000 }));
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    } catch (err: any) {
      dispatch(addToast({ message: err?.response?.data?.message || 'Failed to remove containers', type: 'error', duration: 4000 }));
    } finally {
      setIsRemoving(false);
    }
  };

  if (error) {
    return (
      <div className="h-full flex flex-col bg-dds-bg text-dds-white items-center justify-center p-8">
        <div className="bg-dds-surface border border-dds-red border-opacity-30 rounded-[12px] p-8 max-w-md text-center">
          <div className="text-5xl mb-4 text-dds-red">⚠️</div>
          <h2 className="text-2xl font-bold text-dds-white mb-2">Connection Error</h2>
          <p className="text-dds-text-muted mb-6">Could not connect to the DevOpsEase server.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dds-bg text-dds-white overflow-hidden relative">
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-dds-surface border border-dds-border flex items-center justify-center">
                <Box size={18} className="text-dds-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dds-white">Containers</h1>
                <p className="text-[13px] text-dds-text-secondary mt-1">Manage running Docker containers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {containers.length > 0 && (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={isRemoving}
                  className="btn-danger"
                >
                  <Trash2 size={14} />
                  {isRemoving ? 'Removing...' : 'Remove All'}
                </button>
              )}
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary"
              >
                <Plus size={14} /> Create Container
              </button>
            </div>
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
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search containers..."
                  className="pl-9 pr-4 py-1.5 bg-dds-bg border border-dds-border rounded-[6px] text-[12px] text-dds-white placeholder:text-dds-text-muted outline-none focus:border-dds-primary transition-colors w-64"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dds-surface/50 border-b border-dds-border text-[10px] font-medium text-dds-text-muted uppercase tracking-wider">
                    <th className="px-4 py-3 w-[20%]">Container Name</th>
                    <th className="px-4 py-3 w-[20%]">Image</th>
                    <th className="px-4 py-3 w-[15%]">Status</th>
                    <th className="px-4 py-3 w-[15%]">Ports</th>
                    <th className="px-4 py-3 w-[15%]">Created</th>
                    <th className="px-4 py-3 w-[15%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8">
                        <div className="flex justify-center"><div className="w-6 h-6 border-2 border-dds-primary border-t-transparent rounded-full animate-spin" /></div>
                      </td>
                    </tr>
                  ) : filteredContainers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-dds-text-muted">
                        No containers found.
                      </td>
                    </tr>
                  ) : (
                    filteredContainers.map(container => {
                      const name = formatContainerName(container.name);
                      const state = (container.state?.status || 'unknown').toLowerCase();
                      const isRunning = state === 'running';
                      const hasIssue = ['exited', 'dead'].includes(state);
                      const health = healthMap[container.id]?.healthStatus;

                      return (
                        <tr key={container.id} className="border-b border-dds-border/50 hover:bg-dds-surface/80 transition-all group cursor-pointer" onClick={(e) => {
                          // Ignore clicks on buttons inside the row
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                          navigate(`/container/${truncateId(container.id)}`);
                        }}>
                          <td className="px-4 py-3 font-medium text-dds-white flex items-center gap-2">
                            <Box size={14} className="text-dds-text-secondary" />
                            {name}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-dds-text-secondary truncate max-w-[150px]">
                            {formatImageName(container.image)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`badge ${isRunning ? 'badge-running' : hasIssue ? 'badge-failed' : state === 'paused' ? 'badge-warning' : ''}`}>
                                {isRunning && <span className="pulse-dot pulse-dot-blue mr-1" />}
                                {state}
                              </span>
                              {health && health !== 'HEALTHY' && (
                                <HealthBadge status={health} size="sm" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-dds-text-secondary truncate max-w-[150px]">
                            {formatPorts(container.ports)}
                          </td>
                          <td className="px-4 py-3 text-dds-text-muted">
                            {formatRelativeTime(container.created)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/container/${truncateId(container.id)}`); }} className="p-1.5 text-dds-text-muted hover:text-dds-white rounded-[4px] hover:bg-dds-bg transition-all" title="View Details">
                                <ChevronRight size={14} />
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

      <CreateContainerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRemoveAll}
        title="Remove all containers?"
        message={`This will force-remove all ${containers.length} container(s). This action cannot be undone.`}
        confirmLabel="Remove All"
        cancelLabel="Cancel"
      />
    </div>
  );
};

export default ContainersPage;
