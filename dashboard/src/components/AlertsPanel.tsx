import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Cpu,
  MemoryStick,
  Zap,
  Heart,
  Server,
  Gauge,
} from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useResolveAlert, useResolveAllAlerts } from '../hooks/useAlerts';
import type { Alert } from '../api/alerts';

interface AlertsPanelProps {
  open: boolean;
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertOctagon },
  WARNING: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
  INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  CRASH: Zap,
  CRASH_LOOP: Zap,
  OOM: MemoryStick,
  HIGH_CPU: Cpu,
  HIGH_MEMORY: MemoryStick,
  QUOTA_WARNING: Gauge,
  HEALTH_DEGRADED: Heart,
  HEALTH_UNHEALTHY: Heart,
};

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const AlertItem: React.FC<{ alert: Alert }> = ({ alert }) => {
  const resolveAlert = useResolveAlert();
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  const SeverityIcon = config.icon;
  const TypeIcon = TYPE_ICONS[alert.type] || Server;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60 }}
      className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg} ${config.border} ${alert.resolved ? 'opacity-50' : ''}`}
    >
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <SeverityIcon size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <TypeIcon size={12} className="text-slate-400 shrink-0" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {alert.type.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-500">{formatTimeAgo(alert.createdAt)}</span>
        </div>

        <p className="text-sm text-slate-200 leading-snug">{alert.message}</p>

        {alert.containerId && (
          <p className="text-xs text-slate-500 mt-1 font-mono">{alert.containerId}</p>
        )}
      </div>

      {!alert.resolved && (
        <button
          onClick={() => resolveAlert.mutate(alert._id)}
          disabled={resolveAlert.isPending}
          className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Resolve alert"
        >
          <CheckCircle2 size={14} />
        </button>
      )}
    </motion.div>
  );
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ open, onClose }) => {
  const alerts = useAppSelector(state => state.alerts.alerts);
  const unresolvedCount = useAppSelector(state => state.alerts.unresolvedCount);
  const resolveAll = useResolveAllAlerts();

  // Show most recent 30 alerts in the panel
  const visibleAlerts = alerts.slice(0, 30);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-slate-900 border-l border-slate-800 z-[85] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-100">Alerts</h2>
                {unresolvedCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                    {unresolvedCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unresolvedCount > 0 && (
                  <button
                    onClick={() => resolveAll.mutate()}
                    disabled={resolveAll.isPending}
                    className="text-xs text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                  >
                    Resolve all
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Alert List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {visibleAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-20">
                  <Bell size={32} className="text-slate-700" />
                  <p className="text-slate-500 text-sm">No alerts yet</p>
                  <p className="text-slate-600 text-xs">
                    Alerts will appear here when abnormal<br />conditions are detected.
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {visibleAlerts.map(alert => (
                    <AlertItem key={alert._id} alert={alert} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AlertsPanel;
