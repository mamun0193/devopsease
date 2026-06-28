import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Plus, Trash2, RotateCcw, Search, Upload, Download, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw, Sparkles,
  FileCode, Lock, Unlock, ChevronDown, History, BarChart3, Settings2, Info
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { applicationApi, configApi, type Application, type ConfigEntry, type ReadinessReport, type ScanResult } from '../api';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'config', label: 'Configuration', icon: Settings2 },
  { id: 'detection', label: 'Detection', icon: Search },
  { id: 'readiness', label: 'Readiness', icon: ShieldCheck },
  { id: 'history', label: 'History', icon: History },
  { id: 'import-export', label: 'Import / Export', icon: Upload },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Score Gauge ───────────────────────────────────────────────────────────────

const ScoreGauge: React.FC<{ label: string; score: number; color?: string }> = ({ label, score, color }) => {
  const c = color || (score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444');
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <motion.circle
            cx="40" cy="40" r="36" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-dds-white">{score}</span>
      </div>
      <span className="text-xs text-dds-text-muted font-medium">{label}</span>
    </div>
  );
};

// ── Type Badge ────────────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ type: string }> = ({ type }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
    type === 'secret'
      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
      : 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
  }`}>
    {type === 'secret' ? <Lock size={10} /> : <Unlock size={10} />}
    {type}
  </span>
);

const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const colors: Record<string, string> = {
    manual: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    detected: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    imported: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
    scanner: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${colors[source] || 'bg-dds-surface text-dds-text-muted border-dds-border'}`}>
      {source}
    </span>
  );
};

const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
  const pct = Math.round(confidence * 100);
  const c = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${c}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-dds-text-muted">{pct}%</span>
    </div>
  );
};

// ── Add Entry Modal ───────────────────────────────────────────────────────────

