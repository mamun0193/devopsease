import React from 'react';
import { ArrowRight, Box, Code2, Database } from 'lucide-react';
import type { Release } from '../../api/releasesApi';

interface ReleaseComparisonProps {
  baseRelease: Release | null;
  targetRelease: Release | null;
}

const ReleaseComparison: React.FC<ReleaseComparisonProps> = ({ baseRelease, targetRelease }) => {
  if (!baseRelease || !targetRelease) {
    return (
      <div className="p-4 bg-slate-800/30 rounded-lg text-slate-500 text-sm">
        Select two releases to compare.
      </div>
    );
  }

  const getManifestId = (release: Release, field: string) => {
    if (!release.manifestId || typeof release.manifestId === 'string') return 'Unknown';
    return (release.manifestId as any)[field] || 'Unknown';
  };

  const changes = [
    {
      label: 'Build Snapshot',
      icon: Code2,
      base: getManifestId(baseRelease, 'buildManifestId'),
      target: getManifestId(targetRelease, 'buildManifestId')
    },
    {
      label: 'Container Image',
      icon: Box,
      base: getManifestId(baseRelease, 'imageId'),
      target: getManifestId(targetRelease, 'imageId')
    },
    {
      label: 'Configuration',
      icon: Database,
      base: getManifestId(baseRelease, 'configSnapshotId'),
      target: getManifestId(targetRelease, 'configSnapshotId')
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[150px_1fr_40px_1fr] gap-4 items-center text-sm font-medium text-slate-400 mb-2 px-4">
        <div>Component</div>
        <div>Release v{baseRelease.version}</div>
        <div></div>
        <div>Release v{targetRelease.version}</div>
      </div>
      
      <div className="space-y-2">
        {changes.map((change, idx) => {
          const isDifferent = change.base !== change.target;
          return (
            <div key={idx} className={`grid grid-cols-[150px_1fr_40px_1fr] gap-4 items-center p-4 rounded-lg border ${isDifferent ? 'bg-purple-500/10 border-purple-500/20' : 'bg-slate-800/30 border-slate-700/50'}`}>
              <div className="flex items-center gap-2 text-slate-300">
                <change.icon className="size-4 text-slate-500" />
                <span className="text-xs">{change.label}</span>
              </div>
              <div className="font-mono text-xs text-slate-400 truncate" title={change.base}>
                {change.base}
              </div>
              <div className="flex justify-center">
                <ArrowRight className={`size-4 ${isDifferent ? 'text-purple-400' : 'text-slate-600'}`} />
              </div>
              <div className={`font-mono text-xs truncate ${isDifferent ? 'text-purple-300 font-semibold' : 'text-slate-400'}`} title={change.target}>
                {change.target}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReleaseComparison;
