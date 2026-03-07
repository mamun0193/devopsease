import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
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
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAlerts, useResolveAlert, useResolveAllAlerts } from '../hooks/useAlerts';
import type { Alert } from '../api/alerts';

type SeverityFilter = 'all' | 'CRITICAL' | 'WARNING' | 'INFO';
type ResolvedFilter = 'all' | 'unresolved' | 'resolved';

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertOctagon, dot: 'bg-red-500' },
  WARNING: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, dot: 'bg-amber-500' },
  INFO: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, dot: 'bg-blue-500' },
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

function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
}

const AlertRow: React.FC<{ alert: Alert }> = ({ alert }) => {
  const resolveAlert = useResolveAlert();
  const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  const SeverityIcon = config.icon;
  const TypeIcon = TYPE_ICONS[alert.type] || Server;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${config.bg} ${config.border} ${alert.resolved ? 'opacity-50' : ''}`}
    >
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <SeverityIcon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${config.bg} ${config.border} ${config.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {alert.severity}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
            <TypeIcon size={12} />
            {alert.type.replace(/_/g, ' ')}
          </span>
          {alert.resolved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={12} />
              Resolved
            </span>
          )}
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">{alert.message}</p>

        <div className="flex items-center gap-3 mt-2">
          {alert.containerId && (
            <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-2 py-0.5 rounded">
              {alert.containerId}
            </span>
          )}
          <span className="text-xs text-slate-500">
            {formatDateTime(alert.createdAt)}
          </span>
        </div>
      </div>

      {!alert.resolved && (
        <button
          onClick={() => resolveAlert.mutate(alert._id)}
          disabled={resolveAlert.isPending}
          className="shrink-0 p-2 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all"
          title="Resolve"
        >
          <CheckCircle2 size={16} />
        </button>
      )}
    </motion.div>
  );
};

const AlertsPage: React.FC = () => {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('unresolved');
  const [page, setPage] = useState(1);

  const resolvedParam = resolvedFilter === 'all' ? undefined : resolvedFilter === 'resolved';
  const { data, isLoading } = useAlerts({ resolved: resolvedParam, page, limit: 50 });
  const resolveAll = useResolveAllAlerts();

  const alerts = data?.alerts || [];
  const pagination = data?.pagination;

  const filteredAlerts = severityFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === severityFilter);

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved).length;
  const totalUnresolved = alerts.filter(a => !a.resolved).length;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Bell size={24} className="text-blue-400" />
                Alerts
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {totalUnresolved > 0 ? `${totalUnresolved} unresolved alert${totalUnresolved !== 1 ? 's' : ''}` : 'No active alerts'}
                {criticalCount > 0 && <span className="text-red-400 ml-2">({criticalCount} critical)</span>}
              </p>
            </div>
          </div>

          {totalUnresolved > 0 && (
            <button
              onClick={() => resolveAll.mutate()}
              disabled={resolveAll.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              Resolve All
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <Filter size={14} />
          </div>

          {/* Resolved filter */}
          {(['all', 'unresolved', 'resolved'] as ResolvedFilter[]).map(f => (
            <button
              key={f}
              onClick={() => { setResolvedFilter(f); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${resolvedFilter === f
                  ? 'bg-slate-700 border-slate-600 text-slate-200'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          <div className="w-px h-5 bg-slate-700" />

          {/* Severity filter */}
          {(['all', 'CRITICAL', 'WARNING', 'INFO'] as SeverityFilter[]).map(f => {
            const cfg = f !== 'all' ? SEVERITY_CONFIG[f] : null;
            return (
              <button
                key={f}
                onClick={() => setSeverityFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all flex items-center gap-1.5 ${severityFilter === f
                    ? cfg
                      ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                      : 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                  }`}
              >
                {cfg && <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                {f === 'all' ? 'All' : f}
              </button>
            );
          })}
        </div>

        {/* Alert List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-800">
                <div className="w-5 h-5 bg-slate-700 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-700 rounded w-24" />
                  <div className="h-4 bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-700 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Bell size={40} className="text-slate-700" />
            <p className="text-slate-400 font-medium">No alerts found</p>
            <p className="text-sm text-slate-600">
              {resolvedFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Alerts will appear here when abnormal conditions are detected in your containers.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredAlerts.map(alert => (
                <AlertRow key={alert._id} alert={alert} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 transition-all"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
