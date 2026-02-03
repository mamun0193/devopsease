import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Box,
  FileText,
  Shield,
  Info,
  ChevronRight
} from 'lucide-react';
import type { Container } from '../api';
import { formatContainerName, truncateId } from '../utils/formatters';
import LogViewer from './LogViewer';
import FailureAnalysis from './FailureAnalysis';
import ContainerInfo from './ContainerInfo';

interface ContainerDetailsProps {
  container: Container | null;
  onClose: () => void;
}

type TabType = 'analysis' | 'logs' | 'info';

const ContainerDetails: React.FC<ContainerDetailsProps> = ({ container, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabType>('analysis');

  if (!container) return null;

  const name = formatContainerName(container.Names);
  const state = container.State.toLowerCase();
  const isRunning = state === 'running';
  const hasIssue = ['exited', 'dead'].includes(state);

  const getStatusClasses = () => {
    if (isRunning) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (hasIssue) return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (state === 'paused') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; hint: string }[] = [
    { 
      id: 'analysis', 
      label: 'Analysis', 
      icon: <Shield size={16} />,
      hint: hasIssue ? 'See what went wrong' : 'Health check'
    },
    { 
      id: 'logs', 
      label: 'Logs', 
      icon: <FileText size={16} />,
      hint: 'Application output'
    },
    { 
      id: 'info', 
      label: 'Details', 
      icon: <Info size={16} />,
      hint: 'Container configuration'
    },
  ];

  return (
    <AnimatePresence>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      {/* Panel */}
      <motion.div
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                <Box size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100">{name}</h2>
                <code className="text-xs text-slate-500 font-mono">{truncateId(container.Id)}</code>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getStatusClasses()}`}>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {container.State}
            </div>
          </div>
          <button 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Issue Banner */}
        {hasIssue && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400">
            <Shield size={16} />
            <span className="text-sm flex-1">This container has stopped. Check the Analysis tab to understand why.</span>
            {activeTab !== 'analysis' && (
              <button 
                className="flex items-center gap-1 text-sm font-medium hover:text-red-300 transition-colors"
                onClick={() => setActiveTab('analysis')}
              >
                Go to Analysis
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'text-blue-400 border-blue-500 bg-blue-500/5' 
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/50'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </span>
              <span className="text-xs opacity-70">{tab.hint}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'analysis' && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <FailureAnalysis 
                  containerId={container.Id}
                  containerName={name}
                  containerState={container.State}
                />
              </motion.div>
            )}
            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <LogViewer 
                  containerId={container.Id}
                  containerName={name}
                />
              </motion.div>
            )}
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <ContainerInfo containerId={container.Id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContainerDetails;
