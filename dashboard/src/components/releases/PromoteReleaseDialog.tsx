import React from 'react';
import ConfirmModal from '../ConfirmModal';
import { usePromoteRelease } from '../../hooks/useReleases';
import type { Release } from '../../api/releasesApi';

interface PromoteReleaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release;
}

const PromoteReleaseDialog: React.FC<PromoteReleaseDialogProps> = ({ isOpen, onClose, release }) => {
  const { mutate: promoteRelease, isPending } = usePromoteRelease();

  const handlePromote = () => {
    promoteRelease(
      { id: release._id, reason: 'User requested promotion via UI' },
      { onSuccess: onClose }
    );
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handlePromote}
      title={`Promote Release v${release.version}`}
      confirmLabel={isPending ? 'Promoting...' : 'Promote Release'}
      isLoading={isPending}
      variant="primary"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          You are about to promote Release v{release.version}. 
        </p>
        
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Current Status</span>
            <span className="text-sm font-medium text-amber-400">{release.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Target Status</span>
            <span className="text-sm font-medium text-blue-400">Promoting</span>
          </div>
          <div className="flex justify-between border-t border-slate-700/50 pt-2">
            <span className="text-sm text-slate-400">Traffic Impact</span>
            <span className="text-sm text-slate-300">Dependent on Traffic Policy</span>
          </div>
        </div>
        
        <p className="text-xs text-slate-500">
          The Release Orchestrator will validate health checks before moving this release to Active status. If health checks fail, it will be automatically halted.
        </p>
      </div>
    </ConfirmModal>
  );
};

export default PromoteReleaseDialog;
