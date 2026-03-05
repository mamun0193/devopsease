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
    pct >= 90 ? 'bg-red-500' :
      pct >= 70 ? 'bg-yellow-500' :
        'bg-blue-500';

  const valueColor =
    pct >= 90 ? 'text-red-400' :
      pct >= 70 ? 'text-yellow-400' :
        'text-slate-400';

  const displayValue = showAsPercent
    ? `${pct.toFixed(1)}%`
    : `${used}${unit}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
          {icon}
          {label}
        </span>
        <span className={`${valueColor} tabular-nums text-xs`}>
          {displayValue} / {max}{unit}
        </span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5">
        <div
          className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const ResourceUsagePanel: React.FC = () => {
  const { data: quota, isLoading, isError } = useQuota();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Resource Quota
        </h2>
        {isLoading && <Loader2 size={13} className="animate-spin text-slate-500" />}
      </div>

      {isError ? (
        <div className="flex items-center gap-2 text-yellow-400 text-sm">
          <AlertTriangle size={14} />
          Unable to load quota data
        </div>
      ) : isLoading || !quota ? (
        /* Skeleton */
        <div className="space-y-5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3.5 w-20 bg-slate-800 rounded" />
                <div className="h-3.5 w-16 bg-slate-800 rounded" />
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <QuotaBar
            label="Containers"
            used={quota.usedContainers}
            max={quota.maxContainers}
            icon={<Box size={12} />}
          />
          <QuotaBar
            label="CPU"
            used={quota.usedCPU}
            max={quota.maxCPU}
            unit=" cores"
            icon={<Cpu size={12} />}
            showAsPercent
          />
          <QuotaBar
            label="Memory"
            used={quota.usedMemoryMB}
            max={quota.maxMemoryMB}
            unit=" MB"
            icon={<HardDrive size={12} />}
          />
        </div>
      )}
    </div>
  );
};

export default ResourceUsagePanel;
