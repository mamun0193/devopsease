import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearLastCompletedAction } from '../store/containersSlice';

const ActionFeedback: React.FC = () => {
  const dispatch = useAppDispatch();
  const lastCompletedAction = useAppSelector(state => state.containers.lastCompletedAction);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (lastCompletedAction) {
      const timer = setTimeout(() => {
        dispatch(clearLastCompletedAction());
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [lastCompletedAction, dispatch]);

  const handleDismiss = () => {
    dispatch(clearLastCompletedAction());
  };

  const getActionVerb = (action: string, success: boolean) => {
    const verbs: Record<string, { past: string; failed: string }> = {
      start: { past: 'started', failed: 'start' },
      stop: { past: 'stopped', failed: 'stop' },
      restart: { past: 'restarted', failed: 'restart' },
      remove: { past: 'removed', failed: 'remove' },
    };
    
    const verb = verbs[action] || { past: action, failed: action };
    return success ? verb.past : verb.failed;
  };

  return (
    <AnimatePresence>
      {lastCompletedAction && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: -50, x: 0 }}
          className="fixed top-6 right-6 z-[100] max-w-md w-full px-4 sm:w-auto"
        >
          <div
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md cursor-pointer
              ${
                lastCompletedAction.success
                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                  : 'bg-red-500/20 border border-red-500/30'
              }
            `}
            onClick={handleDismiss}
          >
            {lastCompletedAction.success ? (
              <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            ) : (
              <XCircle size={20} className="text-red-400 shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                lastCompletedAction.success ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {lastCompletedAction.success
                  ? `Container ${getActionVerb(lastCompletedAction.action, true)}`
                  : `Failed to ${getActionVerb(lastCompletedAction.action, false)} container`
                }
              </p>
              <p className="text-xs text-slate-400 truncate">
                {lastCompletedAction.containerName}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionFeedback;
