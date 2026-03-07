import React from 'react';
import { AlertTriangle, X, RefreshCw, RotateCcw } from 'lucide-react';
import type { ContainerHealthState } from '../api';

const FAILURE_MESSAGES: Record<string, string> = {
    CRASH_LOOP: 'Container is in a crash loop — it keeps exiting and restarting.',
    RESOURCE_EXHAUSTION: 'Container was killed due to out-of-memory (OOM) or resource limits.',
    PORT_CONFLICT: 'Container failed to start — the required port is already in use.',
    PERMISSION_ERROR: 'Container encountered a permission or file access error.',
    CONFIG_ERROR: 'Container failed due to invalid or missing configuration.',
    UNKNOWN: 'Container became unhealthy for an unknown reason.',
};

interface HealthAlertBannerProps {
    health: ContainerHealthState;
    onDismiss?: () => void;
}

const HealthAlertBanner: React.FC<HealthAlertBannerProps> = ({ health, onDismiss }) => {
    const { healthStatus, lastFailureType, restartCount } = health;

    if (healthStatus === 'HEALTHY') return null;

    const isDegraded = healthStatus === 'DEGRADED';

    const message = lastFailureType
        ? FAILURE_MESSAGES[lastFailureType] ?? `Failure detected: ${lastFailureType}`
        : isDegraded
            ? 'Container shows signs of instability — elevated restart count or failure rate detected.'
            : 'Container health check failed.';

    const restartSuffix = restartCount > 0 ? ` (${restartCount} restart${restartCount !== 1 ? 's' : ''} detected)` : '';

    return (
        <div
            className={`relative flex items-start gap-3 rounded-xl border p-4 ${isDegraded
                    ? 'bg-amber-500/8 border-amber-500/25 text-amber-300'
                    : 'bg-red-500/8 border-red-500/25 text-red-300'
                }`}
            role="alert"
        >
            <AlertTriangle
                size={18}
                className={`shrink-0 mt-0.5 ${isDegraded ? 'text-amber-400' : 'text-red-400'}`}
            />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5">
                    {isDegraded ? '⚠️ Container Degraded' : '🔴 Container Unhealthy'}
                </p>
                <p className="text-sm opacity-85">
                    {message}{restartSuffix}
                </p>
                {lastFailureType === 'CRASH_LOOP' && (
                    <p className="text-xs mt-1.5 opacity-70 flex items-center gap-1">
                        <RefreshCw size={11} className="inline" />
                        Auto-recovery may be active if a restart policy is configured.
                    </p>
                )}
                {lastFailureType === 'RESOURCE_EXHAUSTION' && (
                    <p className="text-xs mt-1.5 opacity-70 flex items-center gap-1">
                        <RotateCcw size={11} className="inline" />
                        Consider increasing the memory limit for this container.
                    </p>
                )}
            </div>

            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity"
                    aria-label="Dismiss alert"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default HealthAlertBanner;
