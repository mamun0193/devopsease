import { useState } from 'react';
import { useActions } from '../hooks/useContainers';
import { useAppSelector } from '../store/hooks';
import type { ActionRecord } from '../api';
import {
  PlayCircle,
  StopCircle,
  RotateCw,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  Container as ContainerIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import RefreshButton from './RefreshButton';

interface TimelineProps {
  containerId?: string;
  onViewLogs?: (containerId: string, timestamp: string) => void;
  onViewStats?: (containerId: string) => void;
}

export default function Timeline({ containerId, onViewLogs, onViewStats }: TimelineProps) {
  const { data, isLoading, error, refetch } = useActions({ containerId, limit: 50 });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Get loading states for all containers to filter out in-progress actions
  const actionStates = useAppSelector(state => state.containers.actionStates);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-purple-500/30 border-t-purple-500" />
          <p className="text-sm text-slate-400">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex items-start gap-3">
          <XCircle className="size-5 shrink-0 text-red-500" />
          <div>
            <h3 className="font-medium text-red-500">Failed to load history</h3>
            <p className="mt-1 text-sm text-red-400">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-slate-800/50 p-4">
          <Clock className="size-8 text-slate-500" />
        </div>
        <h3 className="mt-4 font-medium text-slate-300">No action history yet</h3>
        <p className="mt-2 text-sm text-slate-500">
          {containerId 
            ? 'Actions performed on this container will appear here' 
            : 'Start, stop, restart, or remove containers to see history'}
        </p>
      </div>
    );
  }

  // Filter out ONLY the most recent action for containers with in-progress operations
  // This prevents the new action from appearing before the spinner stops
  const filteredActions = data.items.filter((action, index) => {
    const containerIdFromAction = action.container.id;
    
    // Check if there's a loading state for this container
    for (const [stateContainerId, state] of Object.entries(actionStates)) {
      if (state.loading && state.lastAction) {
        // Check if container IDs match
        const idsMatch = stateContainerId.startsWith(containerIdFromAction) || 
                        containerIdFromAction.startsWith(stateContainerId);
        
        if (idsMatch) {
          // Only hide if this is the FIRST (most recent) action AND matches the loading action type
          const isFirstActionForContainer = data.items.findIndex(a => {
            return a.container.id === containerIdFromAction || 
                   stateContainerId.startsWith(a.container.id) ||
                   a.container.id.startsWith(stateContainerId);
          }) === index;
          
          if (isFirstActionForContainer && action.action === state.lastAction) {
            return false; // Hide only the most recent matching action
          }
        }
      }
    }
    return true; // Show all other actions
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionIcon = (action: ActionRecord['action']) => {
    const iconClass = "size-4";
    switch (action) {
      case 'start':
        return <PlayCircle className={iconClass} />;
      case 'stop':
        return <StopCircle className={iconClass} />;
      case 'restart':
        return <RotateCw className={iconClass} />;
      case 'remove':
        return <Trash2 className={iconClass} />;
    }
  };

  const getActionColor = (action: ActionRecord['action'], status: ActionRecord['status']) => {
    if (status === 'failed') {
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
    
    switch (action) {
      case 'start':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'stop':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'restart':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'remove':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: date.toLocaleString(),
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-slate-400">
            {filteredActions.length} {filteredActions.length === 1 ? 'Action' : 'Actions'}
          </h3>
          <RefreshButton
            onRefresh={() => { refetch(); }}
            isLoading={isLoading}
            size="sm"
            variant="ghost"
            showLabel={false}
          />
        </div>
        {data.nextCursor && (
          <button className="text-xs text-purple-400 hover:text-purple-300">
            Load more
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filteredActions.map((action, index) => {
          const isExpanded = expandedId === action.id;
          const time = formatTimestamp(action.timestamp);
          const colorClass = getActionColor(action.action, action.status);

          return (
            <div
              key={action.id}
              className="relative rounded-lg border border-slate-700/50 bg-slate-800/30 transition-colors hover:bg-slate-800/50"
            >
              {/* Timeline connector */}
              {index < filteredActions.length - 1 && (
                <div className="absolute left-8 top-12 h-6 w-px bg-slate-700/50" />
              )}

              <button
                onClick={() => toggleExpand(action.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                {/* Action icon with status indicator */}
                <div className={`relative shrink-0 rounded-lg border p-2 ${colorClass}`}>
                  {getActionIcon(action.action)}
                  <div className="absolute -right-1 -top-1">
                    {action.status === 'success' ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="size-3.5 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize text-slate-200">
                          {action.action}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-sm text-slate-400">
                          {action.container.name || action.container.id}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500" title={time.absolute}>
                        {time.relative}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="size-4 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 bg-slate-900/30 px-4 py-3">
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <dt className="flex items-center gap-1.5 text-slate-500">
                        <ContainerIcon className="size-3.5" />
                        Container:
                      </dt>
                      <dd className="font-mono text-slate-300">
                        {action.container.name || action.container.id}
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt className="flex items-center gap-1.5 text-slate-500">
                        <User className="size-3.5" />
                        Source:
                      </dt>
                      <dd className="capitalize text-slate-300">{action.source}</dd>
                    </div>

                    {action.reason && (
                      <div className="flex items-start gap-2">
                        <dt className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="size-3.5" />
                          Reason:
                        </dt>
                        <dd className="text-slate-300">{action.reason}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Correlation links */}
                  {action.status === 'success' && (
                    <div className="mt-3 flex gap-2 border-t border-slate-700/50 pt-3">
                      {onViewLogs && (
                        <button
                          onClick={() => onViewLogs(action.container.id, action.timestamp)}
                          className="rounded-md bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                        >
                          View logs around this time
                        </button>
                      )}
                      {onViewStats && action.action !== 'remove' && (
                        <button
                          onClick={() => onViewStats(action.container.id)}
                          className="rounded-md bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                        >
                          View current stats
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
