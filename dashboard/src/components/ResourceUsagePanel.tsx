import React from 'react';
import { Box, Cpu, HardDrive, AlertTriangle, Loader2 } from 'lucide-react';
import { useQuota } from '../hooks/useQuota';

interface QuotaBarProps {
  label: string;
  used: number;
  max: number;
  unit?: string;
  icon: React.ReactNode;
  showAsPercent?: boolean;
}

function QuotaBar({ label, used, max, unit = '', icon, showAsPercent }: QuotaBarProps) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;

  const barColor =
    pct >= 90 ? 'bg-dds-red' :
      pct >= 70 ? 'bg-dds-orange' :
        'bg-dds-primary';

  const valueColor =
    pct >= 90 ? 'text-dds-red' :
      pct >= 70 ? 'text-dds-orange' :
        'text-dds-text-secondary';

  const displayValue = showAsPercent
    ? `${pct.toFixed(1)}%`
    : `${used}${unit}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-dds-text-primary text-[13px] font-medium">
          {icon}
          {label}
        </span>
        <span className={`${valueColor} font-mono text-[12px]`}>
          {displayValue} <span className="text-dds-text-muted">/ {max}{unit}</span>
        </span>
      </div>
      <div className="w-full bg-dds-bg border border-dds-border/50 rounded-full h-1.5 overflow-hidden">
        <div
          className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const ResourceUsagePanel: React.FC = () => {
  const { data: quota, isLoading, isError } = useQuota();

  return (
    <div className="bg-dds-surface border border-dds-border rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">
          Resource Quota
        </h2>
        {isLoading && <Loader2 size={13} className="animate-spin text-dds-text-muted" />}
      </div>

      {isError ? (
        <div className="flex items-center gap-2 text-dds-orange text-[13px] bg-dds-orange/10 border border-dds-orange/20 rounded-lg p-3">
          <AlertTriangle size={14} />
          Unable to load quota data
        </div>
      ) : isLoading || !quota ? (
        /* Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-20 bg-dds-border rounded" />
                <div className="h-3.5 w-16 bg-dds-border rounded" />
              </div>
              <div className="h-1.5 bg-dds-border rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuotaBar
            label="Containers"
            used={quota.usedContainers}
            max={quota.maxContainers}
            icon={<Box size={13} className="text-dds-text-muted" />}
          />
          <QuotaBar
            label="CPU"
            used={quota.usedCPU}
            max={quota.maxCPU}
            unit=" cores"
            icon={<Cpu size={13} className="text-dds-text-muted" />}
            showAsPercent
          />
          <QuotaBar
            label="Memory"
            used={quota.usedMemoryMB}
            max={quota.maxMemoryMB}
            unit=" MB"
            icon={<HardDrive size={13} className="text-dds-text-muted" />}
          />
        </div>
      )}
    </div>
  );
};

export default ResourceUsagePanel;
