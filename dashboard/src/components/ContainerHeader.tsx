import React from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Activity,
  Clock,
  Layers,
  Network,
  Cpu,
  MemoryStick,
  RotateCw,
  History as HistoryIcon,
  Terminal,
} from 'lucide-react';
import { formatRelativeTime, formatImageName, formatPorts, truncateId } from '../utils/formatters';
import { formatNumber, formatPercent, formatMB } from '../utils/numberFormat';
import ContainerControls from './ContainerControls';
import { useAppSelector } from '../store/hooks';
import type { Container, ContainerInspect, ContainerStats, ActionRecord } from '../api';

interface ContainerHeaderProps {
  container: Container;
  containerName: string;
  inspectData?: ContainerInspect;
  statsData?: ContainerStats;
  lastAction?: ActionRecord;
  onRemoved?: () => void;
  onOpenShell?: () => void;
}

const ContainerHeader: React.FC<ContainerHeaderProps> = ({
  container,
  containerName,
  inspectData,
  statsData,
  lastAction,
  onRemoved,
  onOpenShell,
}) => {
  const state = (container.state?.status || 'unknown').toLowerCase();
  const isRunning = state === 'running';
  const isActionLoading = useAppSelector(
    s => s.containers.actionStates[container.id]?.loading ?? false
  );

  // Determine health status and readability
  const getHealthSentence = () => {
    if (!isRunning) {
      return { text: `Container is ${state}`, color: 'text-slate-500' };
    }

    const hasHealthcheck = inspectData?.healthcheck;
    const highCpu = statsData && statsData.cpu.usagePercent > 80;
    const highMemory = statsData && statsData.memory.usagePercent > 80;
    const manyRestarts = inspectData && inspectData.restartCount > 5;

    if (hasHealthcheck && !inspectData?.state.running) {
      return { text: 'Container is unhealthy', color: 'text-red-400' };
    }

    if (highCpu || highMemory) {
      return { text: 'Container is under high load', color: 'text-yellow-400' };
    }

    if (manyRestarts) {
      return { text: 'Container is restarting frequently', color: 'text-yellow-400' };
    }

    return { text: 'Container is running healthy', color: 'text-emerald-400' };
  };

  const health = getHealthSentence();

  return (
    <div className="max-w-7xl mx-auto px-6 py-5">
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-5 shadow-sm">
        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.5fr_auto] gap-4 items-center">

          {/* Left: Identity & Health */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-slate-800/50 flex items-center justify-center w-10 h-10 shrink-0 border border-slate-700/50">
              <Box size={20} className="text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="font-bold text-slate-100 text-lg truncate leading-tight">{containerName}</h1>
                <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">
                  {truncateId(container.id)}
                </span>
              </div>
              <p className={`text-sm ${health.color} font-medium`}>
                {health.text}
              </p>
            </div>
          </div>

          {/* Middle: Operational Micro-Metrics */}
          <div className="flex items-center gap-x-6 gap-y-2 flex-wrap text-sm border-l border-slate-800/50 pl-6 lg:ml-2">
            {isRunning && statsData ? (
              <>
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-slate-500" />
                  <div className="flex flex-col gap-1 leading-none">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">CPU</span>
                    <span className={`font-mono ${(statsData.cpu?.usagePercent ?? 0) > 80 ? 'text-red-400' : 'text-slate-300'}`}>
                      {formatPercent(statsData.cpu?.usagePercent, 1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MemoryStick size={14} className="text-slate-500" />
                  <div className="flex flex-col gap-1 leading-none">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Mem</span>
                    <span className={`font-mono ${(statsData.memory?.usagePercent ?? 0) > 80 ? 'text-red-400' : 'text-slate-300'}`}>
                      {formatMB(statsData.memory?.usedMB, 0)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <Activity size={14} className="text-slate-500" />
                <span className="text-slate-500 italic">Metrics inactive</span>
              </div>
            )}

            {inspectData && (
              <div className="flex items-center gap-2">
                <RotateCw size={14} className="text-slate-500" />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Restarts</span>
                  <span className={`font-mono ${inspectData.restartCount > 5 ? 'text-yellow-400' : 'text-slate-300'}`}>
                    {inspectData.restartCount}
                  </span>
                </div>
              </div>
            )}

            {lastAction && (
              <div className="flex items-center gap-2">
                <HistoryIcon size={14} className="text-slate-500" />
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Last Action</span>
                  <span className="text-slate-300 capitalize text-xs">
                    {lastAction.action} <span className="text-slate-500 opacity-70">({formatRelativeTime(new Date(lastAction.timestamp).getTime() / 1000)})</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls - Two Row Layout */}
          <div className="flex flex-col gap-2 lg:items-start">
            {/* Row 1: Primary Actions - Start/Stop, Restart, Remove */}
            <div className="flex justify-start gap-2">
              <ContainerControls
                containerId={container.id}
                containerName={containerName}
                containerState={container.state?.status}
                onRemoved={onRemoved}
                unified={true}
                primaryOnly={true}
              />
            </div>

            {/* Row 2: Secondary Actions - Open Shell, Pause/Unpause */}
            {(isRunning || state === 'paused') && (
              <div className="flex justify-start gap-2">
                {onOpenShell && isRunning && (
                  <motion.button
                    onClick={onOpenShell}
                    disabled={isActionLoading}
                    className={`flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 shadow-sm border ${isActionLoading
                        ? 'bg-slate-700/30 text-slate-500 border-slate-700/30 cursor-not-allowed pointer-events-none'
                        : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/30'
                      }`}
                    title={isActionLoading ? 'Action in progress...' : 'Open interactive shell'}
                    whileHover={isActionLoading ? {} : { scale: 1.02 }}
                    whileTap={isActionLoading ? {} : { scale: 0.98 }}
                  >
                    <Terminal size={16} />
                    <span className="hidden sm:inline">Open Shell</span>
                  </motion.button>
                )}
                <ContainerControls
                  containerId={container.id}
                  containerName={containerName}
                  containerState={container.state?.status}
                  secondaryOnly={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Compact Metadata Row */}
        <div className="flex items-center gap-4 mt-6 flex-wrap text-xs text-slate-400 border-t border-slate-800/50 pt-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-500" />
            <span className="text-slate-300 font-mono tracking-tight">{formatImageName(container.image)}</span>
          </div>

          <div className="w-px h-3 bg-slate-800" />

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-500" />
            <span>Created {formatRelativeTime(container.created)}</span>
          </div>

          {inspectData?.state.startedAt && isRunning && (
            <>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                <span>Up {formatRelativeTime(new Date(inspectData.state.startedAt).getTime() / 1000)}</span>
              </div>
            </>
          )}

          {container.ports && container.ports.length > 0 && (
            <>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-2">
                <Network size={14} className="text-slate-500" />
                <span className="font-mono">{formatPorts(container.ports)}</span>
              </div>
            </>
          )}

          {statsData && (
            <>
              <div className="w-px h-3 bg-slate-800" />
              <div className="flex items-center gap-2">
                <Network size={14} className="text-blue-400" />
                <span className="text-slate-300 font-mono">
                  <span className="text-emerald-400">↓{formatNumber(statsData.network?.rxMB, 1)}</span>
                  <span className="text-slate-600 mx-0.5">/</span>
                  <span className="text-amber-400">↑{formatNumber(statsData.network?.txMB, 1)}</span> MB
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerHeader;
