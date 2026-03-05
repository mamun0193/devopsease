import React from 'react';
import { Activity, Cpu, HardDrive, Network, AlertCircle } from 'lucide-react';
import { useContainerStats } from '../hooks/useContainers';
import RefreshButton from './RefreshButton';

interface ContainerStatsProps {
  containerId: string | null;
  containerState: string;
  resourceLimits?: {
    memoryMB: number | null;
    cpuCores: number | null;
  } | null;
}

const ContainerStatsPanel: React.FC<ContainerStatsProps> = ({ containerId, containerState, resourceLimits }) => {
  const isRunning = containerState === 'running';
  const { data: stats, isLoading, error, refetch } = useContainerStats(containerId, isRunning);

  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <Activity size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">No Container Selected</h3>
        <p className="text-slate-500">Select a container to view resource usage</p>
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <Activity size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Container Not Running</h3>
        <p className="text-slate-500">Stats are only available for running containers</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-red-500/10 rounded-lg border border-red-500/30">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Failed to Load Stats</h3>
        <p className="text-slate-500 mb-4">{error.message}</p>
        <RefreshButton
          onRefresh={() => { refetch(); }}
          isLoading={isLoading}
          size="md"
          variant="default"
          showLabel={true}
          label="Retry"
        />
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400">Loading stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">Resource Usage</h3>
        </div>
        <RefreshButton
          onRefresh={() => { refetch(); }}
          isLoading={isLoading}
          size="sm"
          variant="ghost"
          showLabel={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={18} className="text-purple-400" />
            <h4 className="text-sm font-medium text-slate-300">CPU Usage</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-100">{stats.cpu.usagePercent}</span>
              <span className="text-lg text-slate-400">%</span>
            </div>
            {resourceLimits?.cpuCores && (
              <p className="text-sm text-slate-500">
                {(stats.cpu.usagePercent * (resourceLimits.cpuCores) / 100).toFixed(2)} / {resourceLimits.cpuCores} cores limit
              </p>
            )}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.cpu.usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={18} className="text-blue-400" />
            <h4 className="text-sm font-medium text-slate-300">Memory Usage</h4>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-100">{stats.memory.usagePercent}</span>
              <span className="text-lg text-slate-400">%</span>
            </div>
            <p className="text-sm text-slate-500">
              {stats.memory.usedMB} MB / {resourceLimits?.memoryMB || stats.memory.limitMB} MB limit
            </p>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.memory.usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Network size={18} className="text-emerald-400" />
            <h4 className="text-sm font-medium text-slate-300">Network I/O</h4>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Received (RX)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{stats.network.rxMB}</span>
                <span className="text-sm text-slate-400">MB</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Transmitted (TX)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">{stats.network.txMB}</span>
                <span className="text-sm text-slate-400">MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <p className="text-xs text-blue-300">
          <strong>Auto-refresh:</strong> Stats update every 3 seconds while container is running
        </p>
      </div>
    </div>
  );
};

export default ContainerStatsPanel;
