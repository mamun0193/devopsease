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
      return { text: `Container is ${state}`, color: 'text-dds-text-secondary' };
    }

    const hasHealthcheck = inspectData?.healthcheck;
    const highCpu = statsData && statsData.cpu.usagePercent > 80;
    const highMemory = statsData && statsData.memory.usagePercent > 80;
    const manyRestarts = inspectData && inspectData.restartCount > 5;

    if (hasHealthcheck && !inspectData?.state.running) {
      return { text: 'Container is unhealthy', color: 'text-dds-red' };
    }

    if (highCpu || highMemory) {
      return { text: 'Container is under high load', color: 'text-dds-orange' };
    }

    if (manyRestarts) {
      return { text: 'Container is restarting frequently', color: 'text-dds-orange' };
    }

    return { text: 'Container is running healthy', color: 'text-dds-green' };
  };

  const health = getHealthSentence();

  return (
    <div className="max-w-7xl mx-auto px-6 py-5">
      <div className="bg-dds-surface border border-dds-border rounded-xl p-5 shadow-sm">
        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.5fr_auto] gap-4 items-center">

          {/* Left: Identity & Health */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-dds-blue/10 flex items-center justify-center w-10 h-10 shrink-0 border border-dds-blue/20">
              <Box size={20} className="text-dds-blue" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="font-bold text-dds-text-primary text-[17px] truncate leading-tight">{containerName}</h1>
                <span className="text-[11px] text-dds-text-secondary font-mono bg-dds-bg border border-dds-border px-1.5 py-0.5 rounded">
                  {truncateId(container.id)}
                </span>
              </div>
              <p className={`text-[13px] ${health.color} font-medium tracking-wide`}>
                {health.text}
              </p>
            </div>
          </div>

          {/* Middle: Operational Micro-Metrics */}
          <div className="flex items-center gap-x-6 gap-y-2 flex-wrap border-l border-dds-border/80 pl-6 lg:ml-2">
            {isRunning && statsData ? (
              <>
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-dds-text-muted" />
                  <div className="flex flex-col gap-1 leading-none">
                    <span className="text-[10px] text-dds-text-secondary uppercase tracking-wider font-semibold">CPU</span>
                    <span className={`text-[13px] font-mono ${(statsData.cpu?.usagePercent ?? 0) > 80 ? 'text-dds-red font-medium' : 'text-dds-text-primary font-medium'}`}>
                      {formatPercent(statsData.cpu?.usagePercent, 1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MemoryStick size={14} className="text-dds-text-muted" />
                  <div className="flex flex-col gap-1 leading-none">
                    <span className="text-[10px] text-dds-text-secondary uppercase tracking-wider font-semibold">Mem</span>
                    <span className={`text-[13px] font-mono ${(statsData.memory?.usagePercent ?? 0) > 80 ? 'text-dds-red font-medium' : 'text-dds-text-primary font-medium'}`}>
                      {formatMB(statsData.memory?.usedMB, 0)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 opacity-50">
                <Activity size={14} className="text-dds-text-muted" />
                <span className="text-dds-text-secondary text-[12px] italic">Metrics inactive</span>
              </div>
            )}

            {inspectData && (
              <div className="flex items-center gap-2">
                <RotateCw size={14} className="text-dds-text-muted" />
                <div className="flex flex-col gap-1 leading-none">
                  <span className="text-[10px] text-dds-text-secondary uppercase tracking-wider font-semibold">Restarts</span>
                  <span className={`text-[13px] font-mono ${inspectData.restartCount > 5 ? 'text-dds-orange font-medium' : 'text-dds-text-primary font-medium'}`}>
                    {inspectData.restartCount}
                  </span>
                </div>
              </div>
            )}

            {lastAction && (
              <div className="flex items-center gap-2">
                <HistoryIcon size={14} className="text-dds-text-muted" />
                <div className="flex flex-col gap-1 leading-none">
                  <span className="text-[10px] text-dds-text-secondary uppercase tracking-wider font-semibold">Last Action</span>
                  <span className="text-dds-text-primary capitalize text-[12px] font-medium">
                    {lastAction.action} <span className="text-dds-text-muted opacity-70 font-mono text-[10px]">({formatRelativeTime(new Date(lastAction.timestamp).getTime() / 1000)})</span>
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
                    className={`flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200 shadow-sm border ${isActionLoading
                        ? 'bg-dds-bg text-dds-text-muted border-dds-border cursor-not-allowed opacity-60'
                        : 'bg-dds-blue/10 text-dds-blue hover:bg-dds-blue/20 border-dds-blue/30'
                      }`}
                    title={isActionLoading ? 'Action in progress...' : 'Open interactive shell'}
                    whileHover={isActionLoading ? {} : { scale: 1.02 }}
                    whileTap={isActionLoading ? {} : { scale: 0.98 }}
                  >
                    <Terminal size={15} />
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
        <div className="flex items-center gap-4 mt-5 flex-wrap text-[12px] text-dds-text-secondary border-t border-dds-border/80 pt-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-dds-text-muted" />
            <span className="text-dds-text-primary font-mono tracking-tight font-medium">{formatImageName(container.image)}</span>
          </div>

          <div className="w-px h-3 bg-dds-border" />

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-dds-text-muted" />
            <span className="font-mono">Created {formatRelativeTime(container.created)}</span>
          </div>

          {inspectData?.state.startedAt && isRunning && (
            <>
              <div className="w-px h-3 bg-dds-border" />
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-dds-green" />
                <span className="font-mono">Up {formatRelativeTime(new Date(inspectData.state.startedAt).getTime() / 1000)}</span>
              </div>
            </>
          )}

          {container.ports && container.ports.length > 0 && (
            <>
              <div className="w-px h-3 bg-dds-border" />
              <div className="flex items-center gap-2">
                <Network size={14} className="text-dds-text-muted" />
                <span className="font-mono text-dds-text-primary">{formatPorts(container.ports)}</span>
              </div>
            </>
          )}

          {statsData && (
            <>
              <div className="w-px h-3 bg-dds-border" />
              <div className="flex items-center gap-2">
                <Network size={14} className="text-dds-blue" />
                <span className="text-dds-text-primary font-mono">
                  <span className="text-dds-green">↓{formatNumber(statsData.network?.rxMB, 1)}</span>
                  <span className="text-dds-text-muted mx-0.5">/</span>
                  <span className="text-dds-orange">↑{formatNumber(statsData.network?.txMB, 1)}</span> MB
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
