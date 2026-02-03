import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Box,
  FileText,
  Shield,
  Info,
  Activity,
  Clock,
  Layers,
  Network
} from 'lucide-react';
import { useContainers } from '../hooks/useContainers';
import { formatContainerName, truncateId, formatRelativeTime, formatImageName, formatPorts } from '../utils/formatters';
import LogViewer from './LogViewer';
import FailureAnalysis from './FailureAnalysis';
import ContainerInfo from './ContainerInfo';

type TabType = 'analysis' | 'logs' | 'info';

const ContainerDetailsPage: React.FC = () => {
  const { containerId } = useParams<{ containerId: string }>();
  const { data: containers = [], isLoading } = useContainers();
  const [activeTab, setActiveTab] = React.useState<TabType>('analysis');
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Listen for scroll events
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const container = React.useMemo(() => {
    if (!containerId) return null;
    return containers.find(c => c.Id === containerId || c.Id.startsWith(containerId)) || null;
  }, [containers, containerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading container details...</p>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Box size={64} className="text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-200 mb-2">Container Not Found</h2>
          <p className="text-slate-400 mb-6">The container you're looking for doesn't exist or has been removed.</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
      icon: <Shield size={18} />,
      hint: hasIssue ? 'See what went wrong' : 'Health check'
    },
    { 
      id: 'logs', 
      label: 'Logs', 
      icon: <FileText size={18} />,
      hint: 'Application output'
    },
    { 
      id: 'info', 
      label: 'Details', 
      icon: <Info size={18} />,
      hint: 'Container configuration'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header - Hidden when scrolled */}
      <header 
        className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link to="/" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-300">{name}</span>
          </div>

          {/* Container Info */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-800 flex items-center justify-center w-14 h-14">
                <Box size={28} className="text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-bold text-slate-100 text-2xl">{name}</h1>
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${getStatusClasses()}`}>
                    {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    {container.State}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <code className="text-sm text-slate-500 font-mono">{truncateId(container.Id)}</code>
                  {hasIssue && (
                    <span className="text-xs text-red-400 flex items-center gap-1">
                      <Shield size={12} />
                      Stopped unexpectedly
                    </span>
                  )}
                  {isRunning && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <Activity size={12} />
                      Running smoothly
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                <Layers size={16} className="text-slate-500" />
                <span className="text-sm text-slate-300 font-mono">{formatImageName(container.Image)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                <Clock size={16} className="text-slate-500" />
                <span className="text-sm text-slate-300">{formatRelativeTime(container.Created)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                <Network size={16} className="text-slate-500" />
                <span className="text-sm text-slate-300 font-mono">{formatPorts(container.Ports)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs - Sticky only for non-logs tabs */}
      <div className={`border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl z-50 ${
        activeTab !== 'logs' ? 'sticky top-0' : ''
      } ${
        isScrolled && activeTab !== 'logs' ? 'shadow-lg shadow-slate-950/50' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.id 
                    ? 'text-blue-400 border-blue-500 bg-blue-500/5' 
                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="hidden sm:inline text-xs opacity-60">• {tab.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content - No animation to prevent layout shifts */}
      <main className="max-w-7xl mx-auto px-2 py-2">
        <div className="transition-opacity duration-150">
          {activeTab === 'analysis' && (
            <FailureAnalysis 
              containerId={container.Id}
              containerName={name}
              containerState={container.State}
            />
          )}
          {activeTab === 'logs' && (
            <div className="sticky top-0 z-40">
              <LogViewer 
                containerId={container.Id}
                containerName={name}
              />
            </div>
          )}
          {activeTab === 'info' && (
            <ContainerInfo containerId={container.Id} />
          )}
        </div>
      </main>
    </div>
  );
};

export default ContainerDetailsPage;
