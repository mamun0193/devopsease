import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import {
    Activity, Shield, Zap, Server, Database, Radio, Clock,
    AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight,
    RefreshCw, Wifi, Gauge
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HealthDimensions {
    availability: number;
    reliability: number;
    performance: number;
    security: number;
}

interface SubsystemHealth {
    name: string;
    status: string;
    score: number;
    dimensions: HealthDimensions;
    components?: any[];
    jobs?: any[];
    metrics?: any;
}

interface PlatformHealth {
    status: string;
    score: number;
    dimensions: HealthDimensions;
    subsystems: {
        infrastructure: SubsystemHealth;
        gateway: SubsystemHealth;
        scheduler: SubsystemHealth;
    };
    explanation: {
        reason: string;
        rootCauses: string[];
        recommendations: string[];
        confidence: number;
        affectedResources: any[];
    };
    evaluatedAt: string;
}

interface PlatformEvent {
    correlationId: string;
    domain: string;
    eventType: string;
    severity: string;
    summary: string;
    resourceType: string;
    resourceId: string;
    timestamp: string;
    explanation?: any;
}

interface AlertSummary {
    summary: Record<string, Record<string, { count: number; suppressedTotal: number; latestAt: string }>>;
    totalUnresolved: number;
}

// ─── Page Component ───────────────────────────────────────────────────────────

const ObservabilityPage: React.FC = () => {
    const [health, setHealth] = useState<PlatformHealth | null>(null);
    const [events, setEvents] = useState<PlatformEvent[]>([]);
    const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchAll = useCallback(async () => {
        try {
            const [healthRes, eventsRes, alertsRes] = await Promise.allSettled([
                api.get('/api/observability/health'),
                api.get('/api/observability/events/recent?limit=30'),
                api.get('/api/observability/alerts/summary'),
            ]);

            let hasError = false;

            if (healthRes.status === 'rejected') {
                hasError = true;
                const err = healthRes.reason as any;
                if (err.response?.status === 403) {
                    setError('Admin privileges required to view platform observability');
                } else {
                    setError('Failed to fetch platform health data');
                }
            } else {
                const healthData = healthRes.value.data?.data || healthRes.value.data;
                if (healthData && healthData.status) {
                    setHealth(healthData);
                } else {
                    hasError = true;
                    setError('Invalid health data received from server');
                }
            }

            if (!hasError) setError(null);

            if (eventsRes.status === 'fulfilled') {
                setEvents(eventsRes.value.data?.data || eventsRes.value.data || []);
            }
            if (alertsRes.status === 'fulfilled') {
                setAlertSummary(alertsRes.value.data?.data || alertsRes.value.data);
            }

            setLastRefresh(new Date());
        } catch (err: any) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15000);
        return () => clearInterval(interval);
    }, [fetchAll]);

    return (
            <div className="p-6 max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-dds-white flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                                <Activity size={18} className="text-emerald-400" />
                            </div>
                            Platform Observability
                        </h1>
                        <p className="text-sm text-dds-text-muted mt-1">
                            Runtime health, events, and alerting across all subsystems
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-dds-text-muted">
                            Updated {lastRefresh.toLocaleTimeString()}
                        </span>
                        <button
                            onClick={fetchAll}
                            className="p-2 rounded-lg bg-dds-surface border border-dds-border hover:bg-dds-surface/80 text-dds-text-secondary hover:text-dds-white transition-colors"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {loading && !health ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-dds-primary border-t-transparent" />
                    </div>
                ) : health ? (
                    <>
                        {/* Health Score + Dimensions */}
                        <HealthScorePanel health={health} />

                        {/* Subsystem Status Grid */}
                        <SubsystemGrid health={health} />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Event Stream */}
                            <div className="lg:col-span-2">
                                <EventStream events={events} />
                            </div>

                            {/* Alert Summary */}
                            <div>
                                <AlertSummaryPanel summary={alertSummary} />
                            </div>
                        </div>

                        {/* Scheduler Health */}
                        {health.subsystems.scheduler?.jobs && health.subsystems.scheduler.jobs.length > 0 && (
                            <SchedulerPanel scheduler={health.subsystems.scheduler} />
                        )}
                    </>
                ) : !loading && !health && !error ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-6 text-center text-amber-400">
                        Platform health data is currently unavailable.
                    </div>
                ) : null}
            </div>
    );
};

