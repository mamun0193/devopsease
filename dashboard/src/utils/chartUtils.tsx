import React from 'react';

// Types 

export type TimeRange = '1m' | '1h' | '1d' | '1w';

export const RANGE_LABELS: { key: TimeRange; label: string }[] = [
    { key: '1m', label: '1 min' },
    { key: '1h', label: '1 hour' },
    { key: '1d', label: '1 day' },
    { key: '1w', label: '1 week' },
];

// Formatter
export function formatTimeForRange(timestamp: number, range: TimeRange): string {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (range === '1m') return `${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    if (range === '1h') return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Chart Components 

interface ChartTooltipProps {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: number;
}


export const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
            <p className="text-slate-400 mb-1">
                {label !== undefined ? new Date(label).toLocaleTimeString() : ''}
            </p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color }} className="font-medium">
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                </p>
            ))}
        </div>
    );
};

export const ChartGradients: React.FC = () => (
    <defs>
        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
    </defs>
);

// Shared exis props
export const AXIS_STYLE = {
    tick: { fontSize: 10, fill: '#64748b' },
    axisLine: false,
    tickLine: false,
} as const;
