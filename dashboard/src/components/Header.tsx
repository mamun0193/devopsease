import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  AlertTriangle,
  Pause
} from 'lucide-react';
import { useContainers, useHealthCheck } from '../hooks/useContainers';
import { getContainerStats } from '../utils/formatters';
import RefreshButton from './RefreshButton';

interface HeaderProps {
  onFilterChange?: (filter: 'all' | 'running' | 'stopped' | 'paused') => void;
  activeFilter?: 'all' | 'running' | 'stopped' | 'paused';
}

const Header: React.FC<HeaderProps> = ({ onFilterChange, activeFilter = 'all' }) => {
  const { data: containers = [], isFetching, refetch } = useContainers();
  const { data: health } = useHealthCheck();
  const stats = getContainerStats(containers);

  const handleFilterClick = (filter: 'all' | 'running' | 'stopped' | 'paused') => {
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  return (
    <header
      className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 transition-all duration-300 ease-out h-16"
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Activity size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse w-2.5 h-2.5" />
          </motion.div>
          <div className="hidden sm:block">
            <h1 className="font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent text-lg">DevOpsEase</h1>
          </div>
        </div>

        {/* Stats - Clickable for filtering */}
        <div className="hidden md:flex items-center gap-2">
          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'all'
              ? 'bg-slate-700 border-slate-600'
              : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
              }`}
            onClick={() => handleFilterClick('all')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Server size={16} className="text-slate-400" />
            <div className="flex flex-col items-start">
              <span className="font-semibold text-slate-100 text-sm">{stats.total}</span>
            </div>
          </motion.button>

          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'running'
              ? 'bg-emerald-500/20 border-emerald-500/50'
              : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            onClick={() => handleFilterClick('running')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col items-start">
              <span className="font-semibold text-emerald-400 text-sm">{stats.running}</span>
            </div>
          </motion.button>

          <motion.button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'stopped'
              ? 'bg-red-500/20 border-red-500/50'
              : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
              }`}
            onClick={() => handleFilterClick('stopped')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <AlertTriangle size={16} className="text-red-400" />
            <div className="flex flex-col items-start">
              <span className="font-semibold text-red-400 text-sm">{stats.stopped}</span>
            </div>
          </motion.button>

          {stats.paused > 0 && (
            <motion.button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'paused'
                ? 'bg-yellow-500/20 border-yellow-500/50'
                : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                }`}
              onClick={() => handleFilterClick('paused')}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Pause size={16} className="text-yellow-400" />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-yellow-400 text-sm">{stats.paused}</span>
              </div>
            </motion.button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-slate-400 hidden sm:inline text-xs">
              {health ? 'Connected' : 'Connecting...'}
            </span>
          </div>

          <RefreshButton
            onRefresh={() => { refetch(); }}
            isFetching={isFetching}
            size="md"
            variant="default"
            showLabel={false}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
