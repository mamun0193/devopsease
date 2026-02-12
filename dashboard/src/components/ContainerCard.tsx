import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Clock,
  Layers,
  Network,
  ChevronRight,
  AlertCircle,
  Activity
} from 'lucide-react';
import type { Container } from '../api';
import {
  formatContainerName,
  truncateId,
  formatRelativeTime,
  formatPorts,
  formatImageName
} from '../utils/formatters';

interface ContainerCardProps {
  container: Container;
}

const ContainerCard: React.FC<ContainerCardProps> = ({ container }) => {
  const name = container.name || 'Unknown';
  const state = (container.state?.status || 'unknown').toLowerCase();
  const isRunning = state === 'running';
  const hasIssue = ['exited', 'dead'].includes(state);

  const getStatusClasses = () => {
    if (isRunning) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (hasIssue) return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (state === 'paused') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  };

  const getIndicatorColor = () => {
    if (isRunning) return 'bg-emerald-500';
    if (hasIssue) return 'bg-red-500';
    if (state === 'paused') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Link to={`/container/${truncateId(container.id)}`}>
      <motion.div
        className={`
          relative bg-slate-900 border rounded-xl overflow-hidden cursor-pointer transition-all h-full flex flex-col
          border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-blue-500/5
          ${hasIssue ? 'border-l-2 border-l-red-500' : ''}
          ${isRunning ? 'border-l-2 border-l-emerald-500' : ''}
        `}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        layout
      >
        {/* Status Indicator Line */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${getIndicatorColor()}`} />

        {/* Main Content */}
        <div className="p-4 pt-5 flex-1 flex flex-col">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Box size={18} className="text-slate-400 shrink-0" />
              <h3 className="font-semibold text-slate-100 truncate">{name}</h3>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getStatusClasses()}`}>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {hasIssue && <AlertCircle size={12} />}
              <span>{container.state?.status || 'Unknown'}</span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="space-y-2 mb-4 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <Layers size={14} className="text-slate-500 shrink-0" />
              <span className="text-slate-500">Image</span>
              <span className="text-slate-300 truncate ml-auto font-mono text-xs" title={container.image}>
                {formatImageName(container.image)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-slate-500 shrink-0" />
              <span className="text-slate-500">Created</span>
              <span className="text-slate-300 ml-auto">
                {formatRelativeTime(container.created)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Network size={14} className="text-slate-500 shrink-0" />
              <span className="text-slate-500">Ports</span>
              <span className="text-slate-300 ml-auto font-mono text-xs">
                {formatPorts(container.ports)}
              </span>
            </div>
          </div>

          {/* ID & Arrow */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <code className="text-xs text-slate-500 font-mono">{truncateId(container.id)}</code>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          </div>

          {/* Status Banner - Consistent height for all cards */}
          <div className="mt-3">
            {hasIssue ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 rounded-lg text-red-400 text-xs border border-red-500/20">
                <AlertCircle size={14} className="shrink-0" />
                <span>This container has stopped. Click to see why.</span>
                <ChevronRight size={14} className="ml-auto shrink-0" />
              </div>
            ) : isRunning ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 text-xs border border-emerald-500/20">
                <Activity size={14} className="shrink-0" />
                <span>Container running. Click for detailed analysis.</span>
                <ChevronRight size={14} className="ml-auto shrink-0" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/50 rounded-lg text-slate-400 text-xs border border-slate-700">
                <Box size={14} className="shrink-0" />
                <span>Click to view container details.</span>
                <ChevronRight size={14} className="ml-auto shrink-0" />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default ContainerCard;
