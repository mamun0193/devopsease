import React from 'react';
import { AlertTriangle, Timer, ShieldAlert, HardDrive, Ban, Bug, HelpCircle } from 'lucide-react';

interface FailureAnalysis {
    type: string;
    confidence: number;
    explanation: string;
    evidence: string[];
    failingStage: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; accent: string }> = {
    BUILD_SYNTAX_ERROR: { label: 'Syntax Error', icon: <Bug size={16} />, accent: 'text-red-400' },
    BUILD_RESOURCE_EXHAUSTION: { label: 'Resource Exhaustion', icon: <AlertTriangle size={16} />, accent: 'text-orange-400' },
    BUILD_BASE_IMAGE_MISSING: { label: 'Base Image Missing', icon: <Ban size={16} />, accent: 'text-red-400' },
    BUILD_PERMISSION_DENIED: { label: 'Permission Denied', icon: <ShieldAlert size={16} />, accent: 'text-yellow-400' },
    BUILD_DISK_SPACE: { label: 'Disk Space', icon: <HardDrive size={16} />, accent: 'text-orange-400' },
    BUILD_TIMEOUT: { label: 'Build Timeout', icon: <Timer size={16} />, accent: 'text-orange-400' },
    BUILD_UNKNOWN: { label: 'Unknown Failure', icon: <HelpCircle size={16} />, accent: 'text-slate-400' },
};

const BuildFailurePanel: React.FC<{ analysis: FailureAnalysis }> = ({ analysis }) => {
    if (!analysis?.type) return null;

    const config = TYPE_CONFIG[analysis.type] || TYPE_CONFIG.BUILD_UNKNOWN;
    const isTimeout = analysis.type === 'BUILD_TIMEOUT';
    const borderColor = isTimeout ? 'border-orange-500/40' : 'border-red-500/40';
    const confidencePct = Math.round((analysis.confidence ?? 0) * 100);

    return (
        <div className={`bg-slate-900/80 border ${borderColor} rounded-xl p-5 space-y-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className={config.accent}>{config.icon}</span>
                    <h3 className="text-sm font-semibold text-slate-100">Failure Intelligence</h3>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${isTimeout
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {config.label}
                </span>
            </div>

            {/* Explanation + Confidence */}
            <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.explanation}</p>
                <div className="shrink-0 text-right">
                    <span className="text-xs text-slate-500 block">Confidence</span>
                    <span className={`text-lg font-bold ${confidencePct >= 90 ? 'text-emerald-400' :
                            confidencePct >= 60 ? 'text-yellow-400' :
                                'text-slate-400'
                        }`}>{confidencePct}%</span>
                </div>
            </div>

            {/* Failing Stage */}
            {analysis.failingStage && (
                <div>
                    <span className="text-xs text-slate-500 block mb-1">Failing Stage</span>
                    <code className="text-xs font-mono text-amber-300/80 bg-slate-800/60 px-2.5 py-1 rounded-md inline-block">
                        {analysis.failingStage}
                    </code>
                </div>
            )}

            {/* Evidence */}
            {analysis.evidence?.length > 0 && (
                <div>
                    <span className="text-xs text-slate-500 block mb-1.5">Evidence</span>
                    <div className="bg-slate-950/60 rounded-lg border border-slate-800/50 p-2 space-y-0.5 max-h-32 overflow-y-auto">
                        {analysis.evidence.map((line, i) => (
                            <div key={i} className="text-xs font-mono text-red-300/80 px-2 py-0.5 break-all whitespace-pre-wrap">
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildFailurePanel;
