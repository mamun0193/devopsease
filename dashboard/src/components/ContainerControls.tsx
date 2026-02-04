import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  clearActionState,
} from '../store/containersSlice';
import type { ContainerAction } from '../store/containersSlice';
import ConfirmModal from './ConfirmModal';

interface ContainerControlsProps {
  containerId: string;
  containerName: string;
  containerState: string;
  onRemoved?: () => void; // Callback when container is removed
  compact?: boolean; // Show only applicable buttons (hide inactive ones)
}

const ContainerControls: React.FC<ContainerControlsProps> = ({
  containerId,
  containerName,
  containerState,
  onRemoved,
  compact = false,
}) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  
  // Get action state from Redux
  const actionState = useAppSelector(
    state => state.containers.actionStates[containerId] || {
      loading: false,
      error: null,
      success: null,
      lastAction: null,
    }
  );

  // Local state for confirmation modals
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: 'stop' | 'remove' | null;
  }>({ open: false, action: null });

  // Derive container state flags
  const state = containerState.toLowerCase();
  const isRunning = state === 'running';
  const isPaused = state === 'paused';
  const isDead = state === 'dead';

  /**
   * Refresh container data after action
   * This triggers React Query to refetch, updating UI across all tabs
   */
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['containers'] });
    queryClient.invalidateQueries({ queryKey: ['containerInspect', containerId] });
    queryClient.invalidateQueries({ queryKey: ['containerLogs', containerId] });
    queryClient.invalidateQueries({ queryKey: ['containerAnalysis', containerId] });
  }, [queryClient, containerId]);

  /**
   * Execute container action with refresh
   */
  const executeAction = useCallback(async (
    action: ContainerAction,
    thunk: ReturnType<typeof startContainer | typeof stopContainer | typeof restartContainer | typeof removeContainer>
  ) => {
    const result = await dispatch(thunk);
    
    // Refresh data after action completes
    if (!result.type.endsWith('/rejected')) {
      // Small delay to allow Docker state to settle
      setTimeout(() => {
        refreshData();
        
        // Handle removal - navigate away
        if (action === 'remove' && onRemoved) {
          onRemoved();
        }
      }, 500);
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      dispatch(clearActionState(containerId));
    }, 3000);
  }, [dispatch, containerId, refreshData, onRemoved]);

  // Action handlers
  const handleStart = () => {
    executeAction('start', startContainer({ containerId, containerName }));
  };

  const handleStop = () => {
    setConfirmModal({ open: true, action: 'stop' });
  };

  const handleRestart = () => {
    executeAction('restart', restartContainer({ containerId, containerName }));
  };

  const handleRemove = () => {
    setConfirmModal({ open: true, action: 'remove' });
  };

  const confirmAction = () => {
    if (confirmModal.action === 'stop') {
      executeAction('stop', stopContainer({ containerId, containerName }));
    } else if (confirmModal.action === 'remove') {
      // Force remove if container is running
      executeAction('remove', removeContainer({ containerId, containerName, force: isRunning }));
    }
    setConfirmModal({ open: false, action: null });
  };

  // Button configuration
  const allButtons = [
    {
      id: 'start' as ContainerAction,
      icon: Play,
      label: 'Start',
      onClick: handleStart,
      // Can start if stopped, exited, dead, or created
      disabled: isRunning || isPaused || actionState.loading,
      hidden: isRunning, // Hide in compact mode if already running
      color: 'emerald',
    },
    {
      id: 'stop' as ContainerAction,
      icon: Square,
      label: 'Stop',
      onClick: handleStop,
      // Can only stop if running
      disabled: !isRunning || actionState.loading,
      hidden: !isRunning, // Hide in compact mode if not running
      color: 'amber',
    },
    {
      id: 'restart' as ContainerAction,
      icon: RotateCcw,
      label: 'Restart',
      onClick: handleRestart,
      // Can restart running or stopped containers
      disabled: isDead || isPaused || actionState.loading,
      hidden: false, // Always show
      color: 'blue',
    },
    {
      id: 'remove' as ContainerAction,
      icon: Trash2,
      label: 'Remove',
      onClick: handleRemove,
      // Can always attempt remove (force flag handles running containers)
      disabled: actionState.loading,
      hidden: false, // Always show
      color: 'red',
      danger: true,
    },
  ];

  // Filter buttons based on compact mode
  const buttons = compact ? allButtons.filter(btn => !btn.hidden) : allButtons;

  const getButtonClasses = (color: string, disabled: boolean, danger?: boolean) => {
    if (disabled) {
      return 'bg-slate-800 text-slate-500 cursor-not-allowed';
    }
    
    if (danger) {
      return 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30';
    }

    const colorMap: Record<string, string> = {
      emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30',
      amber: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30',
      blue: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30',
      red: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30',
    };

    return colorMap[color] || colorMap.blue;
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => {
          const Icon = button.icon;
          const isLoading = actionState.loading && actionState.lastAction === button.id;

          return (
            <motion.button
              key={button.id}
              onClick={button.onClick}
              disabled={button.disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${getButtonClasses(button.color, button.disabled, button.danger)}
              `}
              whileHover={!button.disabled ? { scale: 1.02 } : {}}
              whileTap={!button.disabled ? { scale: 0.98 } : {}}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Icon size={16} />
              )}
              {button.label}
            </motion.button>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: null })}
        onConfirm={confirmAction}
        title={confirmModal.action === 'stop' ? 'Stop Container' : 'Remove Container'}
        message={
          confirmModal.action === 'stop'
            ? `Are you sure you want to stop "${containerName}"? Any running processes will be terminated.`
            : `Are you sure you want to remove "${containerName}"? This action cannot be undone.${
                isRunning ? ' The container is currently running and will be force stopped.' : ''
              }`
        }
        confirmLabel={confirmModal.action === 'stop' ? 'Stop' : 'Remove'}
        isDangerous={confirmModal.action === 'remove'}
      />
    </>
  );
};

export default ContainerControls;
