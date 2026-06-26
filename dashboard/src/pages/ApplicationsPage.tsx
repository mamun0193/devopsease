import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Search, ExternalLink, Copy, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Rocket, Plus, ArrowUpRight, Zap, Server,
  Cloud, Terminal, Filter
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useApplications } from '../hooks/useApplications';
import type { Application } from '../api';

type StatusFilter = 'all' | 'running' | 'stopped' | 'unhealthy' | 'starting';

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2; label: string }> = {
  running: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2, label: 'Running' },
  starting: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Loader2, label: 'Starting' },
  stopping: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: Loader2, label: 'Stopping' },
  unhealthy: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle, label: 'Unhealthy' },
  stopped: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: XCircle, label: 'Stopped' },
};

const PROVIDER_CONFIG: Record<string, { icon: typeof Server; label: string; color: string }> = {
  docker: { icon: Server, label: 'Docker', color: 'text-blue-400' },
  kubernetes: { icon: Cloud, label: 'Kubernetes', color: 'text-violet-400' },
  ecs: { icon: Cloud, label: 'ECS', color: 'text-orange-400' },
  ssh: { icon: Terminal, label: 'SSH', color: 'text-green-400' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.stopped;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
      <Icon size={12} className={status === 'starting' || status === 'stopping' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}

function HealthDot({ health }: { health: string }) {
  const colorMap: Record<string, string> = {
    running: 'bg-emerald-400 shadow-emerald-400/50',
    starting: 'bg-amber-400 shadow-amber-400/50 animate-pulse',
    stopping: 'bg-orange-400 shadow-orange-400/50 animate-pulse',
    unhealthy: 'bg-red-400 shadow-red-400/50',
    stopped: 'bg-slate-500',
  };
  return <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px] ${colorMap[health] || colorMap.stopped}`} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-white/5 transition-colors" title="Copy URL">
      {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} className="text-dds-text-muted" />}
    </button>
  );
}

function ApplicationCard({ app, index }: { app: Application; index: number }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.stopped;
  const provider = PROVIDER_CONFIG[app.provider] || PROVIDER_CONFIG.docker;
  const ProviderIcon = provider.icon;
  const gatewayUrl = app.gatewayUrl || app.defaultDomain || `/apps/${app.slug}`;
  const shortUrl = `/apps/${app.slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/applications/${app._id}`)}
      className={`group relative bg-dds-surface border border-dds-border rounded-xl overflow-hidden cursor-pointer
        hover:border-dds-primary/40 hover:shadow-lg hover:shadow-dds-primary/5 transition-all duration-300`}
    >
      {/* Status accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${config.bg.replace('/10', '/60')}`} />

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <HealthDot health={app.health} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-dds-white truncate group-hover:text-dds-primary transition-colors">
                {app.name}
              </h3>
              {app.repository && (
                <p className="text-xs text-dds-text-muted truncate mt-0.5">
                  {(app.repository as any)?.repoName || (app.repositoryId as any)?.repoName || '—'}
                </p>
              )}
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Gateway URL */}
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-dds-bg/50 border border-dds-border/50">
          <Globe size={13} className="text-dds-primary shrink-0" />
          <code className="text-xs text-dds-text-secondary truncate flex-1 font-mono">{shortUrl}</code>
          <CopyButton text={gatewayUrl} />
          {app.status === 'running' && (
            <a
              href={gatewayUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1 rounded hover:bg-white/5 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={13} className="text-dds-text-muted hover:text-dds-primary transition-colors" />
            </a>
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 text-xs ${provider.color}`}>
              <ProviderIcon size={12} />
              {provider.label}
            </span>
            <span className="text-xs text-dds-text-muted">
              {app.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
            </span>
          </div>
          <ArrowUpRight size={14} className="text-dds-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-dds-primary/10 border border-dds-primary/20 flex items-center justify-center mb-6">
        <Rocket size={36} className="text-dds-primary" />
      </div>
      <h3 className="text-lg font-semibold text-dds-white mb-2">No Applications Yet</h3>
      <p className="text-sm text-dds-text-muted text-center max-w-md mb-6">
        Applications are created automatically when you deploy from a repository.
        Each application gets a clean, stable gateway URL.
      </p>
      <button
        onClick={() => navigate('/repositories')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-dds-primary text-white text-sm font-medium
          hover:bg-dds-primary/90 transition-colors shadow-lg shadow-dds-primary/20"
      >
        <Plus size={16} />
        Deploy from Repository
      </button>
    </motion.div>
  );
}

export default function ApplicationsPage() {
  const { data: applications, isLoading, error } = useApplications();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = (applications || []).filter(app => {
    const matchesSearch = !search || app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = (applications || []).reduce<Record<string, number>>((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `All (${applications?.length || 0})` },
    { key: 'running', label: `Running (${statusCounts.running || 0})` },
    { key: 'stopped', label: `Stopped (${statusCounts.stopped || 0})` },
    { key: 'unhealthy', label: `Unhealthy (${statusCounts.unhealthy || 0})` },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-dds-primary/15 border border-dds-primary/25 flex items-center justify-center">
                <Zap size={20} className="text-dds-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-dds-white">Applications</h1>
                <p className="text-xs text-dds-text-muted">Gateway-proxied applications with stable URLs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted" />
            <input
              type="text"
              placeholder="Search applications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-dds-surface border border-dds-border rounded-lg text-sm text-dds-white
                placeholder:text-dds-text-muted focus:outline-none focus:border-dds-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-dds-surface border border-dds-border rounded-lg">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === tab.key
                    ? 'bg-dds-primary/15 text-dds-primary'
                    : 'text-dds-text-muted hover:text-dds-text-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="text-dds-primary animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <AlertTriangle size={24} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-400">Failed to load applications</p>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && !search && statusFilter === 'all' && <EmptyState />}

        {!isLoading && !error && filtered.length === 0 && (search || statusFilter !== 'all') && (
          <div className="text-center py-12">
            <Filter size={24} className="text-dds-text-muted mx-auto mb-3" />
            <p className="text-sm text-dds-text-muted">No applications match your filters</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((app, i) => (
              <ApplicationCard key={app._id} app={app} index={i} />
            ))}
          </div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
