import React from 'react';
import { Activity, PlayCircle, ShieldAlert } from 'lucide-react';
import { useReleases } from '../../hooks/useReleases';
import StatusBadge from '../StatusBadge';

const ReleaseActivityWidget: React.FC = () => {
  // Pass no applicationId to get global releases
  const { data: releases, isLoading } = useReleases();

  if (isLoading) {
    return (
      <div className="card flex flex-col h-full overflow-hidden p-6 gap-4">
        <div className="h-4 w-40 bg-dds-surface border border-dds-border rounded animate-pulse" />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-dds-surface/50 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  const recentReleases = releases?.slice(0, 5) || [];

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-dds-border bg-dds-surface/50">
        <h3 className="text-[12px] font-semibold text-dds-white uppercase tracking-wider flex items-center gap-2">
          <Activity size={14} className="text-dds-primary" />
          Recent Release Activity
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 bg-dds-bg/50">
        {recentReleases.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <ShieldAlert className="size-8 text-dds-text-muted mb-3" />
            <p className="text-dds-text-secondary text-sm">No release activity found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {recentReleases.map(release => (
              <div key={release._id} className="flex justify-between items-center p-3 border-b border-dds-border/50 hover:bg-dds-surface/80 hover:border-l-2 hover:border-l-dds-primary transition-all">
                <div className="flex items-center gap-3">
                  <PlayCircle className="size-5 text-dds-text-muted" />
                  <div>
                    <h4 className="text-sm font-medium text-dds-white">
                      Release v{release.version}
                    </h4>
                    <p className="text-xs text-dds-text-muted mt-0.5">
                      {new Date(release.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StatusBadge status={release.status as any} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReleaseActivityWidget;
