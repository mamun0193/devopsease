import React from 'react';

type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | null;

interface HealthBadgeProps {
    status: HealthStatus;
    size?: 'sm' | 'md';
    className?: string;
}

const STATUS_CONFIG = {
    HEALTHY: {
        label: 'Healthy',
        dot: 'bg-emerald-400',
        badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        emoji: '🟢',
    },
    DEGRADED: {
        label: 'Degraded',
        dot: 'bg-amber-400',
        badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        emoji: '🟡',
    },
    UNHEALTHY: {
        label: 'Unhealthy',
        dot: 'bg-red-400',
        badge: 'bg-red-500/10 border-red-500/30 text-red-400',
        emoji: '🔴',
    },
};

const HealthBadge: React.FC<HealthBadgeProps> = ({ status, size = 'sm', className = '' }) => {
    if (!status) return null;

    const config = STATUS_CONFIG[status];
    const isSmall = size === 'sm';

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border font-medium ${isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
                } ${config.badge} ${className}`}
            title={`Health: ${config.label}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'UNHEALTHY' ? 'animate-pulse' : ''}`} />
            {config.label}
        </span>
    );
};

export default HealthBadge;
