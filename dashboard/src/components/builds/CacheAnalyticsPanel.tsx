import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, Clock, TrendingUp, Cpu } from 'lucide-react';
import { buildApi } from '../../api';

const CacheAnalyticsPanel: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['cache-analytics'],
    queryFn: buildApi.getCacheAnalytics
  });

  if (isLoading || !analytics) return null;

  if (analytics.totalBuilds === 0) return null;

  const formatSavedTime = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-6">
      <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm flex items-center justify-between group hover:border-dds-primary/30 transition-colors">
        <div>
          <div className="text-dds-text-secondary text-[11px] uppercase font-bold tracking-wider mb-1">Total Analyzed</div>
          <div className="text-2xl font-bold text-dds-text-primary">{analytics.totalBuilds}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-dds-primary/10 flex items-center justify-center text-dds-primary group-hover:scale-110 transition-transform">
          <Cpu size={20} />
        </div>
      </div>

      <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm flex items-center justify-between group hover:border-dds-green/30 transition-colors">
        <div>
          <div className="text-dds-text-secondary text-[11px] uppercase font-bold tracking-wider mb-1">Cache Hit Rate</div>
          <div className="text-2xl font-bold text-dds-text-primary">{analytics.hitRatePercentage.toFixed(1)}%</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-dds-green/10 flex items-center justify-center text-dds-green group-hover:scale-110 transition-transform">
          <TrendingUp size={20} />
        </div>
      </div>

      <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm flex items-center justify-between group hover:border-dds-yellow/30 transition-colors">
        <div>
          <div className="text-dds-text-secondary text-[11px] uppercase font-bold tracking-wider mb-1">Total Time Saved</div>
          <div className="text-2xl font-bold text-dds-text-primary">{formatSavedTime(analytics.totalSavedTimeMs)}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-dds-yellow/10 flex items-center justify-center text-dds-yellow group-hover:scale-110 transition-transform">
          <Clock size={20} />
        </div>
      </div>

      <div className="bg-dds-surface border border-dds-border rounded-xl p-4 shadow-sm flex items-center justify-between group hover:border-dds-purple/30 transition-colors">
        <div>
          <div className="text-dds-text-secondary text-[11px] uppercase font-bold tracking-wider mb-1">Cache Hits</div>
          <div className="text-2xl font-bold text-dds-text-primary flex items-baseline gap-2">
            {analytics.cacheHits} <span className="text-xs font-medium text-dds-text-secondary bg-dds-muted/50 px-1.5 py-0.5 rounded-md">+{analytics.partialHits} partial</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-dds-purple/10 flex items-center justify-center text-dds-purple group-hover:scale-110 transition-transform">
          <Zap size={20} />
        </div>
      </div>
    </div>
  );
};

export default CacheAnalyticsPanel;
