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
import { useAlerts, useResolveAlert, useResolveAllAlerts } from '../hooks/useAlerts';
import type { Alert } from '../api/alerts';

type SeverityFilter = 'all' | 'CRITICAL' | 'WARNING' | 'INFO';
type ResolvedFilter = 'all' | 'unresolved' | 'resolved';

const SEVERITY_CONFIG = {
  CRITICAL: { color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/30', icon: AlertOctagon, dot: 'bg-dds-red' },
  WARNING: { color: 'text-dds-yellow', bg: 'bg-dds-yellow/10', border: 'border-dds-yellow/30', icon: AlertTriangle, dot: 'bg-dds-yellow' },
  INFO: { color: 'text-dds-blue', bg: 'bg-dds-blue/10', border: 'border-dds-blue/30', icon: Info, dot: 'bg-dds-blue' },
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
      className={`flex items-start gap-4 p-4 rounded-md border transition-all ${config.bg} ${config.border} ${alert.resolved ? 'opacity-50' : ''}`}
    >
      <div className={`mt-0.5 shrink-0 ${config.color}`}>
        <SeverityIcon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border ${config.bg} ${config.border} ${config.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {alert.severity}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-dds-text-secondary">
            <TypeIcon size={12} />
            {alert.type.replace(/_/g, ' ')}
          </span>
          {alert.resolved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-dds-green">
              <CheckCircle2 size={12} />
              Resolved
            </span>
          )}
        </div>

        <p className="text-[13px] text-dds-text-primary leading-relaxed">{alert.message}</p>

        <div className="flex items-center gap-3 mt-2">
          {alert.containerId && (
            <span className="text-[11px] text-dds-text-secondary font-mono bg-dds-muted/50 px-2 py-0.5 rounded-md">
              {alert.containerId}
            </span>
          )}
          <span className="text-[11px] font-mono text-dds-text-secondary">
            {formatDateTime(alert.createdAt)}
          </span>
        </div>
      </div>

      {!alert.resolved && (
        <button
          onClick={() => resolveAlert.mutate(alert._id)}
          disabled={resolveAlert.isPending}
          className="shrink-0 p-2 rounded-md text-dds-text-muted hover:text-dds-green hover:bg-dds-green/10 border border-transparent hover:border-dds-green/30 transition-all"
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
    <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
      
      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-2 rounded-md bg-dds-surface border border-dds-border hover:bg-dds-muted transition-colors text-dds-text-muted hover:text-dds-text-primary"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight flex items-center gap-2">
                  <Bell size={24} className="text-dds-blue" />
                  Alerts
                </h1>
                <p className="text-[13px] text-dds-text-secondary mt-0.5">
                  {totalUnresolved > 0 ? `${totalUnresolved} unresolved alert${totalUnresolved !== 1 ? 's' : ''}` : 'No active alerts'}
                  {criticalCount > 0 && <span className="text-dds-red ml-2">({criticalCount} critical)</span>}
                </p>
              </div>
            </div>

            {totalUnresolved > 0 && (
              <button
                onClick={() => resolveAll.mutate()}
                disabled={resolveAll.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-dds-green/10 border border-dds-green/30 text-dds-green hover:bg-dds-green/20 transition-colors text-[13px] font-medium"
              >
                <CheckCircle2 size={16} />
                Resolve All
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-[13px] text-dds-text-muted">
              <Filter size={14} />
            </div>

            {(['all', 'unresolved', 'resolved'] as ResolvedFilter[]).map(f => (
              <button
                key={f}
                onClick={() => { setResolvedFilter(f); setPage(1); }}
                className={`px-3 py-1.5 text-[12px] font-mono rounded-md border transition-all ${resolvedFilter === f
                    ? 'bg-dds-blue/10 border-dds-blue text-dds-blue'
                    : 'bg-dds-surface border-dds-border text-dds-text-muted hover:bg-dds-muted'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}

            <div className="w-px h-5 bg-dds-border" />

            {(['all', 'CRITICAL', 'WARNING', 'INFO'] as SeverityFilter[]).map(f => {
              const cfg = f !== 'all' ? SEVERITY_CONFIG[f] : null;
              return (
                <button
                  key={f}
                  onClick={() => setSeverityFilter(f)}
                  className={`px-3 py-1.5 text-[12px] font-mono rounded-md border transition-all flex items-center gap-1.5 ${severityFilter === f
                      ? cfg
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : 'bg-dds-blue/10 border-dds-blue text-dds-blue'
                      : 'bg-dds-surface border-dds-border text-dds-text-muted hover:bg-dds-muted'
                    }`}
                >
                  {cfg && <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                  {f === 'all' ? 'All' : f}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-4 p-4 rounded-md bg-dds-muted/30 border border-dds-border">
                  <div className="w-5 h-5 bg-dds-muted rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-dds-muted rounded w-24" />
                    <div className="h-4 bg-dds-muted rounded w-3/4" />
                    <div className="h-3 bg-dds-muted rounded w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-24 gap-4 text-center">
              <Bell size={40} className="text-dds-text-muted" />
              <p className="text-[14px] font-medium text-dds-text-primary">No alerts found</p>
              <p className="text-[13px] text-dds-text-secondary">
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

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[13px] font-mono text-dds-text-secondary">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AlertsPage;
