import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  FileText,
  Shield,
  Info,
  History as HistoryIcon
} from 'lucide-react';
import { useContainers, useContainerInspect, useContainerStats, useActions } from '../hooks/useContainers';
import { useContainerPolling } from '../hooks/useContainerPolling';
import { formatContainerName } from '../utils/formatters';
import LogViewer from './LogViewer';
import FailureAnalysis from './FailureAnalysis';
import ContainerInfo from './ContainerInfo';
import ContainerHeader from './ContainerHeader';
import ContainerControls from './ContainerControls';
import Timeline from './Timeline';
import ContainerTerminal from './ContainerTerminal';

type TabType = 'analysis' | 'logs' | 'info' | 'history';

const ContainerDetailsPage: React.FC = () => {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { data: containers = [], isLoading, isFetching } = useContainers();
  const [activeTab, setActiveTab] = React.useState<TabType>('analysis');
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [showStickyControls, setShowStickyControls] = React.useState(false);
  const [logTimeFilter, setLogTimeFilter] = React.useState<{ since?: number; until?: number } | undefined>();
  const [showTerminal, setShowTerminal] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);

  // Find the container
  const container = React.useMemo(() => {
    if (!containerId) return null;
    return containers.find(c => c.id === containerId || c.id.startsWith(containerId)) || null;
  }, [containers, containerId]);

  // Use centralized polling hook for visibility awareness
  const { isPageVisible, isRunning: containerIsRunning } = useContainerPolling(
    container?.id || null,
    container?.state?.status || null
  );

  // Fetch additional data for header with visibility-aware polling
  const { data: inspectData } = useContainerInspect(container?.id || null);
  const { data: statsData } = useContainerStats(
    container?.id || null,
    isPageVisible,
    containerIsRunning
  );
  const { data: actionsData } = useActions({ containerId: container?.id, limit: 1 });

  // Handle container removal - navigate back to dashboard
  const handleContainerRemoved = React.useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Timeline correlation handlers
  const handleViewLogsFromTimeline = React.useCallback((_containerId: string, timestamp: string) => {
    const actionTime = new Date(timestamp).getTime() / 1000;
    const since = Math.floor(actionTime - 30); // 30 seconds before
    const until = Math.floor(actionTime + 90); // 90 seconds after

    setLogTimeFilter({ since, until });
    setActiveTab('logs');
  }, []);

  const handleViewStatsFromTimeline = React.useCallback(() => {
    setActiveTab('info'); // Stats are in the Info tab
  }, []);

  // Listen for scroll events
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Check if header is out of view
      if (headerRef.current) {
        const headerBottom = headerRef.current.getBoundingClientRect().bottom;
        setShowStickyControls(headerBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    // If we're refetching, show a loader instead of "Not Found"
    if (isFetching) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Refreshing container state...</p>
          </div>
        </div>
      );
    }
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

  const name = formatContainerName(container.name);
  const hasIssue = ['exited', 'dead'].includes((container.state?.status || 'unknown').toLowerCase());

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
    {
      id: 'history',
      label: 'History',
      icon: <HistoryIcon size={18} />,
      hint: 'Action timeline'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header - Hidden when scrolled */}
      <header
        ref={headerRef}
        className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800"
      >
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-300">{name}</span>
          </div>
        </div>

        {/* Container Header Component */}
        <ContainerHeader
          container={container}
          containerName={name}
          inspectData={inspectData}
          statsData={statsData}
          lastAction={actionsData?.items?.[0]}
          onRemoved={handleContainerRemoved}
          onOpenShell={() => setShowTerminal(true)}
        />
      </header>

      {/* Tabs - Sticky only for non-logs tabs */}
      <div className={`border-b border-slate-800 bg-slate-900/95 backdrop-blur-xl z-50 ${activeTab !== 'logs' ? 'sticky top-0' : ''
        } ${isScrolled && activeTab !== 'logs' ? 'shadow-lg shadow-slate-950/50' : ''
        }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id
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

            {/* Container Controls in Sticky Tab Bar - only when header is out of view */}
            {showStickyControls && activeTab !== 'logs' && (
              <div className="hidden md:block">
                <ContainerControls
                  containerId={container.id}
                  containerName={name}
                  containerState={container.state?.status}
                  onRemoved={handleContainerRemoved}
                  compact
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content - No animation to prevent layout shifts */}
      <main className="max-w-7xl mx-auto px-2 py-2">
        <div className="transition-opacity duration-150">
          {activeTab === 'analysis' && (
            <FailureAnalysis
              containerId={container.id}
              containerName={name}
              containerState={container.state?.status}
            />
          )}
          {activeTab === 'logs' && (
            <div className="sticky top-0 z-40">
              <LogViewer
                containerId={container.id}
                containerName={name}
                initialTimeRange={logTimeFilter}
              />
            </div>
          )}
          {activeTab === 'info' && (
            <ContainerInfo containerId={container.id} />
          )}
          {activeTab === 'history' && (
            <div className="px-4 py-6">
              <Timeline
                containerId={container.id}
                onViewLogs={handleViewLogsFromTimeline}
                onViewStats={handleViewStatsFromTimeline}
              />
            </div>
          )}
        </div>
      </main>

      {/* Terminal Modal */}
      {showTerminal && (
        <ContainerTerminal
          containerId={container.id}
          containerName={name}
          onClose={() => setShowTerminal(false)}
        />
      )}
    </div>
  );
};

export default ContainerDetailsPage;
