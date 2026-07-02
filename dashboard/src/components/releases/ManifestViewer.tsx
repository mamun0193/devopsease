import React from 'react';
import { Database, Image as ImageIcon, Code2, Lock } from 'lucide-react';
import type { ReleaseManifest } from '../../api/releasesApi';

interface ManifestViewerProps {
  manifest: ReleaseManifest | null;
}

const ManifestViewer: React.FC<ManifestViewerProps> = ({ manifest }) => {
  if (!manifest) {
    return (
      <div className="p-4 bg-slate-800/30 rounded-lg text-slate-500 text-sm">
        Manifest data not available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="size-4 text-amber-400" />
        <span className="text-sm text-amber-400/90">
          This manifest is an immutable snapshot of the Release at creation time.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Code2 className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Build Snapshot</span>
          </div>
          <div className="font-mono text-sm text-slate-300 truncate" title={manifest.buildManifestId}>
            {manifest.buildManifestId || 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <ImageIcon className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Container Image</span>
          </div>
          <div className="font-mono text-sm text-slate-300 truncate" title={manifest.imageId}>
            {manifest.imageId || 'N/A'}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Database className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Config Snapshot</span>
          </div>
          <div className="font-mono text-sm text-slate-300 truncate" title={manifest.configSnapshotId}>
            {manifest.configSnapshotId || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManifestViewer;
