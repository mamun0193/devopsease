import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GitBranch, AlertCircle, Loader2 } from 'lucide-react';
import RefreshButton from '../components/RefreshButton';
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import ConnectRepoModal from '../components/ConnectRepoModal';
import RepoListTable from '../components/RepoListTable';
import { repoApi } from '../services/repo.api';
import type { Repository } from '../services/repo.api';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';


const CardSkeleton: React.FC = () => (
  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 bg-slate-800 rounded animate-pulse w-32" />
            <div className="h-2.5 bg-slate-800/60 rounded animate-pulse w-48" />
          </div>
          <div className="h-5 w-20 bg-slate-800 rounded-full animate-pulse" />
        </div>
        {/* Meta */}
        <div className="flex gap-3 mb-4">
          <div className="h-2.5 bg-slate-800/70 rounded animate-pulse w-20" />
          <div className="h-2.5 bg-slate-800/70 rounded animate-pulse w-14" />
          <div className="h-2.5 bg-slate-800/70 rounded animate-pulse w-16" />
        </div>
        {/* Divider */}
        <div className="h-px bg-slate-800 mb-3.5" />
        {/* Buttons */}
        <div className="flex gap-2">
          <div className="flex-1 h-8 bg-slate-800/70 rounded-xl animate-pulse" />
          <div className="flex-1 h-8 bg-slate-800/70 rounded-xl animate-pulse" />
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

  const repoFilterItems: FilterItem[] = React.useMemo(() => [
    {
      key: 'all',
      label: 'Total',
      count: repos.length,
      color: 'text-slate-300',
      activeBg: 'bg-slate-700',
      activeBorder: 'border-slate-600',
      icon: <GitBranch size={14} className="text-slate-400" />,
    },
    {
      key: 'active',
      label: 'Connected',
      count: repos.filter(r => r.status === 'active').length,
      color: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20',
      activeBorder: 'border-emerald-500/50',
      dot: 'bg-emerald-400',
    },
    {
      key: 'disconnected',
      label: 'Disconnected',
      count: repos.filter(r => r.status === 'disconnected').length,
      color: 'text-slate-400',
      activeBg: 'bg-slate-500/20',
      activeBorder: 'border-slate-500/50',
      dot: 'bg-slate-400',
    },
  ], [repos]);

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
    <div className="min-h-screen bg-slate-950">
      <Header onFilterChange={() => {}} activeFilter="all" filterItems={repoFilterItems} />
      <ResourceNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page heading */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <GitBranch size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Repositories</h1>
              <p className="text-slate-500 text-sm">
                {isLoading
                  ? 'Loading…'
                  : `${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'} connected`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Refresh button */}
            <RefreshButton
              onRefresh={handleRefresh}
              isLoading={isLoading || isRefreshing}
              size="md"
            />

            {/* Connect repo CTA */}
            <motion.button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/20 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              Connect Repository
            </motion.button>
          </div>
        </motion.div>

        {/* Main container */}
        <motion.div
          className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Stats bar */}
          {!isLoading && !error && repos.length > 0 && (
            <div className="flex items-center gap-6 px-6 py-3.5 border-b border-slate-800 bg-slate-900/40">
              {[
                { label: 'Total', value: repos.length, color: 'text-slate-200' },
                { label: 'Connected', value: repos.filter((r) => r.status === 'active').length, color: 'text-emerald-400' },
                { label: 'Disconnected', value: repos.filter((r) => r.status === 'disconnected').length, color: 'text-slate-400' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500">{s.label}</span>
                  <span className={`font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

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
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <h3 className="text-slate-200 font-semibold mb-2">Failed to load repositories</h3>
                <p className="text-slate-500 text-sm mb-5 max-w-xs">{error}</p>
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
        </motion.div>

        {/* Future CI/CD hint */}
        {!isLoading && !error && repos.length > 0 && (
          <motion.p
            className="text-center text-slate-600 text-xs mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Build status · Deployment tracking · Logs coming soon (Day 69–73)
          </motion.p>
        )}
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
