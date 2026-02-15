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
  containerState
}) => {
  const { data, isLoading, error, refetch } = useFailureAnalysis(containerId);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'HEALTHY':
        return <CheckCircle size={48} className="text-emerald-400" />;
      case 'PENDING':
        return <Loader2 size={48} className="text-blue-400 animate-spin" />;
      case 'PAUSED':
        return <Pause size={48} className="text-slate-400" />;
      case 'GRACEFUL_STOP':
        return <CheckCircle size={48} className="text-emerald-400" />;
      case 'CRASH_LOOP':
        return <AlertTriangle size={48} className="text-red-400" />;
      case 'RESOURCE_EXHAUSTION':
        return <Zap size={48} className="text-red-400" />;
      case 'PORT_CONFLICT':
        return <AlertTriangle size={48} className="text-orange-400" />;
      case 'PERMISSION_ERROR':
        return <Shield size={48} className="text-yellow-400" />;
      case 'CONFIG_ERROR':
        return <AlertTriangle size={48} className="text-purple-400" />;
      default:
        return <HelpCircle size={48} className="text-slate-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'HEALTHY':
      case 'GRACEFUL_STOP':
        return 'emerald';
      case 'PENDING':
        return 'blue';
      case 'PAUSED':
        return 'slate';
      case 'CRASH_LOOP':
      case 'RESOURCE_EXHAUSTION':
        return 'red';
      case 'PORT_CONFLICT':
        return 'orange';
      case 'PERMISSION_ERROR':
        return 'yellow';
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
    if (score >= 0.85) return 'bg-red-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.85) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const getInstabilityColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-500';
    if (score >= 0.4) return 'bg-orange-500';
    return 'bg-emerald-500';
  };

  const getInstabilityLabel = (score: number) => {
    if (score >= 0.7) return { text: 'Unstable', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    if (score >= 0.4) return { text: 'At Risk', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    return { text: 'Stable', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
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
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Shield size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Failure Intelligence</h3>
        <p className="text-slate-500">Select a container to analyze potential issues</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-100">Analyzing...</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-300 font-medium">Running failure analysis...</p>
          <span className="text-sm text-slate-500 mt-1">Checking signals, patterns, and history</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-red-400" />
          <h2 className="text-lg font-semibold text-slate-100">Analysis Error</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle size={32} className="text-red-400 mb-4" />
          <p className="text-slate-300 font-medium">Failed to analyze container</p>
          <span className="text-sm text-slate-500 mt-1">{error.message}</span>
          <div className="mt-4">
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
      emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
      slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', iconBg: 'bg-slate-500/20' },
    };

    const styles = colorStyles[color as keyof typeof colorStyles] || colorStyles.slate;

    const title = {
      HEALTHY: 'Container is Healthy',
      GRACEFUL_STOP: 'Container Stopped Gracefully',
      PENDING: 'Container is Starting',
      PAUSED: 'Container is Paused',
    }[data.type] || 'No Issues Detected';

    const description = {
      HEALTHY: `${containerName} is running without any detected issues`,
      GRACEFUL_STOP: `${containerName} was stopped cleanly with no errors`,
      PENDING: `${containerName} is currently starting up or restarting`,
      PAUSED: `${containerName} has been paused and can be resumed`,
    }[data.type] || data.summary;

    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className={styles.text} />
          <h2 className="text-lg font-semibold text-slate-100">Health Status</h2>
        </div>
        <div className={`flex flex-col items-center justify-center py-12 border rounded-xl ${styles.bg} ${styles.border}`}>
          <motion.div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${styles.iconBg}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {getTypeIcon(data.type)}
          </motion.div>
          <h3 className={`text-xl font-semibold mb-2 ${styles.text}`}>{title}</h3>
          <p className="text-slate-400 text-center">
            <strong className="text-slate-200">{description}</strong>
          </p>
          <div className="flex items-center gap-2 mt-6 px-4 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-400">
            <Lightbulb size={16} className="text-yellow-400" />
            <span>Tip: Check the logs tab to monitor application activity in real-time</span>
          </div>
        </div>
      </div>
    );
  }

  // Failure States
  const colorStyles = {
    red: { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' },
    slate: { border: 'border-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-400' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  };

  const styles = colorStyles[color as keyof typeof colorStyles] || colorStyles.slate;
  const instabilityStatus = getInstabilityLabel(data.instabilityScore || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-red-400" />
          <h2 className="text-lg font-semibold text-slate-100">Failure Intelligence</h2>
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
        className={`p-4 rounded-xl border-l-4 flex items-start gap-4 ${styles.border} ${styles.bg} ${styles.text}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-2 rounded-lg bg-current/10">
          {getTypeIcon(data.type)}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{data.type.replace(/_/g, ' ')}</h3>
          <p className="text-sm opacity-80 mt-1">{data.summary}</p>
        </div>
      </motion.div>

      {/* Instability Section - Day 42 */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
            <Activity size={16} className={instabilityStatus.color} />
            <span>Stability Assessment</span>
          </div>
          <div className={`px-2 py-0.5 rounded text-xs font-semibold border ${instabilityStatus.bg} ${instabilityStatus.text} ${instabilityStatus.border}`}>
            {instabilityStatus.text}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Instability Score</span>
            <span>{Math.round((data.instabilityScore || 0) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getInstabilityColor(data.instabilityScore || 0)}`}
              initial={{ width: 0 }}
              animate={{ width: `${(data.instabilityScore || 0) * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>

        {data.restartCount > 0 && data.mtbfSeconds !== null && (
          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Timer size={14} />
              <span>Mean Time Between Failures</span>
            </div>
            <div className="font-mono text-slate-200">
              {formatMTBF(data.mtbfSeconds)}
            </div>
          </div>
        )}

        {data.restartCount === 0 && (
          <div className="pt-2 border-t border-slate-700/50 text-xs text-emerald-400 flex items-center gap-1.5">
            <CheckCircle size={14} />
            <span>Zero failures recorded</span>
          </div>
        )}
      </div>

      {/* Confidence Indicator */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TrendingUp size={16} />
          <span>Confidence Level: {getConfidenceLabel(data.confidenceScore)}</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getConfidenceColor(data.confidenceScore)}`}
            style={{ width: getConfidenceWidth(data.confidenceScore) }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className={data.confidenceScore < 0.6 ? 'text-blue-400 font-medium' : 'text-slate-600'}>Low</span>
          <span className={data.confidenceScore >= 0.6 && data.confidenceScore < 0.85 ? 'text-yellow-400 font-medium' : 'text-slate-600'}>Medium</span>
          <span className={data.confidenceScore >= 0.85 ? 'text-red-400 font-medium' : 'text-slate-600'}>High</span>
        </div>
      </div>

      {/* Explanation */}
      {data.explanation?.explanation && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-3">
            <Zap size={16} />
            <span className="font-medium">What Happened</span>
          </div>
          <p className="text-slate-200">{data.explanation.explanation}</p>
        </div>
      )}

      {/* Likely Causes */}
      {data.explanation?.likelyCauses && data.explanation.likelyCauses.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="flex items-center gap-2 text-orange-400 font-medium mb-3">
            <AlertTriangle size={16} />
            Possible Causes
          </h4>
          <ul className="space-y-2">
            {data.explanation.likelyCauses.map((cause: string, index: number) => (
              <motion.li
                key={index}
                className="flex items-start gap-2 text-slate-300 text-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ChevronRight size={14} className="text-slate-500 mt-1 shrink-0" />
                <span>{cause}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Actions */}
      {data.explanation?.suggestedChecks && data.explanation.suggestedChecks.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="flex items-center gap-2 text-emerald-400 font-medium mb-3">
            <Lightbulb size={16} />
            What to Do Next
          </h4>
          <ul className="space-y-2">
            {data.explanation.suggestedChecks.map((action: string, index: number) => (
              <motion.li
                key={index}
                className="flex items-start gap-3 text-slate-300 text-sm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium shrink-0">
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
        <div className="bg-slate-800/50 rounded-xl p-4">
          <h4 className="flex items-center gap-2 text-purple-400 font-medium mb-3">
            <Zap size={16} />
            Detected Evidence
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {data.evidence.map((item: string, index: number) => (
              <span key={index} className="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 font-mono">
                {item}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            These are the technical indicators our system detected that led to this diagnosis.
          </p>
        </div>
      )}

      {/* Beginner Help */}
      <div className="flex items-start gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className="text-2xl">🎓</div>
        <div>
          <p className="font-medium text-slate-200">Need more help?</p>
          <p className="text-sm text-slate-400 mt-1">
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
