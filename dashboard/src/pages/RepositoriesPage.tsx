import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GitBranch, AlertCircle, Loader2 } from 'lucide-react';
import RefreshButton from '../components/RefreshButton';
import ConnectRepoModal from '../components/ConnectRepoModal';
import RepoListTable from '../components/RepoListTable';
import { repoApi } from '../services/repo.api';
import type { Repository } from '../services/repo.api';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';

const CardSkeleton: React.FC = () => (
  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="card p-5">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-dds-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 bg-dds-muted rounded animate-pulse w-32" />
            <div className="h-2.5 bg-dds-muted/60 rounded animate-pulse w-48" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const RepositoriesPage: React.FC = () => {
  const dispatch = useAppDispatch();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRepos = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const data = await repoApi.getAll();
      setRepos(data ?? []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load repositories.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const handleDelete = async (id: string) => {
    // Optimistic update
    const prev = [...repos];
    setRepos((r) => r.filter((repo) => repo._id !== id));
    try {
      await repoApi.delete(id);
      dispatch(addToast({ message: 'Repository disconnected.', type: 'success', duration: 3500 }));
    } catch (err: any) {
      // Rollback
      setRepos(prev);
      const message = err?.response?.data?.message || 'Failed to delete repository.';
      dispatch(addToast({ message, type: 'error', duration: 5000 }));
    }
  };

  const handleRefresh = () => {
    fetchRepos({ silent: true });
  };

  return (
    <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <GitBranch size={24} className="text-dds-text-primary" />
                  <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Repositories</h1>
              </div>
              <div className="flex items-center gap-2.5">
                  <RefreshButton onRefresh={handleRefresh} isLoading={isLoading || isRefreshing} size="md" />
                  <button
                      onClick={() => setModalOpen(true)}
                      className="btn-primary flex items-center gap-2"
                  >
                      <Plus size={16} />
                      Connect Repository
                  </button>
              </div>
          </div>

          {/* Stats Bar (optional, matching DDS subtle style if needed) */}
          {!isLoading && !error && repos.length > 0 && (
            <div className="flex items-center gap-6 px-2 text-[13px] font-mono text-dds-text-secondary">
              <span className="text-dds-text-primary">{repos.length} Total</span>
              <span className="text-dds-green">{repos.filter((r) => r.status === 'active').length} Connected</span>
              <span>{repos.filter((r) => r.status === 'disconnected').length} Disconnected</span>
            </div>
          )}

          {/* Main container */}
          <div className="card overflow-hidden">
            {/* Content */}
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CardSkeleton />
                </motion.div>
              )}

              {!isLoading && error && (
                <motion.div
                  key="error"
                  className="flex flex-col items-center justify-center py-20 px-6 text-center"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-dds-red/10 border border-dds-red/30 flex items-center justify-center mb-4">
                    <AlertCircle size={24} className="text-dds-red" />
                  </div>
                  <h3 className="text-dds-text-primary font-semibold mb-2">Failed to load repositories</h3>
                  <p className="text-dds-text-secondary text-[13px] mb-5 max-w-xs">{error}</p>
                  <RefreshButton onRefresh={() => fetchRepos()} size="md" />
                </motion.div>
              )}

              {!isLoading && !error && (
                <motion.div
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <RepoListTable repos={repos} onDelete={handleDelete} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Modal */}
      <ConnectRepoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => fetchRepos({ silent: true })}
      />
    </div>
  );
};

export default RepositoriesPage;
