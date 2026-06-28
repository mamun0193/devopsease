import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Globe, ExternalLink, Copy, CheckCircle2, XCircle, ArrowLeft,
  AlertTriangle, Loader2, Server, Cloud, Terminal, Eye, EyeOff,
  Trash2, Activity, BarChart3, Settings, Layers, Link2, Zap
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useApplication, useApplicationMetrics, useApplicationDeployments, useUpdateApplication, useDeleteApplication } from '../hooks/useApplications';

type Tab = 'overview' | 'deployments' | 'traffic' | 'domains' | 'settings';

const TABS: { key: Tab; label: string; icon: typeof Activity }[] = [
  { key: 'overview', label: 'Overview', icon: Zap },
  { key: 'deployments', label: 'Deployments', icon: Layers },
  { key: 'traffic', label: 'Traffic', icon: BarChart3 },
  { key: 'domains', label: 'Domains', icon: Link2 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  running: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Running', dot: 'bg-emerald-400 shadow-emerald-400/50' },
  starting: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Starting', dot: 'bg-amber-400 shadow-amber-400/50 animate-pulse' },
  stopping: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Stopping', dot: 'bg-orange-400 shadow-orange-400/50 animate-pulse' },
  unhealthy: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Unhealthy', dot: 'bg-red-400 shadow-red-400/50' },
  stopped: { color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Stopped', dot: 'bg-slate-500' },
};

const PROVIDER_CONFIG: Record<string, { icon: typeof Server; label: string }> = {
  docker: { icon: Server, label: 'Docker' },
  kubernetes: { icon: Cloud, label: 'Kubernetes' },
  ecs: { icon: Cloud, label: 'ECS' },
  ssh: { icon: Terminal, label: 'SSH' },
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-dds-border/30 last:border-0">
      <span className="text-xs text-dds-text-muted font-medium">{label}</span>
      <span className="text-sm text-dds-white">{children}</span>
    </div>
  );
}

function CopyableUrl({ url, fullUrl }: { url: string; fullUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-dds-bg/50 border border-dds-border/50">
      <Globe size={14} className="text-dds-primary shrink-0" />
      <code className="text-sm text-dds-text-secondary font-mono truncate flex-1">{url}</code>
      <button onClick={() => { navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="p-1.5 rounded hover:bg-white/5 transition-colors">
        {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} className="text-dds-text-muted" />}
      </button>
      <a href={fullUrl} target="_blank" rel="noopener noreferrer"
        className="p-1.5 rounded hover:bg-white/5 transition-colors">
        <ExternalLink size={14} className="text-dds-text-muted hover:text-dds-primary transition-colors" />
      </a>
    </div>
  );
}

function MetricCard({ label, value, unit, color = 'text-dds-white' }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="bg-dds-surface border border-dds-border rounded-xl p-4">
      <p className="text-xs text-dds-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value}<span className="text-sm font-normal text-dds-text-muted ml-1">{unit}</span>
      </p>
    </div>
  );
}

// Tab Content 

function OverviewTab({ app }: { app: any }) {
  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.stopped;
  const provider = PROVIDER_CONFIG[app.provider] || PROVIDER_CONFIG.docker;
  const ProviderIcon = provider.icon;
  const deployment = app.currentDeploymentId || app.currentDeployment;
  const runtime = app.runtime;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Application Info */}
      <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-dds-white mb-4 flex items-center gap-2">
          <Zap size={15} className="text-dds-primary" /> Application Info
        </h3>
        <InfoRow label="Name">{app.name}</InfoRow>
        <InfoRow label="Slug">
          <code className="text-xs font-mono text-dds-primary bg-dds-primary/10 px-2 py-0.5 rounded">{app.slug}</code>
        </InfoRow>
        <InfoRow label="Status">
          <span className={`inline-flex items-center gap-1.5 ${statusConfig.color}`}>
            <div className={`w-2 h-2 rounded-full shadow-[0_0_6px] ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
        </InfoRow>
        <InfoRow label="Provider">
          <span className="inline-flex items-center gap-1.5 text-dds-text-secondary">
            <ProviderIcon size={14} /> {provider.label}
          </span>
        </InfoRow>
        <InfoRow label="Visibility">
          {app.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
        </InfoRow>
        <InfoRow label="Created">
          {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </InfoRow>
      </div>

      {/* Runtime Info */}
      <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-dds-white mb-4 flex items-center gap-2">
          <Server size={15} className="text-dds-primary" /> Runtime
        </h3>
        {deployment ? (
          <>
            <InfoRow label="Deployment Status">
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CONFIG[deployment.status]?.bg || 'bg-slate-500/10'} ${STATUS_CONFIG[deployment.status]?.color || 'text-slate-400'}`}>
                {deployment.status}
              </span>
            </InfoRow>
            {deployment.imageTag && <InfoRow label="Image">{deployment.imageTag}</InfoRow>}
            {deployment.containerName && <InfoRow label="Container">{deployment.containerName}</InfoRow>}
            {runtime && (
              <>
                <InfoRow label="Endpoint">
                  <code className="text-xs font-mono text-dds-text-secondary">{runtime.endpoint || '—'}</code>
                </InfoRow>
                <InfoRow label="Protocol">
                  <span className="text-xs text-dds-text-secondary uppercase">{runtime.protocol || 'http'}</span>
                </InfoRow>
                <InfoRow label="Healthy">
                  {runtime.healthy
                    ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Yes</span>
                    : <span className="text-red-400 flex items-center gap-1"><XCircle size={13} /> No</span>
                  }
                </InfoRow>
                {runtime.version && (
                  <InfoRow label="Version">
                    <code className="text-xs font-mono text-dds-text-secondary">{runtime.version}</code>
                  </InfoRow>
                )}
                {runtime.capabilities && runtime.capabilities.length > 0 && (
                  <InfoRow label="Capabilities">
                    <div className="flex gap-1.5">
                      {runtime.capabilities.map((cap: string) => (
                        <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-dds-primary/10 text-dds-primary font-mono uppercase">{cap}</span>
                      ))}
                    </div>
                  </InfoRow>
                )}
                {runtime.metadata?.replicaCount != null && (
                  <InfoRow label="Replicas">{runtime.metadata.replicaCount}</InfoRow>
                )}
              </>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <XCircle size={20} className="text-dds-text-muted mx-auto mb-2" />
            <p className="text-sm text-dds-text-muted">No active deployment</p>
          </div>
        )}
      </div>

      {/* Description */}
      {app.description && (
        <div className="lg:col-span-2 bg-dds-surface border border-dds-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-dds-white mb-2">Description</h3>
          <p className="text-sm text-dds-text-secondary leading-relaxed">{app.description}</p>
        </div>
      )}
    </div>
  );
}

