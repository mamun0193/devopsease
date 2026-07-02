import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitMerge, FileJson, AlertCircle } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useRelease } from '../hooks/useReleases';
import { useRoutingTable } from '../hooks/useTraffic';
import ManifestViewer from '../components/releases/ManifestViewer';
import ReleaseTimeline from '../components/releases/ReleaseTimeline';
import ExplainabilityPanel from '../components/releases/ExplainabilityPanel';
import RoutingInspector from '../components/releases/RoutingInspector';
import PromoteReleaseDialog from '../components/releases/PromoteReleaseDialog';
import RollbackReleaseDialog from '../components/releases/RollbackReleaseDialog';
import TrafficVisualization from '../components/releases/TrafficVisualization';

const ReleaseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading } = useRelease(id!);
  
  // Hardcode a slug or fetch application data for routing table in a real scenario
  const { data: routingTable } = useRoutingTable('demo-app');

  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [isRollbackOpen, setIsRollbackOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'manifest' | 'routing' | 'explainability'>('manifest');

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-700 border-t-purple-500" />
          <p>Loading release details...</p>
        </div>
      </div>
    );
  }

  if (!release) return null;

  const mockTimelineEvents = [
    { id: '1', status: 'completed' as const, title: 'Release Created', description: 'Manifest generated and saved as Draft.' },
    { id: '2', status: release.status === 'Draft' ? 'pending' : 'completed' as const, title: 'Prepared', description: 'Images and configurations validated.' },
    { id: '3', status: release.status === 'Active' ? 'completed' : 'pending' as const, title: 'Traffic Switch', description: 'Routing Table updated with new weights.' },
  ];

  return (
    <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/releases')}
                className="p-2 rounded-lg text-dds-text-secondary hover:bg-dds-muted hover:text-dds-text-primary transition-colors border border-dds-border bg-dds-elevated"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Release v{release.version}</h1>
                  <StatusBadge status={release.status as any} />
                </div>
                <p className="text-sm text-dds-text-secondary font-mono mt-1">{release._id}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {release.status !== 'Active' && release.status !== 'Archived' && release.status !== 'RolledBack' && (
                <button 
                  onClick={() => setIsPromoteOpen(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <GitMerge className="size-4" />
                  Promote
                </button>
              )}
              {(release.status === 'Active' || release.status === 'Promoting') && (
                <button 
                  onClick={() => setIsRollbackOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-dds-red/30 bg-dds-red/10 px-4 py-2 text-sm font-medium text-dds-red hover:bg-dds-red/20 transition-colors"
                >
                  <AlertCircle className="size-4" />
                  Rollback
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Traffic Overview */}
              <div className="card p-6">
                <h3 className="text-[11px] font-semibold text-dds-text-muted uppercase tracking-wider mb-4">Traffic Split</h3>
                <TrafficVisualization routingTable={routingTable || null} activeReleases={[release]} />
              </div>

              {/* Tabs */}
              <div className="card overflow-hidden">
                <div className="flex border-b border-dds-border">
                  <button 
                    onClick={() => setActiveTab('manifest')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'manifest' ? 'border-dds-primary text-dds-primary' : 'border-transparent text-dds-text-secondary hover:text-dds-text-primary hover:bg-dds-muted/50'}`}
                  >
                    <FileJson className="size-4" /> Manifest
                  </button>
                  <button 
                    onClick={() => setActiveTab('routing')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'routing' ? 'border-dds-primary text-dds-primary' : 'border-transparent text-dds-text-secondary hover:text-dds-text-primary hover:bg-dds-muted/50'}`}
                  >
                    <GitMerge className="size-4" /> Routing Path
                  </button>
                  <button 
                    onClick={() => setActiveTab('explainability')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-[13px] font-medium border-b-2 transition-colors ${activeTab === 'explainability' ? 'border-dds-primary text-dds-primary' : 'border-transparent text-dds-text-secondary hover:text-dds-text-primary hover:bg-dds-muted/50'}`}
                  >
                    <AlertCircle className="size-4" /> Telemetry
                  </button>
                </div>
                
                <div className="p-6">
                  {activeTab === 'manifest' && <ManifestViewer manifest={typeof release.manifestId === 'object' ? release.manifestId : null} />}
                  {activeTab === 'routing' && <RoutingInspector routingTable={routingTable || null} activeReleases={[release]} />}
                  {activeTab === 'explainability' && <ExplainabilityPanel records={release.explainabilityLog} />}
                </div>
              </div>

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Timeline */}
              <div className="card p-6">
                <h3 className="text-[11px] font-semibold text-dds-text-muted uppercase tracking-wider mb-6">Release Lifecycle</h3>
                <ReleaseTimeline events={mockTimelineEvents} />
              </div>

              {/* Targets */}
              <div className="card p-6">
                <h3 className="text-[11px] font-semibold text-dds-text-muted uppercase tracking-wider mb-4">Deployment Targets</h3>
                {release.targets.length === 0 ? (
                  <p className="text-sm text-dds-text-secondary">No targets bound.</p>
                ) : (
                  <div className="space-y-3">
                    {release.targets.map((target, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-dds-surface border border-dds-border p-3 rounded-lg">
                        <div>
                          <p className="text-[13px] font-medium text-dds-text-primary">{target.name}</p>
                          <p className="text-[11px] font-mono text-dds-text-secondary">{target.deploymentId}</p>
                        </div>
                        <span className={`text-[11px] px-2 py-1 rounded border ${target.status === 'pending' ? 'bg-dds-yellow/10 border-dds-yellow/30 text-dds-yellow' : 'bg-dds-green/10 border-dds-green/30 text-dds-green'}`}>
                          {target.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PromoteReleaseDialog 
        isOpen={isPromoteOpen} 
        onClose={() => setIsPromoteOpen(false)} 
        release={release} 
      />
      <RollbackReleaseDialog 
        isOpen={isRollbackOpen} 
        onClose={() => setIsRollbackOpen(false)} 
        release={release} 
      />
    </div>
  );
};

export default ReleaseDetailsPage;
