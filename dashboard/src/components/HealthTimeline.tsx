import React from 'react';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ContainerHealthState, HealthHistoryEntry } from '../api';
import HealthBadge from './ui/HealthBadge';

interface HealthTimelineProps {
    health: ContainerHealthState | null | undefined;
    isLoading?: boolean;
}

const FAILURE_TYPE_LABELS: Record<string, string> = {
    CRASH_LOOP: 'crash loop',
    RESOURCE_EXHAUSTION: 'OOM / resource exhaustion',
    PORT_CONFLICT: 'port conflict',
    PERMISSION_ERROR: 'permission error',
    CONFIG_ERROR: 'config error',
    GRACEFUL_STOP: 'graceful stop',
    UNKNOWN: 'unknown failure',
};

function formatTime(isoString: string): string {
    try {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return isoString;
    }
}

function formatDate(isoString: string): string {
    try {
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

function getTrendIcon(entry: HealthHistoryEntry, prevEntry?: HealthHistoryEntry) {
    if (!prevEntry) return <Minus size={12} className="text-slate-500" />;
    const ORDER = { HEALTHY: 0, DEGRADED: 1, UNHEALTHY: 2 };
    const diff = ORDER[entry.healthStatus] - ORDER[prevEntry.healthStatus];
    if (diff > 0) return <TrendingDown size={12} className="text-red-400" />;
    if (diff < 0) return <TrendingUp size={12} className="text-emerald-400" />;
    return <Minus size={12} className="text-slate-500" />;
}

const TIME_LINE_COLORS = {
    HEALTHY: 'bg-emerald-500',
    DEGRADED: 'bg-amber-500',
    UNHEALTHY: 'bg-red-500',
};

const HealthTimeline: React.FC<HealthTimelineProps> = ({ health, isLoading }) => {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                        <div className="flex-1">
                            <div className="h-3 bg-slate-800 rounded w-32 mb-1.5" />
                            <div className="h-2 bg-slate-800 rounded w-48" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const history = health?.history || [];

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Clock size={28} className="text-slate-600" />
                <p className="text-slate-500 text-sm">No health state changes recorded yet.</p>
                <p className="text-slate-600 text-xs">Events like OOM kills, crash loops, and healthchecks will appear here.</p>
            </div>
        );
    }

    // Show most recent first
    const reversed = [...history].reverse();

    return (
        <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-slate-800" />

            <div className="space-y-4 pl-5">
                {reversed.map((entry, index) => {
                    const prevEntry = reversed[index + 1];
                    const date = formatDate(entry.changedAt);
                    const time = formatTime(entry.changedAt);
                    const prevDate = prevEntry ? formatDate(prevEntry.changedAt) : null;
                    const showDate = date !== prevDate;

                    return (
                        <React.Fragment key={entry.changedAt + index}>
                            {showDate && index > 0 && (
                                <div className="text-xs text-slate-600 -ml-5 pl-5 pt-1 pb-0.5 border-t border-slate-800/50">
                                    {date}
                                </div>
                            )}
                            <div className="relative flex items-start gap-3 group">
                                {/* Dot on the timeline */}
                                <div
                                    className={`absolute -left-5 w-2.5 h-2.5 rounded-full ${TIME_LINE_COLORS[entry.healthStatus]} mt-1 ring-2 ring-slate-950`}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs text-slate-500 font-mono">{time}</span>
                                        {getTrendIcon(entry, prevEntry)}
                                        <HealthBadge status={entry.healthStatus} size="sm" />
                                        {entry.failureType && (
                                            <span className="text-xs text-slate-500">
                                                ({FAILURE_TYPE_LABELS[entry.failureType] ?? entry.failureType})
                                            </span>
                                        )}
                                    </div>
                                    {entry.instabilityScore > 0 && (
                                        <div className="mt-0.5 text-xs text-slate-600">
                                            Instability: {(entry.instabilityScore * 100).toFixed(0)}%
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default HealthTimeline;
