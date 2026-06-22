import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Zap,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  Shield,
  Loader2,
  Pause,
  Activity,
  Timer,
} from 'lucide-react';
import { useFailureAnalysis } from '../hooks/useContainers';
import RefreshButton from './RefreshButton';

interface FailureAnalysisProps {
  containerId: string | null;
  containerName: string;
  containerState: string;
}

const FailureAnalysis: React.FC<FailureAnalysisProps> = ({
  containerId,
  containerName,
}) => {
  const { data, isLoading, error, refetch } = useFailureAnalysis(containerId);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HEALTHY':
        return <CheckCircle size={48} className="text-dds-green" />;
      case 'PENDING':
        return <Loader2 size={48} className="text-dds-blue animate-spin" />;
      case 'PAUSED':
        return <Pause size={48} className="text-dds-text-muted" />;
      case 'GRACEFUL_STOP':
        return <CheckCircle size={48} className="text-dds-green" />;
      case 'CRASH_LOOP':
        return <AlertTriangle size={48} className="text-dds-red" />;
      case 'RESOURCE_EXHAUSTION':
        return <Zap size={48} className="text-dds-red" />;
      case 'PORT_CONFLICT':
        return <AlertTriangle size={48} className="text-dds-orange" />;
      case 'PERMISSION_ERROR':
        return <Shield size={48} className="text-dds-orange" />; // or dds-yellow if exists
      case 'CONFIG_ERROR':
        return <AlertTriangle size={48} className="text-dds-primary" />;
      default:
        return <HelpCircle size={48} className="text-dds-text-muted" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HEALTHY':
      case 'GRACEFUL_STOP':
        return 'green';
      case 'PENDING':
        return 'blue';
      case 'PAUSED':
        return 'slate';
      case 'CRASH_LOOP':
      case 'RESOURCE_EXHAUSTION':
        return 'red';
      case 'PORT_CONFLICT':
      case 'PERMISSION_ERROR':
        return 'orange';
      case 'CONFIG_ERROR':
        return 'purple';
      default:
        return 'slate';
    }
  };

  const getConfidenceWidth = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return 'bg-dds-red';
    if (score >= 0.6) return 'bg-dds-orange';
    return 'bg-dds-blue';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.85) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const getInstabilityColor = (score: number) => {
    if (score >= 0.7) return 'bg-dds-red';
    if (score >= 0.4) return 'bg-dds-orange';
    return 'bg-dds-green';
  };

  const getInstabilityLabel = (score: number) => {
    if (score >= 0.7) return { text: 'Unstable', color: 'text-dds-red', bg: 'bg-dds-red/10', border: 'border-dds-red/20' };
    if (score >= 0.4) return { text: 'At Risk', color: 'text-dds-orange', bg: 'bg-dds-orange/10', border: 'border-dds-orange/20' };
    return { text: 'Stable', color: 'text-dds-green', bg: 'bg-dds-green/10', border: 'border-dds-green/20' };
  };

  const formatMTBF = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 bg-dds-surface/50 rounded-xl border border-dds-border">
        <Shield size={48} className="text-dds-text-muted mb-4" />
        <h3 className="text-[15px] font-medium text-dds-text-primary">Failure Intelligence</h3>
        <p className="text-[13px] text-dds-text-secondary mt-1">Select a container to analyze potential issues</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-dds-blue" />
          <h2 className="text-[15px] font-semibold text-dds-text-primary uppercase tracking-wider">Analyzing...</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 bg-dds-surface/50 rounded-xl border border-dds-border">
          <div className="w-10 h-10 border-2 border-dds-blue border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-dds-text-primary font-medium text-[14px]">Running failure analysis...</p>
          <span className="text-[12px] text-dds-text-secondary mt-1">Checking signals, patterns, and history</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-dds-red" />
          <h2 className="text-[15px] font-semibold text-dds-text-primary uppercase tracking-wider">Analysis Error</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 bg-dds-red/10 border border-dds-red/30 rounded-xl shadow-sm">
          <AlertTriangle size={32} className="text-dds-red mb-4" />
          <p className="text-dds-text-primary font-medium text-[14px]">Failed to analyze container</p>
          <span className="text-[12px] text-dds-text-secondary mt-1">{error.message}</span>
          <div className="mt-5">
            <RefreshButton
              onRefresh={() => { refetch(); }}
              label="Retry Analysis"
              size="lg"
              variant="default"
              showLabel={true}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isHealthyOrInfo = ['HEALTHY', 'GRACEFUL_STOP', 'PENDING', 'PAUSED'].includes(data.type);
  const color = getTypeColor(data.type);

  // Healthy/Info States
  if (isHealthyOrInfo) {
    const colorStyles = {
      green: { bg: 'bg-dds-green/10', border: 'border-dds-green/30', text: 'text-dds-green', iconBg: 'bg-dds-green/20' },
      blue: { bg: 'bg-dds-blue/10', border: 'border-dds-blue/30', text: 'text-dds-blue', iconBg: 'bg-dds-blue/20' },
      slate: { bg: 'bg-dds-surface/50', border: 'border-dds-border', text: 'text-dds-text-secondary', iconBg: 'bg-dds-surface' },
    };

    const styles = colorStyles[color as keyof typeof colorStyles] || colorStyles.slate;

    const title = ({
      HEALTHY: 'Container is Healthy',
      GRACEFUL_STOP: 'Container Stopped Gracefully',
      PENDING: 'Container is Starting',
      PAUSED: 'Container is Paused',
    } as Record<string, string>)[data.type] || 'No Issues Detected';

    const description = ({
      HEALTHY: `${containerName} is running without any detected issues`,
      GRACEFUL_STOP: `${containerName} was stopped cleanly with no errors`,
      PENDING: `${containerName} is currently starting up or restarting`,
      PAUSED: `${containerName} has been paused and can be resumed`,
    } as Record<string, string>)[data.type] || data.summary;

    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className={styles.text} />
          <h2 className="text-[15px] font-semibold text-dds-text-primary uppercase tracking-wider">Health Status</h2>
        </div>
        <div className={`flex flex-col items-center justify-center py-12 border rounded-xl shadow-sm ${styles.bg} ${styles.border}`}>
          <motion.div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${styles.iconBg}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {getTypeIcon(data.type)}
          </motion.div>
          <h3 className={`text-[18px] font-semibold mb-2 ${styles.text}`}>{title}</h3>
          <p className="text-[14px] text-dds-text-primary text-center font-medium max-w-md px-4">
            {description}
          </p>
          <div className="flex items-center gap-2 mt-6 px-5 py-2.5 bg-dds-bg border border-dds-border/50 rounded-lg text-[13px] text-dds-text-secondary shadow-sm">
            <Lightbulb size={16} className="text-dds-orange" />
            <span>Tip: Check the logs tab to monitor application activity in real-time</span>
          </div>
        </div>
      </div>
    );
  }

  // Failure States
  const colorStyles = {
    red: { border: 'border-dds-red/40', bg: 'bg-dds-red/10', text: 'text-dds-red' },
    orange: { border: 'border-dds-orange/40', bg: 'bg-dds-orange/10', text: 'text-dds-orange' },
    purple: { border: 'border-dds-primary/40', bg: 'bg-dds-primary/10', text: 'text-dds-primary' },
    slate: { border: 'border-dds-border', bg: 'bg-dds-surface/50', text: 'text-dds-text-secondary' },
    green: { border: 'border-dds-green/40', bg: 'bg-dds-green/10', text: 'text-dds-green' },
    blue: { border: 'border-dds-blue/40', bg: 'bg-dds-blue/10', text: 'text-dds-blue' },
  };

  const styles = colorStyles[color as keyof typeof colorStyles] || colorStyles.slate;
  const instabilityStatus = getInstabilityLabel(data.instabilityScore || 0);

  return (
    <div className="p-6 space-y-6 bg-dds-surface border border-dds-border rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-dds-red" />
          <h2 className="text-[15px] font-semibold text-dds-text-primary uppercase tracking-wider">Failure Intelligence</h2>
        </div>
        <RefreshButton
          onRefresh={() => { refetch(); }}
          size="sm"
          variant="ghost"
          showLabel={false}
        />
      </div>

      {/* Main Alert Banner */}
      <motion.div
        className={`p-5 rounded-xl border-l-4 flex items-start gap-4 shadow-sm ${styles.border} ${styles.bg}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-2.5 rounded-lg bg-dds-bg border border-dds-border/50 shadow-sm shrink-0">
          {getTypeIcon(data.type)}
        </div>
        <div>
          <h3 className={`font-semibold text-[16px] ${styles.text}`}>{data.type.replace(/_/g, ' ')}</h3>
          <p className="text-[13px] text-dds-text-primary font-medium mt-1 leading-relaxed">{data.summary}</p>
        </div>
      </motion.div>

      {/* Instability Section */}
      <div className="bg-dds-bg rounded-xl p-5 border border-dds-border shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] text-dds-text-primary font-medium">
            <Activity size={16} className={instabilityStatus.color} />
            <span>Stability Assessment</span>
          </div>
          <div className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-semibold border ${instabilityStatus.bg} ${instabilityStatus.text} ${instabilityStatus.border}`}>
            {instabilityStatus.text}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[12px] text-dds-text-secondary">
            <span>Instability Score</span>
            <span className="font-mono">{Math.round((data.instabilityScore || 0) * 100)}%</span>
          </div>
          <div className="h-2 bg-dds-surface border border-dds-border rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getInstabilityColor(data.instabilityScore || 0)}`}
              initial={{ width: 0 }}
              animate={{ width: `${(data.instabilityScore || 0) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>

        {data.restartCount > 0 && data.mtbfSeconds !== null && (
          <div className="pt-3 border-t border-dds-border/80 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5 text-dds-text-secondary">
              <Timer size={14} />
              <span>Mean Time Between Failures</span>
            </div>
            <div className="font-mono font-medium text-dds-text-primary">
              {formatMTBF(data.mtbfSeconds)}
            </div>
          </div>
        )}

        {data.restartCount === 0 && (
          <div className="pt-3 border-t border-dds-border/80 text-[12px] text-dds-green flex items-center gap-1.5 font-medium">
            <CheckCircle size={14} />
            <span>Zero failures recorded</span>
          </div>
        )}
      </div>

      {/* Confidence Indicator */}
      <div className="bg-dds-bg rounded-xl p-5 border border-dds-border shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-[13px] text-dds-text-primary font-medium">
          <TrendingUp size={16} className="text-dds-text-muted" />
          <span>Confidence Level: {getConfidenceLabel(data.confidenceScore)}</span>
        </div>
        <div className="h-2 bg-dds-surface border border-dds-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getConfidenceColor(data.confidenceScore)}`}
            style={{ width: getConfidenceWidth(data.confidenceScore) }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium tracking-wide uppercase">
          <span className={data.confidenceScore < 0.6 ? 'text-dds-blue' : 'text-dds-text-muted'}>Low</span>
          <span className={data.confidenceScore >= 0.6 && data.confidenceScore < 0.85 ? 'text-dds-orange' : 'text-dds-text-muted'}>Medium</span>
          <span className={data.confidenceScore >= 0.85 ? 'text-dds-red' : 'text-dds-text-muted'}>High</span>
        </div>
      </div>

      {/* Explanation */}
      {data.explanation?.explanation && (
        <div className="bg-dds-bg rounded-xl p-5 border border-dds-border shadow-sm">
          <div className="flex items-center gap-2 text-dds-orange mb-3">
            <Zap size={16} />
            <span className="font-medium text-[13px]">What Happened</span>
          </div>
          <p className="text-dds-text-secondary text-[13px] leading-relaxed">{data.explanation.explanation}</p>
        </div>
      )}

      {/* Likely Causes */}
      {data.explanation?.likelyCauses && data.explanation.likelyCauses.length > 0 && (
        <div className="bg-dds-bg rounded-xl p-5 border border-dds-border shadow-sm">
          <h4 className="flex items-center gap-2 text-dds-orange font-medium text-[13px] mb-3">
            <AlertTriangle size={16} />
            Possible Causes
          </h4>
          <ul className="space-y-2.5">
            {data.explanation.likelyCauses.map((cause: string, index: number) => (
              <motion.li
                key={index}
                className="flex items-start gap-2 text-dds-text-secondary text-[13px] leading-relaxed"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ChevronRight size={14} className="text-dds-text-muted mt-1 shrink-0" />
                <span>{cause}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Actions */}
      {data.explanation?.suggestedChecks && data.explanation.suggestedChecks.length > 0 && (
        <div className="bg-dds-bg rounded-xl p-5 border border-dds-border shadow-sm">
          <h4 className="flex items-center gap-2 text-dds-green font-medium text-[13px] mb-3">
            <Lightbulb size={16} />
            What to Do Next
          </h4>
          <ul className="space-y-3">
            {data.explanation.suggestedChecks.map((action: string, index: number) => (
              <motion.li
                key={index}
                className="flex items-start gap-3 text-dds-text-primary text-[13px] leading-relaxed"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <span className="w-5 h-5 rounded bg-dds-green/10 border border-dds-green/30 text-dds-green flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{action}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence */}
      {data.evidence && data.evidence.length > 0 && (
        <div className="bg-dds-bg rounded-xl p-5 border border-dds-border shadow-sm">
          <h4 className="flex items-center gap-2 text-dds-primary font-medium text-[13px] mb-3">
            <Zap size={16} />
            Detected Evidence
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.evidence.map((item: string, index: number) => (
              <span key={index} className="px-2.5 py-1 bg-dds-surface border border-dds-border rounded text-[11px] text-dds-text-primary font-mono shadow-sm">
                {item}
              </span>
            ))}
          </div>
          <p className="text-[12px] text-dds-text-muted">
            These are the technical indicators our system detected that led to this diagnosis.
          </p>
        </div>
      )}

      {/* Beginner Help */}
      <div className="flex items-start gap-4 p-5 bg-dds-blue/5 border border-dds-blue/20 rounded-xl shadow-sm">
        <div className="text-2xl mt-0.5">🎓</div>
        <div>
          <p className="font-medium text-[14px] text-dds-text-primary">Need more help?</p>
          <p className="text-[13px] text-dds-text-secondary mt-1.5 leading-relaxed">
            This analysis is based on patterns we detected. For more details, check the Logs tab
            and look for red error messages. The explanations there will help you understand
            what each error means.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FailureAnalysis;