// ─── Health Score Panel ───────────────────────────────────────────────────────

const HealthScorePanel: React.FC<{ health: PlatformHealth }> = ({ health }) => {
    const statusColor = health.status === 'HEALTHY' ? 'emerald' : health.status === 'DEGRADED' ? 'amber' : 'red';
    const statusIcon = health.status === 'HEALTHY' ? CheckCircle2 : health.status === 'DEGRADED' ? AlertTriangle : XCircle;
    const StatusIcon = statusIcon;

    return (
        <div className="bg-dds-surface border border-dds-border rounded-xl p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    {/* Score Gauge */}
                    <div className="relative w-20 h-20">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-dds-border" />
                            <circle
                                cx="50" cy="50" r="42" fill="none" strokeWidth="6"
                                stroke={`var(--color-${statusColor}-400, #10b981)`}
                                strokeDasharray={`${(health.score / 100) * 264} 264`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                                style={{ filter: `drop-shadow(0 0 6px var(--color-${statusColor}-400, #10b981))` }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xl font-bold text-${statusColor}-400`}>{health.score}</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <StatusIcon size={16} className={`text-${statusColor}-400`} />
                            <span className={`text-lg font-semibold text-${statusColor}-400`}>{health.status}</span>
                        </div>
                        <p className="text-sm text-dds-text-muted mt-1 max-w-md">{health.explanation.reason}</p>
                    </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-3">
                    <DimensionBadge label="Availability" value={health.dimensions.availability} icon={Wifi} />
                    <DimensionBadge label="Reliability" value={health.dimensions.reliability} icon={Shield} />
                    <DimensionBadge label="Performance" value={health.dimensions.performance} icon={Zap} />
                    <DimensionBadge label="Security" value={health.dimensions.security} icon={Shield} />
                </div>
            </div>

            {/* Root Causes & Recommendations */}
            {health.explanation.rootCauses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dds-border grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs text-dds-text-muted uppercase tracking-wider mb-2">Root Causes</h4>
                        {health.explanation.rootCauses.map((cause, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-amber-400">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                <span>{cause}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h4 className="text-xs text-dds-text-muted uppercase tracking-wider mb-2">Recommendations</h4>
                        {health.explanation.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-cyan-400">
                                <Zap size={12} className="mt-0.5 shrink-0" />
                                <span>{rec}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const DimensionBadge: React.FC<{ label: string; value: number; icon: React.ElementType }> = ({ label, value, icon: Icon }) => {
    const color = value >= 80 ? 'emerald' : value >= 50 ? 'amber' : 'red';
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-${color}-500/5 border border-${color}-500/20`}>
            <Icon size={12} className={`text-${color}-400`} />
            <div>
                <div className="text-[10px] text-dds-text-muted uppercase">{label}</div>
                <div className={`text-sm font-bold text-${color}-400`}>{value}</div>
            </div>
        </div>
    );
};

// ─── Subsystem Status Grid ────────────────────────────────────────────────────

const SubsystemGrid: React.FC<{ health: PlatformHealth }> = ({ health }) => {
    // Infrastructure components (Docker, Redis, MongoDB)
    const infraComponents = health.subsystems.infrastructure.components || [];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {infraComponents.map((comp: any) => (
                <StatusCard key={comp.name} name={comp.name} status={comp.status} score={comp.score} icon={
                    comp.name === 'Docker' ? Server : comp.name === 'Redis' ? Database : Database
                } />
            ))}
            <StatusCard name="Gateway" status={health.subsystems.gateway.status} score={health.subsystems.gateway.score} icon={Radio} />
            <StatusCard name="Scheduler" status={health.subsystems.scheduler.status} score={health.subsystems.scheduler.score} icon={Clock} />
            <StatusCard name="Platform" status={health.status} score={health.score} icon={Gauge} />
        </div>
    );
};

