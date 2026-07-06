import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { Activity, Zap, ShieldAlert, Cpu, Database, Settings2, Network, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ScalingPolicy {
    _id: string;
    applicationId: { _id: string, name: string, slug: string };
    enabled: boolean;
    strategyType: string;
    minReplicas: number;
    maxReplicas: number;
    cpuTargetPercent: number;
    memoryTargetPercent: number;
    lastScaledAt: string;
    explainabilityLog: any[];
}

interface TrafficPolicy {
    _id: string;
    applicationId: { _id: string, name: string, slug: string };
    mode: string;
    targets: any[];
    autonomousConfig: any;
    explainabilityLog: any[];
}

const AutopilotPage: React.FC = () => {
    const [scalingPolicies, setScalingPolicies] = useState<ScalingPolicy[]>([]);
    const [trafficPolicies, setTrafficPolicies] = useState<TrafficPolicy[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const fetchData = useCallback(async () => {
        try {
            const res = await api.get('/api/autopilot/policies');
            setScalingPolicies(res.data.data.scalingPolicies);
            setTrafficPolicies(res.data.data.trafficPolicies);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to load autopilot policies', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
            <div className="p-6 max-w-[1400px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-dds-white flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                                <Zap size={18} className="text-indigo-400" />
                            </div>
                            Intelligent Autopilot
                        </h1>
                        <p className="text-sm text-dds-text-muted mt-1">
                            Autonomous traffic, scaling, and self-healing decisions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-dds-text-muted">Updated {lastRefresh.toLocaleTimeString()}</span>
                        <button
                            onClick={fetchData}
                            className="p-2 rounded-lg bg-dds-surface border border-dds-border hover:bg-dds-surface/80 text-dds-text-secondary transition-colors"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {loading && scalingPolicies.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Active Policies Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-dds-white font-medium">
                                        <Cpu size={16} className="text-indigo-400" /> Autoscaling
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                                        {scalingPolicies.filter(p => p.enabled).length} Active
                                    </span>
                                </div>
                                <p className="text-sm text-dds-text-muted">Applications currently managed by target-tracking or step-scaling strategies.</p>
                            </div>
                            <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-dds-white font-medium">
                                        <Network size={16} className="text-cyan-400" /> Progressive Delivery
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold">
                                        {trafficPolicies.length} Active
                                    </span>
                                </div>
                                <p className="text-sm text-dds-text-muted">Applications currently undergoing autonomous traffic shifting (e.g. Canary).</p>
                            </div>
                            <div className="bg-dds-surface border border-dds-border rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-dds-white font-medium">
                                        <ShieldAlert size={16} className="text-emerald-400" /> Self-Healing
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                                        Enabled globally
                                    </span>
                                </div>
                                <p className="text-sm text-dds-text-muted">The Healing Engine continuously monitors and remediates degraded services.</p>
                            </div>
                        </div>

                        {/* Recent Autonomous Decisions */}
                        <div className="bg-dds-surface border border-dds-border rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-dds-white mb-6">Recent Autonomous Decisions</h2>
                            
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-dds-border before:to-transparent">
                                {getAllLogs(scalingPolicies, trafficPolicies).map((log, i) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Timeline Dot */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-dds-bg bg-dds-surface shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 text-indigo-400">
                                            {getIconForDecision(log.decision)}
                                        </div>
                                        
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-dds-bg border border-dds-border/50 p-4 rounded-xl shadow-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-dds-text-secondary uppercase tracking-wider">{log.appName}</span>
                                                <span className="text-[10px] text-dds-text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            
                                            <div className="text-sm font-medium text-dds-white mb-1">
                                                {formatDecision(log.decision)}
                                            </div>
                                            
                                            <div className="text-xs text-dds-text-muted mb-3 leading-relaxed">
                                                {log.reason}
                                            </div>

                                            {/* AI Flow Visualization */}
                                            <div className="flex items-center gap-2 bg-dds-surface border border-dds-border/50 rounded-lg p-2 overflow-x-auto scrollbar-hide text-[10px] font-mono">
                                                <div className="text-dds-text-muted shrink-0 text-center">
                                                    <Activity size={12} className="mx-auto mb-0.5 text-blue-400" />
                                                    Metrics
                                                </div>
                                                <ArrowRight size={10} className="text-dds-border shrink-0" />
                                                <div className="text-dds-text-muted shrink-0 text-center">
                                                    <Zap size={12} className="mx-auto mb-0.5 text-indigo-400" />
                                                    Decision
                                                </div>
                                                <ArrowRight size={10} className="text-dds-border shrink-0" />
                                                <div className="text-dds-text-muted shrink-0 text-center">
                                                    <Settings2 size={12} className="mx-auto mb-0.5 text-emerald-400" />
                                                    Execution
                                                </div>
                                            </div>
                                            
                                            {log.confidence && (
                                                <div className="mt-3 flex items-center justify-between text-[10px]">
                                                    <span className="text-dds-text-muted uppercase">Confidence</span>
                                                    <span className="text-emerald-400 font-mono font-bold">{Math.round(log.confidence * 100)}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {getAllLogs(scalingPolicies, trafficPolicies).length === 0 && (
                                    <div className="text-center py-10 text-dds-text-muted">
                                        No autonomous decisions recorded yet.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllLogs(scalingPolicies: ScalingPolicy[], trafficPolicies: TrafficPolicy[]) {
    let logs: any[] = [];
    scalingPolicies.forEach(p => {
        if (p.explainabilityLog) {
            p.explainabilityLog.forEach(l => {
                logs.push({ ...l, appName: p.applicationId?.name || 'Unknown', type: 'SCALING', timestamp: l.timestamp || new Date() });
            });
        }
    });
    trafficPolicies.forEach(p => {
        if (p.explainabilityLog) {
            p.explainabilityLog.forEach(l => {
                logs.push({ ...l, appName: p.applicationId?.name || 'Unknown', type: 'TRAFFIC', timestamp: l.timestamp || new Date() });
            });
        }
    });

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
}

function getIconForDecision(decision: string) {
    if (decision === 'SCALE_UP') return <Activity size={16} />;
    if (decision === 'SCALE_DOWN') return <Database size={16} />;
    if (decision === 'SHIFT_TRAFFIC') return <Network size={16} />;
    if (decision === 'ROLLBACK') return <AlertTriangle size={16} className="text-red-400" />;
    return <CheckCircle2 size={16} />;
}

function formatDecision(decision: string) {
    switch(decision) {
        case 'SCALE_UP': return 'Scaled Up Replicas';
        case 'SCALE_DOWN': return 'Scaled Down Replicas';
        case 'SHIFT_TRAFFIC': return 'Shifted Canary Traffic';
        case 'ROLLBACK': return 'Rolled Back Canary';
        default: return decision.replace(/_/g, ' ');
    }
}

export default AutopilotPage;
