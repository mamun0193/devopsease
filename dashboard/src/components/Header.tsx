import React from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  AlertTriangle,
  Pause,
  Bell,
  Rocket,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContainers, useHealthCheck } from '../hooks/useContainers';
import { getContainerStats } from '../utils/formatters';
import { useDeployments } from '../hooks/useDeployments';
import RefreshButton from './RefreshButton';
import UserMenu from './UserMenu';
import AlertsPanel from './AlertsPanel';
import { useAppSelector } from '../store/hooks';

export interface FilterItem {
  key: string;
  label: string;
  count: number;
  color: string;
  activeBg: string;
  activeBorder: string;
  icon?: React.ReactNode;
  dot?: string;
}

export interface QuickLink {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface HeaderProps {
  onFilterChange?: (filter: any) => void;
  activeFilter?: string;
  filterItems?: FilterItem[];
  quickLinks?: QuickLink[];
}

const Header: React.FC<HeaderProps> = ({ onFilterChange, activeFilter = 'all', filterItems, quickLinks }) => {
  const { data: containers = [], isFetching, refetch } = useContainers();
  const { data: deployments = [] } = useDeployments();
  const navigate = useNavigate();
  const stats = getContainerStats(containers);
  const [headerHidden, setHeaderHidden] = React.useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = React.useState(false);
  const unresolvedCount = useAppSelector(state => state.alerts.unresolvedCount);
  const lastScrollY = React.useRef(0);

  const deployStats = React.useMemo(() => ({
    running: deployments.filter(d => d.status === 'running').length,
    deploying: deployments.filter(d => d.status === 'deploying').length,
    failed: deployments.filter(d => d.status === 'failed').length,
    stopped: deployments.filter(d => d.status === 'stopped').length,
    total: deployments.length,
  }), [deployments]);

  React.useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 60 && currentY > lastScrollY.current) {
        setHeaderHidden(true);
      } else {
        setHeaderHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Expose hidden state via a custom event for ResourceNav
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('header-visibility', { detail: { hidden: headerHidden } }));
  }, [headerHidden]);

  const handleFilterClick = (filter: string) => {
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  return (
    <header
      className={`bg-dds-bg/80 backdrop-blur-md border-b border-dds-border sticky top-0 z-40 transition-transform duration-300 ease-out h-12 ${headerHidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">
        {/* Left: Global Search / Workspace (DDS Style) */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] border border-dds-border bg-dds-surface text-dds-text-secondary hover:text-dds-white hover:border-dds-primary transition-all duration-200"
          >
            <span className="text-[12px] font-medium">Search anything...</span>
            <div className="flex items-center gap-1 ml-4 text-[10px] font-mono text-dds-text-muted bg-dds-bg px-1.5 py-0.5 rounded border border-dds-border">
              <span>Ctrl</span><span>K</span>
            </div>
          </button>
        </div>

        {/* Center: quick nav links OR filter badges */}
        {quickLinks ? (
          <div className="hidden md:flex items-center gap-2">
            {quickLinks.map((ql) => (
              <motion.button
                key={ql.path}
                onClick={() => navigate(ql.path)}
                title="Back to public site"
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                {ql.icon}
                <span className="text-xs font-medium">{ql.label}</span>
              </motion.button>
            ))}
          </div>
        ) : onFilterChange && filterItems ? (
          <div className="hidden md:flex items-center gap-2">
            {filterItems.map((item, i) => (
              <motion.button
                key={item.key}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${activeFilter === item.key
                  ? `${item.activeBg} ${item.activeBorder}`
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50'
                  }`}
                onClick={() => handleFilterClick(item.key)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {item.dot && <div className={`w-2 h-2 rounded-full ${item.dot}`} />}
                {item.icon}
                <span className={`font-semibold text-sm ${item.color}`}>{item.count}</span>
              </motion.button>
            ))}
          </div>
        ) : onFilterChange && (
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
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">


          {/* Deployment status pill */}
          {deployStats.total > 0 && (
            <button
              onClick={() => navigate('/deployments')}
              title="View deployments"
              className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-dds-border bg-dds-surface hover:border-dds-primary/50 hover:bg-dds-muted transition-all text-[12px] font-mono"
            >
              <Rocket size={12} className="text-dds-primary" />
              <div className="flex items-center gap-3">
                {deployStats.running > 0 && (
                  <span className="flex items-center gap-1.5 text-dds-green font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-dds-green animate-pulse" />
                    {deployStats.running}
                  </span>
                )}
                {deployStats.deploying > 0 && (
                  <span className="flex items-center gap-1.5 text-dds-yellow font-medium">
                    <Loader2 size={10} className="animate-spin" />
                    {deployStats.deploying}
                  </span>
                )}
                {deployStats.failed > 0 && (
                  <span className="flex items-center gap-1.5 text-dds-red font-medium">
                    <XCircle size={10} />
                    {deployStats.failed}
                  </span>
                )}
                {deployStats.stopped > 0 && deployStats.running === 0 && deployStats.deploying === 0 && deployStats.failed === 0 && (
                  <span className="text-dds-text-muted font-medium">{deployStats.stopped} stopped</span>
                )}
              </div>
            </button>
          )}

          <RefreshButton
            onRefresh={() => { refetch(); }}
            isFetching={isFetching}
            size="md"
            variant="default"
            showLabel={false}
          />

          {/* Alert Bell */}
          <button
            onClick={() => setAlertsPanelOpen(true)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            title="View alerts"
          >
            <Bell size={18} />
            {unresolvedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1 border-2 border-slate-900">
                {unresolvedCount > 99 ? '99+' : unresolvedCount}
              </span>
            )}
          </button>

          <div className="w-px h-6 bg-slate-800" />

          <UserMenu />
        </div>
      </div>

      <AlertsPanel open={alertsPanelOpen} onClose={() => setAlertsPanelOpen(false)} />
    </header>
  );
};

export default Header;