const StatusCard: React.FC<{ name: string; status: string; score: number; icon: React.ElementType }> = ({ name, status, score, icon: Icon }) => {
    const color = status === 'HEALTHY' ? 'emerald' : status === 'DEGRADED' ? 'amber' : 'red';
    return (
        <div className={`bg-dds-surface border border-dds-border rounded-lg p-4 hover:border-${color}-500/30 transition-colors`}>
            <div className="flex items-center justify-between mb-2">
                <Icon size={14} className="text-dds-text-muted" />
                <div className={`w-2 h-2 rounded-full bg-${color}-400`} style={{ boxShadow: `0 0 8px var(--color-${color}-400, #10b981)` }} />
            </div>
            <div className="text-xs text-dds-text-muted">{name}</div>
            <div className={`text-lg font-bold text-${color}-400`}>{score}</div>
        </div>
    );
};

// ─── Event Stream ─────────────────────────────────────────────────────────────

const EventStream: React.FC<{ events: PlatformEvent[] }> = ({ events }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const severityColor: Record<string, string> = {
        CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
        ERROR: 'text-red-400 bg-red-500/10 border-red-500/20',
        WARNING: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        INFO: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };

    const domainColor: Record<string, string> = {
        BUILD: 'text-violet-400',
        DEPLOYMENT: 'text-cyan-400',
        RELEASE: 'text-emerald-400',
        PREVIEW: 'text-pink-400',
        DOMAIN: 'text-amber-400',
        CERTIFICATE: 'text-yellow-400',
        GATEWAY: 'text-blue-400',
        CONTAINER: 'text-orange-400',
        SCHEDULER: 'text-indigo-400',
        PLATFORM: 'text-emerald-400',
    };

    return (
        <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-dds-white flex items-center gap-2">
                    <Activity size={16} className="text-dds-primary" />
                    Live Event Stream
                </h2>
                <span className="text-xs text-dds-text-muted">{events.length} recent events</span>
            </div>

            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
                    <p className="text-sm text-dds-text-secondary">No notable events</p>
                    <p className="text-xs text-dds-text-muted mt-1">Platform is operating normally</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto scrollbar-hide">
                    {events.map((event, i) => {
                        const isExpanded = expandedId === event.correlationId + i;
                        const timeAgo = getTimeAgo(event.timestamp);

                        return (
                            <div key={event.correlationId + i} className="rounded-lg border border-dds-border/50 bg-dds-bg/50 hover:bg-dds-bg transition-colors">
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : event.correlationId + i)}
                                    className="w-full flex items-center gap-3 p-3 text-left"
                                >
                                    {/* Severity indicator */}
                                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${severityColor[event.severity] || severityColor.INFO}`}>
                                        {event.severity}
                                    </div>

                                    {/* Domain badge */}
                                    <span className={`text-xs font-mono ${domainColor[event.domain] || 'text-dds-text-muted'}`}>
                                        {event.domain}
                                    </span>

                                    {/* Event type */}
                                    <span className="text-sm text-dds-text-secondary flex-1 truncate">
                                        {event.eventType.replace(/_/g, ' ')}
                                    </span>

                                    {/* Time */}
                                    <span className="text-xs text-dds-text-muted shrink-0">{timeAgo}</span>

                                    {isExpanded ? <ChevronDown size={14} className="text-dds-text-muted" /> : <ChevronRight size={14} className="text-dds-text-muted" />}
                                </button>

                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-0 border-t border-dds-border/30 mt-0">
                                        <div className="text-xs space-y-1 mt-2">
                                            {event.summary && <div className="text-dds-text-secondary">{event.summary}</div>}
                                            {event.resourceType && (
                                                <div className="text-dds-text-muted">
                                                    Resource: <span className="text-dds-text-secondary font-mono">{event.resourceType} / {event.resourceId}</span>
                                                </div>
                                            )}
                                            <div className="text-dds-text-muted">
                                                Correlation: <span className="text-dds-text-secondary font-mono">{event.correlationId?.slice(0, 8)}</span>
                                            </div>
                                            {event.explanation?.reason && (
                                                <div className="mt-2 p-2 rounded bg-dds-border/20 text-dds-text-secondary">
                                                    {event.explanation.reason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── Alert Summary Panel ──────────────────────────────────────────────────────

const AlertSummaryPanel: React.FC<{ summary: AlertSummary | null }> = ({ summary }) => {
    const severityOrder = ['CRITICAL', 'WARNING', 'INFO'];

    return (
        <div className="bg-dds-surface border border-dds-border rounded-xl p-5 h-full">
            <h2 className="text-base font-semibold text-dds-white flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-amber-400" />
                Alert Summary
                {summary && summary.totalUnresolved > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30">
                        {summary.totalUnresolved}
                    </span>
                )}
            </h2>

            {!summary || summary.totalUnresolved === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 size={28} className="text-emerald-400 mb-2" />
                    <p className="text-sm text-dds-text-secondary">No active alerts</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {Object.entries(summary.summary).map(([domain, severities]) => (
                        <div key={domain} className="rounded-lg bg-dds-bg/50 border border-dds-border/30 p-3">
                            <div className="text-xs font-mono text-dds-text-muted uppercase mb-2">{domain}</div>
                            <div className="flex gap-2 flex-wrap">
                                {severityOrder.map(sev => {
                                    const data = severities[sev];
                                    if (!data) return null;
                                    const color = sev === 'CRITICAL' ? 'red' : sev === 'WARNING' ? 'amber' : 'blue';
                                    return (
                                        <div key={sev} className={`flex items-center gap-1.5 px-2 py-1 rounded bg-${color}-500/10 border border-${color}-500/20`}>
                                            <div className={`w-1.5 h-1.5 rounded-full bg-${color}-400`} />
                                            <span className={`text-xs font-bold text-${color}-400`}>{data.count}</span>
                                            <span className="text-[10px] text-dds-text-muted">{sev}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Scheduler Panel ──────────────────────────────────────────────────────────

const SchedulerPanel: React.FC<{ scheduler: SubsystemHealth }> = ({ scheduler }) => {
    return (
        <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-dds-white flex items-center gap-2 mb-4">
                <Clock size={16} className="text-indigo-400" />
                Scheduler Jobs
                <span className="text-xs text-dds-text-muted ml-2">{scheduler.jobs?.length || 0} registered</span>
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs text-dds-text-muted border-b border-dds-border">
                            <th className="pb-2 font-medium">Job</th>
                            <th className="pb-2 font-medium text-right">Runs</th>
                            <th className="pb-2 font-medium text-right">Errors</th>
                            <th className="pb-2 font-medium text-right">Duration</th>
                            <th className="pb-2 font-medium text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dds-border/30">
                        {(scheduler.jobs || []).map((job: any) => (
                            <tr key={job.name} className="text-sm">
                                <td className="py-2 font-mono text-dds-text-secondary text-xs">{job.name}</td>
                                <td className="py-2 text-right text-dds-text-muted">{job.runCount}</td>
                                <td className="py-2 text-right">
                                    <span className={job.errorCount > 0 ? 'text-red-400' : 'text-dds-text-muted'}>
                                        {job.errorCount}
                                    </span>
                                </td>
                                <td className="py-2 text-right text-dds-text-muted">
                                    {job.lastDurationMs != null ? `${job.lastDurationMs}ms` : '—'}
                                </td>
                                <td className="py-2 text-right">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                        job.status === 'HEALTHY'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        <div className={`w-1 h-1 rounded-full ${job.status === 'HEALTHY' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                        {job.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeAgo(timestamp: string): string {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export default ObservabilityPage;