function DeploymentsTab({ applicationId }: { applicationId: string }) {
  const { data: deployments, isLoading } = useApplicationDeployments(applicationId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={20} className="text-dds-primary animate-spin" /></div>;
  if (!deployments?.length) return (
    <div className="text-center py-12">
      <Layers size={24} className="text-dds-text-muted mx-auto mb-3" />
      <p className="text-sm text-dds-text-muted">No deployments found</p>
    </div>
  );

  return (
    <div className="bg-dds-surface border border-dds-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dds-border">
            <th className="px-5 py-3 text-left text-xs font-semibold text-dds-text-muted uppercase">Status</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-dds-text-muted uppercase">Image</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-dds-text-muted uppercase">Environment</th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-dds-text-muted uppercase">Created</th>
          </tr>
        </thead>
        <tbody>
          {deployments.map((dep: any) => {
            const sc = STATUS_CONFIG[dep.status] || STATUS_CONFIG.stopped;
            return (
              <tr key={dep._id} className="border-b border-dds-border/30 hover:bg-dds-bg/30 transition-colors">
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} /> {sc.label}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <code className="text-xs font-mono text-dds-text-secondary">{dep.imageTag || '—'}</code>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-dds-text-secondary">{dep.environment || 'development'}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs text-dds-text-muted">
                    {new Date(dep.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrafficTab({ applicationId, slug }: { applicationId: string; slug: string }) {
  const { data: metrics, isLoading } = useApplicationMetrics(applicationId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 size={20} className="text-dds-primary animate-spin" /></div>;

  const m = metrics || { requests: 0, errors: 0, avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, activeConnections: 0, bytesTransferred: 0, statusCodes: {} };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Requests" value={m.requests.toLocaleString()} />
        <MetricCard label="Errors" value={m.errors.toLocaleString()} color={m.errors > 0 ? 'text-red-400' : 'text-dds-white'} />
        <MetricCard label="Avg Latency" value={m.avgLatencyMs} unit="ms" />
        <MetricCard label="P95 Latency" value={m.p95LatencyMs} unit="ms" />
        <MetricCard label="P99 Latency" value={m.p99LatencyMs} unit="ms" />
        <MetricCard label="Active Connections" value={m.activeConnections} />
        <MetricCard label="Bandwidth" value={(m.bytesTransferred / (1024 * 1024)).toFixed(2)} unit="MB" />
      </div>

      {/* Status Code Breakdown */}
      {Object.keys(m.statusCodes || {}).length > 0 && (
        <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-dds-white mb-4">Status Codes</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(m.statusCodes).sort(([a], [b]) => Number(a) - Number(b)).map(([code, count]) => {
              const codeNum = Number(code);
              const color = codeNum < 300 ? 'text-emerald-400 bg-emerald-500/10' :
                codeNum < 400 ? 'text-blue-400 bg-blue-500/10' :
                codeNum < 500 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10';
              return (
                <span key={code} className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium ${color}`}>
                  {code}: {String(count)}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DomainsTab({ app }: { app: any }) {
  return (
    <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-dds-white mb-4 flex items-center gap-2">
        <Link2 size={15} className="text-dds-primary" /> Domains
      </h3>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-dds-text-muted mb-1.5 font-medium">Default Domain</p>
          <CopyableUrl url={`/apps/${app.slug}`} fullUrl={app.gatewayUrl || app.defaultDomain || `/apps/${app.slug}`} />
        </div>
        {app.customDomains?.length > 0 && (
          <div>
            <p className="text-xs text-dds-text-muted mb-1.5 font-medium mt-4">Custom Domains</p>
            {app.customDomains.map((domain: string) => (
              <div key={domain} className="px-3 py-2 rounded-lg bg-dds-bg/50 border border-dds-border/50 mb-2">
                <code className="text-sm text-dds-text-secondary font-mono">{domain}</code>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-dds-text-muted mt-4 italic">
          Custom domain support coming soon.
        </p>
      </div>
    </div>
  );
}

function SettingsTab({ app }: { app: any }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateApplication();
  const deleteMutation = useDeleteApplication();
  const [visibility, setVisibility] = useState(app.visibility);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggleVisibility = () => {
    const next = visibility === 'public' ? 'private' : 'public';
    setVisibility(next);
    updateMutation.mutate({ id: app._id, data: { visibility: next } });
  };

  const handleDelete = () => {
    deleteMutation.mutate(app._id, {
      onSuccess: () => navigate('/applications'),
    });
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Visibility */}
      <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-dds-white mb-3 flex items-center gap-2">
          {visibility === 'public' ? <Eye size={15} className="text-dds-primary" /> : <EyeOff size={15} className="text-dds-primary" />}
          Visibility
        </h3>
        <p className="text-xs text-dds-text-muted mb-4">
          {visibility === 'public'
            ? 'This application is publicly accessible. Anyone with the URL can access it.'
            : 'This application is private. Only you can access it (requires authentication).'}
        </p>
        <button
          onClick={handleToggleVisibility}
          disabled={updateMutation.isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-dds-border
            bg-dds-bg hover:bg-dds-surface text-dds-text-secondary hover:text-dds-white transition-colors"
        >
          {updateMutation.isPending ? 'Updating...' : `Make ${visibility === 'public' ? 'Private' : 'Public'}`}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-dds-surface border border-red-500/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
          <AlertTriangle size={15} /> Danger Zone
        </h3>
        <p className="text-xs text-dds-text-muted mb-4">
          Deleting this application will remove its gateway URL and disassociate it from all deployments.
          This action cannot be undone.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-red-500/30
              bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            Delete Application
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-dds-border text-dds-text-muted hover:text-dds-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: app, isLoading, error } = useApplication(id);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 size={28} className="text-dds-primary animate-spin" />
        </div>
      </>
    );
  }

  if (error || !app) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <AlertTriangle size={32} className="text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-dds-white mb-2">Application Not Found</h2>
          <button onClick={() => navigate('/applications')}
            className="text-sm text-dds-primary hover:underline">Back to Applications</button>
        </div>
      </>
    );
  }

  const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.stopped;
  const gatewayUrl = app.gatewayUrl || app.defaultDomain || `/apps/${app.slug}`;

  return (
    <>
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Back button */}
        <button onClick={() => navigate('/applications')}
          className="inline-flex items-center gap-1.5 text-sm text-dds-text-muted hover:text-dds-white transition-colors mb-6">
          <ArrowLeft size={15} /> Applications
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} border ${statusConfig.color.replace('text-', 'border-')}/20 flex items-center justify-center`}>
              <Globe size={22} className={statusConfig.color} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-dds-white">{app.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_6px] ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              <div className="mt-1">
                <CopyableUrl url={`/apps/${app.slug}`} fullUrl={gatewayUrl} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-dds-surface border border-dds-border rounded-xl overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-dds-primary/15 text-dds-primary'
                    : 'text-dds-text-muted hover:text-dds-text-secondary hover:bg-dds-bg/30'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab app={app} />}
          {activeTab === 'deployments' && <DeploymentsTab applicationId={app._id} />}
          {activeTab === 'traffic' && <TrafficTab applicationId={app._id} slug={app.slug} />}
          {activeTab === 'domains' && <DomainsTab app={app} />}
          {activeTab === 'settings' && <SettingsTab app={app} />}
        </motion.div>
      </div>
    </>
  );
}