const AddEntryModal: React.FC<{
  open: boolean;
  onClose: () => void;
  repositoryId: string;
  environmentId: string;
}> = ({ open, onClose, repositoryId, environmentId }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'variable' | 'secret'>('variable');
  const [desc, setDesc] = useState('');

  const mutation = useMutation({
    mutationFn: () => configApi.createEntry({ repositoryId, name, value, type, environmentId, description: desc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-entries'] });
      onClose();
      setName(''); setValue(''); setType('variable'); setDesc('');
    },
  });

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-dds-card border border-dds-border rounded-xl p-6 w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-dds-white mb-4 flex items-center gap-2">
          <Plus size={18} className="text-dds-primary" /> Add Config Entry
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dds-text-muted font-medium mb-1 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="DATABASE_URL"
              className="w-full bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white placeholder:text-dds-text-muted focus:border-dds-primary outline-none" />
          </div>
          <div>
            <label className="text-xs text-dds-text-muted font-medium mb-1 block">Value</label>
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="postgres://..."
              type={type === 'secret' ? 'password' : 'text'}
              className="w-full bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white placeholder:text-dds-text-muted focus:border-dds-primary outline-none font-mono" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-dds-text-muted font-medium mb-1 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value as 'variable' | 'secret')}
                className="w-full bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white focus:border-dds-primary outline-none">
                <option value="variable">Variable</option>
                <option value="secret">Secret</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-dds-text-muted font-medium mb-1 block">Environment</label>
              <input value={environmentId} disabled className="w-full bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-text-muted outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-dds-text-muted font-medium mb-1 block">Description (optional)</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Primary database connection"
              className="w-full bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white placeholder:text-dds-text-muted focus:border-dds-primary outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dds-text-secondary hover:text-dds-white transition-colors">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={!name || !value || mutation.isPending}
            className="px-4 py-2 bg-dds-primary text-white text-sm font-medium rounded-lg hover:bg-dds-primary/80 transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
        {mutation.isError && <p className="text-xs text-rose-400 mt-2">{(mutation.error as Error).message}</p>}
      </motion.div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const EnvironmentManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('config');
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [selectedEnv, setSelectedEnv] = useState('development'); // Will be updated to object ID if possible, but for now we pass the string or use the same dropdown logic
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState('auto');

  // Fetch applications
  const { data: apps = [] } = useQuery<Application[]>({
    queryKey: ['applications'],
    queryFn: applicationApi.list,
  });

  // Extract unique repositories
  const uniqueRepos = Array.from(new Map(apps.map(app => [app.repositoryId, app])).values()).filter(app => app.repositoryId);

  // Auto-select first repo
  React.useEffect(() => {
    if (uniqueRepos.length > 0 && !selectedRepoId) setSelectedRepoId(uniqueRepos[0].repositoryId);
  }, [uniqueRepos, selectedRepoId]);

  // Fetch config entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['config-entries', selectedRepoId, selectedEnv],
    queryFn: () => configApi.getEntries(selectedRepoId, selectedEnv),
    enabled: !!selectedRepoId,
  });

  // Fetch readiness
  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ['config-readiness', selectedRepoId, selectedEnv],
    queryFn: () => configApi.getReadiness(selectedRepoId, selectedEnv),
    enabled: !!selectedRepoId && (activeTab === 'readiness' || activeTab === 'detection'),
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: () => configApi.scanRepository(selectedRepoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config-readiness'] }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => configApi.deleteEntry(entryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config-entries'] }),
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: () => configApi.importConfig(selectedRepoId, selectedEnv, importText, importFormat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config-entries'] });
      setImportText('');
    },
  });

  // Export handler
  const handleExport = useCallback(async (format: string) => {
    try {
      const content = await configApi.exportConfig(selectedRepoId, selectedEnv, format);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-${selectedEnv}.${format === 'k8s-secret' || format === 'k8s-configmap' ? 'yaml' : 'env'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [selectedRepoId, selectedEnv]);

  const filteredEntries = entries.filter(e =>
    e.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const envOptions = ['development', 'staging', 'production'];

  return (
    <>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-dds-primary/10">
              <KeyRound size={22} className="text-dds-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dds-white">Environment & Secrets</h1>
              <p className="text-sm text-dds-text-muted">Manage configuration across environments and providers</p>
            </div>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={selectedRepoId} onChange={e => setSelectedRepoId(e.target.value)}
            className="bg-dds-card border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white focus:border-dds-primary outline-none min-w-[200px]">
            {uniqueRepos.map(app => <option key={app.repositoryId} value={app.repositoryId}>{app.repository?.repoName || app.name} (Repository)</option>)}
            {uniqueRepos.length === 0 && <option value="">No repositories</option>}
          </select>
          <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)}
            className="bg-dds-card border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white focus:border-dds-primary outline-none">
            {envOptions.map(env => <option key={env} value={env}>{env.charAt(0).toUpperCase() + env.slice(1)}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-dds-card border border-dds-border rounded-xl p-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-dds-primary/15 text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white hover:bg-dds-surface'
                }`}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {/* ── Configuration Tab ──────────────────────────────── */}
            {activeTab === 'config' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted" />
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter variables..."
                      className="w-full bg-dds-card border border-dds-border rounded-lg pl-9 pr-3 py-2 text-sm text-dds-white placeholder:text-dds-text-muted focus:border-dds-primary outline-none" />
                  </div>
                  <button onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-dds-primary text-white text-sm font-medium rounded-lg hover:bg-dds-primary/80 transition-colors">
                    <Plus size={15} /> Add
                  </button>
                </div>

                {entriesLoading ? (
                  <div className="text-center py-12 text-dds-text-muted">Loading configuration...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center py-16 border border-dds-border rounded-xl bg-dds-card">
                    <KeyRound size={40} className="mx-auto text-dds-text-muted mb-3 opacity-40" />
                    <p className="text-dds-text-secondary font-medium">No config entries yet</p>
                    <p className="text-xs text-dds-text-muted mt-1">Click "Add" to create your first entry, or import from a file.</p>
                  </div>
                ) : (
                  <div className="bg-dds-card border border-dds-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dds-border text-dds-text-muted text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Type</th>
                          <th className="text-left px-4 py-3 font-semibold">Value</th>
                          <th className="text-left px-4 py-3 font-semibold">Source</th>
                          <th className="text-left px-4 py-3 font-semibold">Version</th>
                          <th className="text-left px-4 py-3 font-semibold">Updated</th>
                          <th className="text-right px-4 py-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-dds-border/50 hover:bg-dds-surface/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-dds-white font-medium">{entry.name}</span>
                              {entry.detection?.requiredBy && entry.detection.requiredBy.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {entry.detection.requiredBy.map(s => (
                                    <span key={s} className="text-[10px] bg-dds-surface px-1.5 py-0.5 rounded text-dds-text-muted">{s}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3"><TypeBadge type={entry.type} /></td>
                            <td className="px-4 py-3 font-mono text-dds-text-secondary text-xs max-w-[200px] truncate">{entry.value}</td>
                            <td className="px-4 py-3"><SourceBadge source={entry.source} /></td>
                            <td className="px-4 py-3 text-dds-text-muted">v{entry.version}</td>
                            <td className="px-4 py-3 text-dds-text-muted text-xs">
                              {entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => deleteMutation.mutate(entry.id)} title="Delete"
                                className="p-1.5 text-dds-text-muted hover:text-rose-400 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Detection Tab ──────────────────────────────────── */}
            {activeTab === 'detection' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-dds-text-secondary">
                    Detected environment variables from source code analysis
                  </p>
                  <button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-dds-primary/10 text-dds-primary text-sm font-medium rounded-lg hover:bg-dds-primary/20 transition-colors border border-dds-primary/20 disabled:opacity-50">
                    <RefreshCw size={14} className={scanMutation.isPending ? 'animate-spin' : ''} />
                    {scanMutation.isPending ? 'Scanning...' : 'Scan Repository'}
                  </button>
                </div>

                {readinessLoading ? (
                  <div className="text-center py-12 text-dds-text-muted">Scanning...</div>
                ) : readiness && readiness.detected.length > 0 ? (
                  <div className="bg-dds-card border border-dds-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-dds-border text-dds-text-muted text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 font-semibold">Variable</th>
                          <th className="text-left px-4 py-3 font-semibold">Classification</th>
                          <th className="text-left px-4 py-3 font-semibold">Confidence</th>
                          <th className="text-left px-4 py-3 font-semibold">Source File</th>
                          <th className="text-left px-4 py-3 font-semibold">Default</th>
                          <th className="text-left px-4 py-3 font-semibold">Required By</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readiness.detected.map((d) => {
                          const isConfigured = readiness.configured.some(c => c.name === d.name);
                          return (
                            <tr key={d.name} className="border-b border-dds-border/50 hover:bg-dds-surface/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-dds-white font-medium">{d.name}</td>
                              <td className="px-4 py-3"><TypeBadge type={d.isSecret ? 'secret' : 'variable'} /></td>
                              <td className="px-4 py-3"><ConfidenceBar confidence={d.confidence} /></td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-dds-text-muted font-mono">{d.sourceFile}:{d.lineNumber}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-dds-text-muted font-mono">
                                {d.defaultValue || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 flex-wrap">
                                  {d.requiredBy.map(s => (
                                    <span key={s} className="text-[10px] bg-dds-surface px-1.5 py-0.5 rounded text-dds-text-muted">{s}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {isConfigured ? (
                                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                    <CheckCircle2 size={12} /> Configured
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-rose-400 text-xs font-medium">
                                    <XCircle size={12} /> Missing
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 border border-dds-border rounded-xl bg-dds-card">
                    <Search size={40} className="mx-auto text-dds-text-muted mb-3 opacity-40" />
                    <p className="text-dds-text-secondary font-medium">No scan results yet</p>
                    <p className="text-xs text-dds-text-muted mt-1">Click "Scan Repository" to detect environment variables.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Readiness Tab ───────────────────────────────────── */}
            {activeTab === 'readiness' && (
              <div className="space-y-6">
                {readinessLoading ? (
                  <div className="text-center py-12 text-dds-text-muted">Calculating readiness...</div>
                ) : readiness ? (
                  <>
                    {/* Scores */}
                    <div className="bg-dds-card border border-dds-border rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-dds-text-muted uppercase tracking-wider mb-6">Readiness Scores</h3>
                      <div className="flex justify-around flex-wrap gap-6">
                        <ScoreGauge label="Security" score={readiness.scores.security} />
                        <ScoreGauge label="Configuration" score={readiness.scores.configuration} />
                        <ScoreGauge label="Deployment" score={readiness.scores.deployment} />
                        <ScoreGauge label="Environment" score={readiness.scores.environment} />
                        <ScoreGauge label="Overall" score={readiness.scores.overall}
                          color={readiness.deploymentReady ? '#22c55e' : '#ef4444'} />
                      </div>
                      <div className="mt-6 text-center">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                          readiness.deploymentReady
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {readiness.deploymentReady ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          {readiness.deploymentReady ? 'Deployment Ready' : 'Not Ready for Deployment'}
                        </span>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {readiness.suggestions.length > 0 && (
                      <div className="bg-dds-card border border-dds-border rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-dds-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400" /> Intelligent Suggestions
                        </h3>
                        <div className="space-y-2">
                          {readiness.suggestions.map((s, i) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                              s.severity === 'error' ? 'bg-rose-500/5 border-rose-500/15' :
                              s.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/15' :
                              'bg-sky-500/5 border-sky-500/15'
                            }`}>
                              {s.severity === 'error' ? <XCircle size={16} className="text-rose-400 mt-0.5 shrink-0" /> :
                               s.severity === 'warning' ? <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" /> :
                               <Info size={16} className="text-sky-400 mt-0.5 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-dds-white">{s.message}</p>
                                <p className="text-xs text-dds-text-muted mt-0.5 font-mono">{s.key}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing & Unused */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {readiness.missing.length > 0 && (
                        <div className="bg-dds-card border border-dds-border rounded-xl p-5">
                          <h4 className="text-sm font-semibold text-rose-400 mb-3 flex items-center gap-2">
                            <XCircle size={14} /> Missing ({readiness.missing.length})
                          </h4>
                          <div className="space-y-1.5">
                            {readiness.missing.map(m => (
                              <div key={m.name} className="flex items-center justify-between text-sm">
                                <span className="font-mono text-dds-white">{m.name}</span>
                                <span className="text-xs text-dds-text-muted">{Math.round(m.confidence * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {readiness.unused.length > 0 && (
                        <div className="bg-dds-card border border-dds-border rounded-xl p-5">
                          <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                            <AlertTriangle size={14} /> Unused ({readiness.unused.length})
                          </h4>
                          <div className="space-y-1.5">
                            {readiness.unused.map(u => (
                              <div key={u.name} className="flex items-center justify-between text-sm">
                                <span className="font-mono text-dds-white">{u.name}</span>
                                <SourceBadge source={u.source} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 border border-dds-border rounded-xl bg-dds-card">
                    <BarChart3 size={40} className="mx-auto text-dds-text-muted mb-3 opacity-40" />
                    <p className="text-dds-text-secondary font-medium">Select a repository to view readiness</p>
                  </div>
                )}
              </div>
            )}

            {/* ── History Tab ────────────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="bg-dds-card border border-dds-border rounded-xl p-6">
                <h3 className="text-sm font-semibold text-dds-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <History size={14} /> Configuration History
                </h3>
                {entries.length > 0 ? (
                  <div className="space-y-3">
                    {entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 20).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-4 p-3 rounded-lg bg-dds-surface/30 border border-dds-border/30">
                        <div className="w-8 h-8 rounded-full bg-dds-primary/10 flex items-center justify-center shrink-0">
                          {entry.type === 'secret' ? <Lock size={14} className="text-dds-primary" /> : <FileCode size={14} className="text-dds-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dds-white font-mono">{entry.name}</p>
                          <p className="text-xs text-dds-text-muted">Version {entry.version} · {entry.source}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-dds-text-muted">{new Date(entry.updatedAt).toLocaleString()}</p>
                          <TypeBadge type={entry.type} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-dds-text-muted py-8">No configuration history yet.</p>
                )}
              </div>
            )}

            {/* ── Import / Export Tab ─────────────────────────────── */}
            {activeTab === 'import-export' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Import */}
                <div className="bg-dds-card border border-dds-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-dds-white mb-4 flex items-center gap-2">
                    <Upload size={16} className="text-dds-primary" /> Import Configuration
                  </h3>
                  <div className="space-y-3">
                    <select value={importFormat} onChange={e => setImportFormat(e.target.value)}
                      className="w-full bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white focus:border-dds-primary outline-none">
                      <option value="auto">Auto-detect format</option>
                      <option value="env">.env file</option>
                      <option value="json">JSON</option>
                      <option value="yaml">YAML</option>
                    </select>
                    <textarea value={importText} onChange={e => setImportText(e.target.value)}
                      placeholder={'Paste your .env, JSON, or YAML content here...\n\nExample:\nDATABASE_URL=postgres://...\nPORT=3000\nNODE_ENV=production'}
                      className="w-full h-48 bg-dds-bg border border-dds-border rounded-lg px-3 py-2 text-sm text-dds-white font-mono placeholder:text-dds-text-muted/50 focus:border-dds-primary outline-none resize-none" />
                    <button onClick={() => importMutation.mutate()} disabled={!importText || importMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-dds-primary text-white text-sm font-medium rounded-lg hover:bg-dds-primary/80 transition-colors disabled:opacity-50">
                      <Upload size={15} />
                      {importMutation.isPending ? 'Importing...' : 'Import'}
                    </button>
                    {importMutation.isSuccess && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Import completed successfully
                      </p>
                    )}
                  </div>
                </div>

                {/* Export */}
                <div className="bg-dds-card border border-dds-border rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-dds-white mb-4 flex items-center gap-2">
                    <Download size={16} className="text-dds-primary" /> Export Configuration
                  </h3>
                  <div className="space-y-2">
                    {[
                      { format: 'env', label: '.env File', desc: 'Standard dotenv format (secrets masked)' },
                      { format: 'compose', label: 'Docker Compose', desc: 'Compose-compatible env_file' },
                      { format: 'k8s-secret', label: 'K8s Secret', desc: 'Kubernetes Secret YAML (base64)' },
                      { format: 'k8s-configmap', label: 'K8s ConfigMap', desc: 'Kubernetes ConfigMap YAML' },
                      { format: 'github-actions', label: 'GitHub Actions', desc: 'Secrets template for Actions' },
                    ].map(exp => (
                      <button key={exp.format} onClick={() => handleExport(exp.format)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-dds-surface/30 border border-dds-border/30 hover:border-dds-primary/30 hover:bg-dds-primary/5 transition-all text-left">
                        <Download size={14} className="text-dds-primary shrink-0" />
                        <div>
                          <p className="text-sm text-dds-white font-medium">{exp.label}</p>
                          <p className="text-xs text-dds-text-muted">{exp.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add Entry Modal */}
      <AddEntryModal open={showAddModal} onClose={() => setShowAddModal(false)}
        repositoryId={selectedRepoId} environmentId={selectedEnv} />
    </>
  );
};

export default EnvironmentManagementPage;
