import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  FileText,
  Shield,
  Info,
  History as HistoryIcon,
  Globe,
  Heart
} from 'lucide-react';
import { useContainers, useContainerInspect, useContainerStats, useActions } from '../hooks/useContainers';
import { useContainerPolling } from '../hooks/useContainerPolling';
import { useContainerHealth } from '../hooks/useContainerHealth';
import { formatContainerName } from '../utils/formatters';
import LogViewer from './LogViewer';
import FailureAnalysis from './FailureAnalysis';
import ContainerInfo from './ContainerInfo';
import ContainerHeader from './ContainerHeader';
import ContainerControls from './ContainerControls';
import Timeline from './Timeline';
import ContainerTerminal from './ContainerTerminal';
import ExposePortModal from './tunnels/ExposePortModal';
import TunnelTable from './tunnels/TunnelTable';
import { useUserTunnels } from '../hooks/useTunnels';
import ContainerStatsPanel from './ContainerStatsPanel';
import HealthAlertBanner from './HealthAlertBanner';
import HealthTimeline from './HealthTimeline';

type TabType = 'analysis' | 'logs' | 'info' | 'history' | 'access';

const ContainerDetailsPage: React.FC = () => {
  const { containerId } = useParams<{ containerId: string }>();
  const navigate = useNavigate();
  const { data: containers = [], isLoading, isFetching } = useContainers();
  const [activeTab, setActiveTab] = React.useState<TabType>('analysis');
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [showStickyControls, setShowStickyControls] = React.useState(false);
  const [logTimeFilter, setLogTimeFilter] = React.useState<{ since?: number; until?: number } | undefined>();
  const [showTerminal, setShowTerminal] = React.useState(false);
  const [showExposeModal, setShowExposeModal] = React.useState(false);
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

  // Tunnel data — scoped to this container
  const {
    data: tunnels = [],
    refetch: refetchTunnels,
  } = useUserTunnels(container?.id);

  // Health data for alert banner and timeline
  const { data: healthData, isLoading: healthLoading } = useContainerHealth(container?.id || null);
  const [healthBannerDismissed, setHealthBannerDismissed] = React.useState(false);

  const activeTunnelCount = tunnels.filter((t) => t.status === 'ACTIVE').length;

  // Handle container removal - navigate back to dashboard
  const handleContainerRemoved = React.useCallback(() => {
    navigate('/containers');
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
      <div className="min-h-screen bg-dds-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-dds-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-dds-text-muted text-sm font-medium tracking-wide">Loading container details...</p>
        </div>
      </div>
    );
  }

  if (!container) {
    // If we're refetching, show a loader instead of "Not Found"
    if (isFetching) {
      return (
        <div className="min-h-screen bg-dds-bg flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-dds-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-dds-text-muted text-sm font-medium tracking-wide">Refreshing container state...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-dds-bg flex items-center justify-center">
        <div className="text-center">
          <Box size={64} className="text-dds-text-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-dds-text-primary mb-2">Container Not Found</h2>
          <p className="text-dds-text-secondary mb-6">The container you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/containers"
            className="btn-primary inline-flex"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Containers
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
    {
      id: 'history',
      label: 'History',
      icon: <HistoryIcon size={16} />,
      hint: 'Action timeline'
    },
    {
      id: 'access',
      label: 'Public Access',
      icon: <Globe size={16} />,
      hint: 'Expose ports temporarily'
    },
  ];

  return (
    <div className="min-h-screen bg-dds-bg">
      {/* Header - Hidden when scrolled */}
      <header
        ref={headerRef}
        className="bg-dds-surface/80 backdrop-blur-xl border-b border-dds-border"
      >
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 text-[13px] font-mono text-dds-text-secondary">
            <Link to="/containers" className="hover:text-dds-white transition-colors flex items-center gap-1.5">
              <ArrowLeft size={14} />
              Containers
            </Link>
            <span className="text-dds-text-muted">/</span>
            <span className="text-dds-text-primary font-medium">{name}</span>
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
      <div className={`border-b border-dds-border bg-dds-surface/95 backdrop-blur-xl z-50 ${activeTab !== 'logs' ? 'sticky top-0' : ''
        } ${isScrolled && activeTab !== 'logs' ? 'shadow-lg shadow-black/20' : ''
        }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id
                    ? 'text-dds-primary border-dds-primary bg-dds-primary/5'
                    : 'text-dds-text-secondary border-transparent hover:text-dds-white hover:bg-dds-surface/50'
                    }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
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
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="transition-opacity duration-150">
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* Health alert banner — dismissible per page load */}
              {healthData && !healthBannerDismissed && (
                <HealthAlertBanner
                  health={healthData}
                  onDismiss={() => setHealthBannerDismissed(true)}
                />
              )}
              <ContainerStatsPanel
                containerId={container.id}
                containerState={container.state?.status || 'unknown'}
                resourceLimits={inspectData?.resourceLimits}
              />
              <FailureAnalysis
                containerId={container.id}
                containerName={name}
                containerState={container.state?.status}
              />
              {/* Health state timeline */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Heart size={18} className="text-dds-red" />
                  <h2 className="text-sm font-semibold text-dds-text-primary uppercase tracking-wider">Health State History</h2>
                </div>
                <div className="bg-dds-surface/50 border border-dds-border rounded-xl p-5 shadow-sm">
                  <HealthTimeline health={healthData} isLoading={healthLoading} />
                </div>
              </div>
            </div>
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
            <div className="py-2">
              <Timeline
                containerId={container.id}
                onViewLogs={handleViewLogsFromTimeline}
                onViewStats={handleViewStatsFromTimeline}
              />
            </div>
          )}
          {activeTab === 'access' && (
            <div className="py-4 space-y-6 max-w-4xl mx-auto">
              {/* Header row */}
              <div className="flex items-center justify-between gap-4 flex-wrap bg-dds-surface border border-dds-border rounded-xl p-5 shadow-sm">
                <div>
                  <h2 className="text-base font-semibold text-dds-text-primary flex items-center gap-2">
                    <Globe size={18} className="text-dds-primary" />
                    Public Access
                  </h2>
                  <p className="text-[13px] text-dds-text-secondary mt-1">
                    Temporary, time-limited HTTPS tunnels for your container ports.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Quota display */}
                  <span className={`text-[11px] font-mono font-medium px-3 py-1.5 rounded-md border ${activeTunnelCount >= 3
                    ? 'bg-dds-orange/10 border-dds-orange/30 text-dds-orange'
                    : 'bg-dds-surface border-dds-border text-dds-text-secondary'
                    }`}>
                    {activeTunnelCount} / 3 TUNNELS
                  </span>
                  <button
                    onClick={() => setShowExposeModal(true)}
                    disabled={container.state?.status !== 'running' || activeTunnelCount >= 3}
                    title={
                      container.state?.status !== 'running'
                        ? 'Container must be running to expose a port'
                        : activeTunnelCount >= 3
                          ? 'Maximum 3 active tunnels reached'
                          : 'Expose a container port publicly'
                    }
                    className="btn-primary"
                  >
                    <Globe size={14} className="mr-1" />
                    Expose Port
                  </button>
                </div>
              </div>

              {/* Container not running warning */}
              {container.state?.status !== 'running' && (
                <div className="flex items-center gap-2 px-4 py-3 bg-dds-surface/80 border border-dds-border rounded-md text-[13px] text-dds-text-secondary shadow-sm">
                  <Globe size={14} className="text-dds-text-muted shrink-0" />
                  <span>Container must be in a <strong className="text-dds-white font-medium">running</strong> state to expose ports.</span>
                </div>
              )}

              {/* Tunnel table */}
              <div className="bg-dds-surface border border-dds-border rounded-xl p-1 shadow-sm overflow-hidden">
                <TunnelTable
                  tunnels={tunnels}
                  onRefetch={refetchTunnels}
                />
              </div>
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

      {/* Expose Port Modal */}
      <ExposePortModal
        isOpen={showExposeModal}
        onClose={() => setShowExposeModal(false)}
        containerId={container.id}
        inspectData={inspectData}
        activeTunnelCount={activeTunnelCount}
      />
    </div>
  );
};

export default ContainerDetailsPage;
