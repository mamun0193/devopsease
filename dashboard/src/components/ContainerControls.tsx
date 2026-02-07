import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Trash2,
  Loader2,
  Pause,
  Power
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  startContainer,
  stopContainer,
  restartContainer,
  removeContainer,
  pauseContainer,
  unpauseContainer,
  clearActionState,
} from '../store/containersSlice';
import type { ContainerAction } from '../store/containersSlice';
import ConfirmModal from './ConfirmModal';

// Default state to avoid creating new objects in selector
const DEFAULT_ACTION_STATE = {
  loading: false,
  error: null,
  success: null,
  lastAction: null,
};

interface ContainerControlsProps {
  containerId: string;
  containerName: string;
  containerState: string;
  onRemoved?: () => void; // Callback when container is removed
  compact?: boolean; // Show only applicable buttons (hide inactive ones)
  unified?: boolean; // Show single Start/Stop button based on state
  primaryOnly?: boolean; // Show only primary controls (Start/Stop, Restart, Remove)
  secondaryOnly?: boolean; // Show only secondary controls (Pause/Unpause)
}

const ContainerControls: React.FC<ContainerControlsProps> = ({
  containerId,
  containerName,
  containerState,
  onRemoved,
  compact = false,
  unified = false,
  primaryOnly = false,
  secondaryOnly = false,
}) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Get action state from Redux
  const actionState = useAppSelector(
    state => state.containers.actionStates[containerId] || DEFAULT_ACTION_STATE
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
    queryClient.invalidateQueries({ queryKey: ['actions'] }); // Refresh action history
  }, [queryClient, containerId]);

  /**
   * Get expected final state based on action type
   */
  const getExpectedState = (action: ContainerAction): string | null => {
    switch (action) {
      case 'start': return 'running';
      case 'stop': return 'exited';
      case 'restart': return 'running';
      case 'pause': return 'paused';
      case 'unpause': return 'running';
      case 'remove': return null; // Container won't exist
      default: return null;
    }
  };

  /**
   * Poll container state until it matches expected state or timeout
   */
  const pollUntilState = useCallback(async (
    expectedState: string | null,
    { timeout = 15000 }: { timeout?: number } = {}
  ): Promise<boolean> => {
    if (!expectedState) return true; // No polling needed (e.g., remove)

    const start = Date.now();
    const pollInterval = 1000; // 1 second between polls

    while (Date.now() - start < timeout) {
      try {
        // Force fresh fetch (bypass cache)
        const data = await queryClient.fetchQuery({
          queryKey: ['containerInspect', containerId],
          staleTime: 0,
        });

        const currentState = (data as { state?: { status?: string } })?.state?.status?.toLowerCase();
        if (currentState === expectedState) {
          console.log(`✅ Container reached expected state: ${expectedState}`);
          return true;
        }

        console.log(`⏳ Polling state: ${currentState} → expecting ${expectedState}`);
      } catch (error) {
        // Container might be removed or temporarily unavailable
        console.warn('Polling error:', error);
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    console.warn(`⚠️ Timeout waiting for state: ${expectedState}`);
    return false;
  }, [containerId, queryClient]);

  /**
   * Execute container action with state polling
   * Loader stays active until Docker state matches expected state
   */
  const executeAction = useCallback(async (
    action: ContainerAction,
    thunk: ReturnType<typeof startContainer | typeof stopContainer | typeof restartContainer | typeof removeContainer | typeof pauseContainer | typeof unpauseContainer>
  ) => {
    const result = await dispatch(thunk);

    // Only poll if action succeeded
    if (!result.type.endsWith('/rejected')) {
      const expectedState = getExpectedState(action);

      // Poll until container reaches expected state
      if (expectedState) {
        await pollUntilState(expectedState, { timeout: 15000 });
      }

      // Small delay then refresh data
      setTimeout(() => {
        refreshData();

        // Handle removal - navigate away
        if (action === 'remove' && onRemoved) {
          onRemoved();
        }
      }, 300);
    }

    // Clear success message after action completes
    setTimeout(() => {
      dispatch(clearActionState(containerId));
    }, 2000);
  }, [dispatch, containerId, refreshData, onRemoved, pollUntilState]);

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

  const handlePause = () => {
    executeAction('pause', pauseContainer({ containerId, containerName }));
  };

  const handleUnpause = () => {
    executeAction('unpause', unpauseContainer({ containerId, containerName }));
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

  // Button configuration - categorize as primary or secondary
  const allButtons = [
    {
      id: 'start' as ContainerAction,
      icon: Power,
      label: 'Start',
      onClick: handleStart,
      // Can start if stopped, exited, dead, or created
      disabled: isRunning || isPaused || actionState.loading,
      hidden: unified ? isRunning : (compact && isRunning),
      color: 'green',
      isPrimary: true,
    },
    {
      id: 'stop' as ContainerAction,
      icon: Power,
      label: 'Stop',
      onClick: handleStop,
      // Can only stop if running
      disabled: !isRunning || actionState.loading,
      hidden: unified ? !isRunning : (compact && !isRunning),
      color: 'red',
      isPrimary: true,
    },
    {
      id: 'restart' as ContainerAction,
      icon: RotateCcw,
      label: 'Restart',
      onClick: handleRestart,
      // Can only restart if running (matches user preference for stopped containers)
      disabled: !isRunning || isDead || isPaused || actionState.loading,
      hidden: false, // Always show
      color: 'blue',
      isPrimary: true,
    },
    {
      id: isPaused ? ('unpause' as ContainerAction) : ('pause' as ContainerAction),
      icon: isPaused ? Play : Pause,
      label: isPaused ? 'Unpause' : 'Pause',
      onClick: isPaused ? handleUnpause : handlePause,
      // Can pause if running, unpause if paused
      disabled: (!isRunning && !isPaused) || actionState.loading,
      hidden: unified ? (!isRunning && !isPaused) : (compact && !isRunning && !isPaused),
      color: isPaused ? 'emerald' : 'purple',
      isPrimary: false,
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
      isPrimary: true,
    },
  ];

  // Filter buttons based on compact/unified mode and primary/secondary selection
  let buttons = allButtons.filter(btn => !btn.hidden);

  if (primaryOnly) {
    buttons = buttons.filter(btn => btn.isPrimary);
  } else if (secondaryOnly) {
    buttons = buttons.filter(btn => !btn.isPrimary);
  }

  const getButtonClasses = (color: string, disabled: boolean, danger?: boolean) => {
    if (disabled) {
      return 'bg-slate-800 text-slate-500 cursor-not-allowed';
    }

    if (danger) {
      return 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30';
    }

    const colorMap: Record<string, string> = {
      green: 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30',
      emerald: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30',
      amber: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30',
      blue: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30',
      purple: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30',
      red: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30',
    };

    return colorMap[color] || colorMap.blue;
  };

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
        {buttons.map((button) => {
          const Icon = button.icon;
          const isLoading = actionState.loading && actionState.lastAction === button.id;

          return (
            <motion.button
              key={button.id}
              onClick={button.onClick}
              disabled={button.disabled}
              title={compact ? button.label : undefined}
              className={`
                flex items-center ${compact ? 'justify-center w-10' : 'gap-2 px-4'} h-10 rounded-lg text-sm font-medium whitespace-nowrap
                transition-all duration-200 shadow-sm
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
              {!compact && button.label}
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
            : `Are you sure you want to remove "${containerName}"? This action cannot be undone.${isRunning ? ' The container is currently running and will be force stopped.' : ''
            }`
        }
        confirmLabel={confirmModal.action === 'stop' ? 'Stop' : 'Remove'}
        isDangerous={confirmModal.action === 'remove'}
      />
    </>
  );
};

export default ContainerControls;
