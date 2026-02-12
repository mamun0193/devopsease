import React from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Search,
  Filter,
  Plus,
  Trash2
} from 'lucide-react';
import type { Container } from '../api';
import ContainerCard from './ContainerCard';
import CreateContainerModal from './CreateContainerModal';
import { containerActionsApi } from '../api/containerActions';
import { useAppDispatch } from '../store/hooks';
// fetchContainers removed
import { addToast } from '../store/toastSlice';

interface ContainerListProps {
  containers: Container[];
  isLoading: boolean;
}

const ContainerList: React.FC<ContainerListProps> = ({
  containers,
  isLoading
}) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<'all' | 'running' | 'stopped'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const filteredContainers = React.useMemo(() => {
    let result = containers;

    // Apply state filter
    if (filter === 'running') {
      result = result.filter(c => c.state?.status?.toLowerCase() === 'running');
    } else if (filter === 'stopped') {
      result = result.filter(c => ['exited', 'dead'].includes(c.state?.status?.toLowerCase()));
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.image?.toLowerCase().includes(query) ||
        c.id?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [containers, filter, searchQuery]);

  // Sort: running first, then by creation time
  const sortedContainers = React.useMemo(() => {
    return [...filteredContainers].sort((a, b) => {
      const aRunning = a.state?.status?.toLowerCase() === 'running' ? 1 : 0;
      const bRunning = b.state?.status?.toLowerCase() === 'running' ? 1 : 0;
      if (aRunning !== bRunning) return bRunning - aRunning;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }, [filteredContainers]);

  const handleRemoveAll = async () => {
    setShowConfirm(false);
    setIsRemoving(true);
    try {
      const result = await containerActionsApi.removeAll();
      dispatch(addToast({ message: result.message, type: 'success', duration: 4000 }));
      // Refresh containers list via React Query
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    } catch (err: any) {
      dispatch(addToast({ message: err?.response?.data?.message || 'Failed to remove containers', type: 'error', duration: 4000 }));
    } finally {
      setIsRemoving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-100">
            <Box size={20} className="text-blue-400" />
            Containers
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Loading containers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-100">
          <Box size={20} className="text-blue-400" />
          Containers
          <span className="ml-2 px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full text-sm font-medium">
            {filteredContainers.length}
          </span>
        </h2>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search containers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="pl-10 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>

          {containers.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isRemoving}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isRemoving ? 'Removing...' : 'Remove All'}
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create Container
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Remove all containers?</h3>
            <p className="text-sm text-slate-400 mb-5">
              This will force-remove all {containers.length} container{containers.length !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveAll}
                className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium"
              >
                Remove All
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Container Grid */}
      {sortedContainers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
          <Box size={48} className="text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No containers found</h3>
          <p className="text-slate-500">
            {searchQuery || filter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Start a Docker container to see it here'}
          </p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          layout
        >
          {sortedContainers.map((container, index) => (
            <motion.div
              key={container.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="h-full"
            >
              <ContainerCard container={container} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Beginner Help */}
      <div className="mt-8 flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className="text-2xl">💡</div>
        <div>
          <p className="font-medium text-slate-200">New to containers?</p>
          <p className="text-slate-400 text-sm mt-1">Click on any container to see its details, logs, and if there are issues, we'll explain what's wrong in simple terms.</p>
        </div>
      </div>

      {/* Create Container Modal */}
      <CreateContainerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default ContainerList;
