import React from 'react';
import ConfirmModal from '../ConfirmModal';
import { useRollbackRelease } from '../../hooks/useReleases';
import type { Release } from '../../api/releasesApi';

interface RollbackReleaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  release: Release;
}

const RollbackReleaseDialog: React.FC<RollbackReleaseDialogProps> = ({ isOpen, onClose, release }) => {
  const { mutate: rollbackRelease, isPending } = useRollbackRelease();

  const handleRollback = () => {
    rollbackRelease(
      { id: release._id, reason: 'User requested rollback via UI' },
      { onSuccess: onClose }
    );
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleRollback}
      title={`Rollback Release v${release.version}`}
      confirmLabel={isPending ? 'Rolling back...' : 'Rollback Release'}
      isLoading={isPending}
      variant="danger"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          You are about to rollback Release v{release.version}.
        </p>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-red-400/80">Target Release</span>
            <span className="text-sm font-medium text-red-400">v{release.version}</span>
          </div>
          <div className="flex justify-between border-t border-red-500/20 pt-2">
            <span className="text-sm text-red-400/80">Action</span>
            <span className="text-sm text-red-400">Mark as RolledBack</span>
          </div>
        </div>
        
        <p className="text-xs text-red-400/80">
          Any traffic routed to this release will be immediately drained and re-routed to the fallback active release based on the current Routing Table.
        </p>
      </div>
    </ConfirmModal>
  );
};

export default RollbackReleaseDialog;
