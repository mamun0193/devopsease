import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, GitCommit, FileText, Zap, Hash, Package } from 'lucide-react';
import { buildApi } from '../../api';

interface BuildIntelligencePanelProps {
  buildId: string;
}

const BuildIntelligencePanel: React.FC<BuildIntelligencePanelProps> = ({ buildId }) => {
  const { data: manifest, isLoading, error } = useQuery({
    queryKey: ['build-manifest', buildId],
    queryFn: () => buildApi.getBuildManifest(buildId),
    retry: false
  });

  if (isLoading) {
    return (
      <div className="bg-dds-surface border border-dds-border rounded-xl p-8 flex flex-col items-center justify-center text-dds-text-secondary h-48">
        <Brain className="animate-pulse mb-3 text-dds-primary" size={24} />
        <p className="text-sm">Loading intelligence manifest...</p>
      </div>
    );
  }

  if (error || !manifest) {
    return null; // Silent fail if no manifest (older builds won't have one)
  }

  const formatStrategy = (strategy: string) => {
    switch (strategy) {
      case 'FULL_REUSE': return { label: 'Full Cache Hit', color: 'text-dds-green', bg: 'bg-dds-green/10' };
      case 'PARTIAL_REUSE': return { label: 'Partial Cache', color: 'text-dds-yellow', bg: 'bg-dds-yellow/10' };
      case 'FULL_REBUILD': return { label: 'Full Rebuild', color: 'text-dds-primary', bg: 'bg-dds-primary/10' };
      default: return { label: 'Unknown', color: 'text-dds-text-secondary', bg: 'bg-dds-muted' };
    }
  };

  const strategyStyle = formatStrategy(manifest.strategy);

  return (
    <div className="bg-dds-surface border border-dds-border rounded-xl overflow-hidden shadow-sm mt-6">
      <div className="border-b border-dds-border px-5 py-4 flex items-center justify-between bg-dds-muted/20">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-dds-primary" />
          <h3 className="font-semibold text-sm text-dds-text-primary">Build Intelligence</h3>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5 ${strategyStyle.bg} ${strategyStyle.color}`}>
          <Zap size={12} />
          {strategyStyle.label}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-dds-border divide-y md:divide-y-0 md:divide-x divide-dds-border">
        <div className="p-4 flex items-start gap-3 hover:bg-dds-muted/10 transition-colors">
          <div className="mt-0.5"><GitCommit size={15} className="text-dds-text-secondary" /></div>
          <div>
            <div className="text-[10px] font-semibold text-dds-text-secondary uppercase tracking-wider mb-1">Commit</div>
            <div className="text-xs font-mono text-dds-text-primary truncate" title={manifest.commitSha}>{manifest.commitSha ? manifest.commitSha.substring(0, 7) : 'Latest'}</div>
          </div>
        </div>
        
        <div className="p-4 flex items-start gap-3 hover:bg-dds-muted/10 transition-colors">
          <div className="mt-0.5"><Hash size={15} className="text-dds-text-secondary" /></div>
          <div className="overflow-hidden w-full">
            <div className="text-[10px] font-semibold text-dds-text-secondary uppercase tracking-wider mb-1">Context Hash</div>
            <div className="text-xs font-mono text-dds-text-primary truncate" title={manifest.contextHash}>{manifest.contextHash ? manifest.contextHash.substring(0, 12) : 'N/A'}</div>
          </div>
        </div>

        <div className="p-4 flex items-start gap-3 hover:bg-dds-muted/10 transition-colors">
          <div className="mt-0.5"><Package size={15} className="text-dds-text-secondary" /></div>
          <div className="overflow-hidden w-full">
            <div className="text-[10px] font-semibold text-dds-text-secondary uppercase tracking-wider mb-1">Dependencies</div>
            <div className="text-xs font-mono text-dds-text-primary truncate" title={manifest.dependencyFingerprint}>{manifest.dependencyFingerprint ? manifest.dependencyFingerprint.substring(0, 12) : 'None Detected'}</div>
          </div>
        </div>

        <div className="p-4 flex items-start gap-3 hover:bg-dds-muted/10 transition-colors">
          <div className="mt-0.5"><FileText size={15} className="text-dds-text-secondary" /></div>
          <div className="overflow-hidden w-full">
            <div className="text-[10px] font-semibold text-dds-text-secondary uppercase tracking-wider mb-1">Dockerfile</div>
            <div className="text-xs font-mono text-dds-text-primary truncate" title={manifest.dockerfileFingerprint}>{manifest.dockerfileFingerprint ? manifest.dockerfileFingerprint.substring(0, 12) : 'N/A'}</div>
          </div>
        </div>
      </div>

      {manifest.invalidationReason && manifest.invalidationReason !== 'NO_PREVIOUS_BUILD' && (
        <div className="px-5 py-3 bg-dds-red/5 border-b border-dds-border flex items-center gap-2 text-sm">
          <span className="text-dds-text-secondary text-xs">Cache invalidated due to:</span>
          <span className="font-medium text-dds-text-primary text-xs capitalize">{manifest.invalidationReason.replace(/_/g, ' ').toLowerCase()}</span>
        </div>
      )}

      {manifest.layers && manifest.layers.length > 0 && (
        <div className="p-0">
          <div className="divide-y divide-dds-border/50 max-h-80 overflow-y-auto custom-scrollbar">
            {manifest.layers.map((layer, idx) => (
              <div key={idx} className="p-2.5 px-5 flex items-center gap-4 hover:bg-dds-muted/10 transition-colors group">
                <div className="w-6 shrink-0 flex justify-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${layer.cacheStatus === 'HIT' ? 'bg-dds-green shadow-[0_0_8px_rgba(23,201,100,0.5)]' : layer.cacheStatus === 'MISS' ? 'bg-dds-primary shadow-[0_0_8px_rgba(0,112,243,0.5)]' : 'bg-dds-border'}`} title={`Cache ${layer.cacheStatus}`} />
                </div>
                <div className="w-24 shrink-0">
                   <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                      layer.layerType === 'DEPENDENCY' ? 'bg-dds-yellow/10 text-dds-yellow' :
                      layer.layerType === 'SOURCE' ? 'bg-dds-primary/10 text-dds-primary' :
                      layer.layerType === 'RUNTIME' ? 'bg-dds-purple/10 text-dds-purple' :
                      'bg-dds-text-secondary/10 text-dds-text-secondary'
                    }`}>
                      {layer.layerType}
                    </span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <code className="text-[11px] font-mono text-dds-text-secondary group-hover:text-dds-text-primary transition-colors block truncate max-w-full">
                    {layer.instruction}
                  </code>
                  {layer.reason && (
                    <div className="text-[10px] text-dds-text-muted group-hover:text-dds-text-secondary transition-colors italic mt-0.5">
                      {layer.reason}
                    </div>
                  )}
                  {layer.cacheKey && (
                    <div className="text-[9px] font-mono text-dds-text-muted/50 truncate max-w-[200px]" title={`Cache Key: ${layer.cacheKey}`}>
                      key: {layer.cacheKey.substring(0, 16)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildIntelligencePanel;
