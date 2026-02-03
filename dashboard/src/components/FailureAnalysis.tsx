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
  Activity,
  Cpu,
  Network,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useContainerAnalysis } from '../hooks/useContainers';

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
  const { data: analysis, isLoading, error, refetch } = useContainerAnalysis(containerId);

  const getCategoryIcon = (category: string | null) => {
    switch (category?.toUpperCase()) {
      case 'RESOURCE':
        return <Cpu size={20} />;
      case 'NETWORK':
        return <Network size={20} />;
      case 'RUNTIME':
        return <Activity size={20} />;
      case 'CONFIGURATION':
        return <Settings size={20} />;
      default:
        return <HelpCircle size={20} />;
    }
  };

  const getCategoryLabel = (category: string | null) => {
    switch (category?.toUpperCase()) {
      case 'RESOURCE':
        return 'Resource Issue';
      case 'NETWORK':
        return 'Network Issue';
      case 'RUNTIME':
        return 'Runtime Error';
      case 'CONFIGURATION':
        return 'Configuration Problem';
      default:
        return 'Unknown Issue';
    }
  };

  const getCategoryDescription = (category: string | null) => {
    switch (category?.toUpperCase()) {
      case 'RESOURCE':
        return 'The container ran out of memory, CPU, or disk space. These are hardware/resource limitations.';
      case 'NETWORK':
        return 'The container couldn\'t connect to another service (database, API, etc.) or had port conflicts.';
      case 'RUNTIME':
        return 'The application code crashed or encountered an unhandled error during execution.';
      case 'CONFIGURATION':
        return 'Something is misconfigured - missing files, wrong settings, or missing dependencies.';
      default:
        return 'We couldn\'t determine the exact cause. Review the logs for more details.';
    }
  };

  const getCategoryClasses = (category: string | null) => {
    switch (category?.toUpperCase()) {
      case 'RESOURCE':
        return 'border-red-500 bg-red-500/10 text-red-400';
      case 'NETWORK':
        return 'border-blue-500 bg-blue-500/10 text-blue-400';
      case 'RUNTIME':
        return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'CONFIGURATION':
        return 'border-purple-500 bg-purple-500/10 text-purple-400';
      default:
        return 'border-slate-500 bg-slate-500/10 text-slate-400';
    }
  };

  const getConfidenceExplanation = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'We\'re very confident this is the issue. The signals are clear.';
      case 'medium':
        return 'This is likely the issue, but there could be other factors.';
      case 'low':
        return 'This is our best guess, but the root cause may be different.';
      default:
        return '';
    }
  };

  const getConfidenceWidth = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return '100%';
      case 'medium': return '60%';
      case 'low': return '30%';
      default: return '0%';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Shield size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Failure Analysis</h3>
        <p className="text-slate-500">Select a container to analyze potential issues</p>
      </div>
    );
  }

  // Container is running - show healthy state
  if (containerState?.toLowerCase() === 'running') {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-emerald-400" />
          <h2 className="text-lg font-semibold text-slate-100">Health Status</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <motion.div 
            className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle size={48} className="text-emerald-400" />
          </motion.div>
          <h3 className="text-xl font-semibold text-emerald-400 mb-2">Container is Healthy</h3>
          <p className="text-slate-400 text-center"><strong className="text-slate-200">{containerName}</strong> is running without any detected issues</p>
          <div className="flex items-center gap-2 mt-6 px-4 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-400">
            <Lightbulb size={16} className="text-yellow-400" />
            <span>Tip: Check the logs tab to monitor application activity in real-time</span>
          </div>
        </div>
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
          <button 
            onClick={() => refetch()} 
            className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <RefreshCw size={14} />
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  const failure = analysis?.failure;
  const explanation = analysis?.explanation;

  if (!failure || failure.category === null) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={20} className="text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-100">Analysis Complete</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 bg-slate-800/50 border border-slate-700 rounded-xl">
          <HelpCircle size={32} className="text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Clear Issues Detected</h3>
          <p className="text-slate-500 text-center max-w-md">We couldn't identify a specific failure pattern. The container may have exited normally or the issue is not in our detection patterns.</p>
          <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-700/50 rounded-lg text-sm text-slate-400">
            <Lightbulb size={16} className="text-yellow-400" />
            <span>Check the logs tab for more details about what happened</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-red-400" />
          <h2 className="text-lg font-semibold text-slate-100">Failure Analysis</h2>
        </div>
        <button 
          onClick={() => refetch()} 
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Main Alert Banner */}
      <motion.div 
        className={`p-4 rounded-xl border-l-4 flex items-start gap-4 ${getCategoryClasses(failure.category)}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="p-2 rounded-lg bg-current/10">
          {getCategoryIcon(failure.category)}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{getCategoryLabel(failure.category)}</h3>
          <p className="text-sm opacity-80 mt-1">{getCategoryDescription(failure.category)}</p>
        </div>
      </motion.div>

      {/* Confidence Indicator */}
      <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TrendingUp size={16} />
          <span>Confidence Level</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getConfidenceColor(failure.confidence)}`}
            style={{ width: getConfidenceWidth(failure.confidence) }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className={failure.confidence === 'low' ? 'text-blue-400 font-medium' : 'text-slate-600'}>Low</span>
          <span className={failure.confidence === 'medium' ? 'text-yellow-400 font-medium' : 'text-slate-600'}>Medium</span>
          <span className={failure.confidence === 'high' ? 'text-red-400 font-medium' : 'text-slate-600'}>High</span>
        </div>
        <p className="text-sm text-slate-400">{getConfidenceExplanation(failure.confidence)}</p>
      </div>

      {/* Stability Insight */}
      {failure.stabilityInsight && (
        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
          <Activity size={16} />
          <span>{failure.stabilityInsight}</span>
        </div>
      )}

      {/* Explanation Section */}
      {explanation && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-3">
              <Zap size={16} />
              <span className="font-medium">What Happened</span>
            </div>
            <p className="text-slate-200">{explanation.summary}</p>
            {explanation.explanation && (
              <p className="text-slate-400 text-sm mt-2">{explanation.explanation}</p>
            )}
          </div>

          {/* Likely Causes */}
          {explanation.likelyCauses && explanation.likelyCauses.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="flex items-center gap-2 text-orange-400 font-medium mb-3">
                <AlertTriangle size={16} />
                Possible Causes
              </h4>
              <ul className="space-y-2">
                {explanation.likelyCauses.map((cause, index) => (
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

          {/* Suggested Checks */}
          {explanation.suggestedChecks && explanation.suggestedChecks.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="flex items-center gap-2 text-emerald-400 font-medium mb-3">
                <Lightbulb size={16} />
                What to Do Next
              </h4>
              <ul className="space-y-2">
                {explanation.suggestedChecks.map((check, index) => (
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
                    <span>{check}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* Signals Observed */}
          {explanation.signalsObserved && explanation.signalsObserved.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl p-4">
              <h4 className="flex items-center gap-2 text-purple-400 font-medium mb-3">
                <Zap size={16} />
                Detected Signals
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {explanation.signalsObserved.map((signal, index) => (
                  <span key={index} className="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 font-mono">
                    {signal}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                These are the technical indicators our system detected that led to this diagnosis.
              </p>
            </div>
          )}
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
