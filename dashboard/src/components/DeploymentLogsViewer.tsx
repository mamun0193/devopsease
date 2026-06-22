import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, ArrowDown, Copy, Check } from 'lucide-react';
import { useDeploymentLogs } from '../hooks/useDeploymentLogs';
import { useDeploymentSocket } from '../hooks/useDeploymentSocket';

interface DeploymentLogsViewerProps {
  deploymentId: string;
}

const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

const DeploymentLogsViewer: React.FC<DeploymentLogsViewerProps> = ({ deploymentId }) => {
  const { data: initialLogs, isLoading, error } = useDeploymentLogs(deploymentId);
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const [copied, setCopied] = useState(false);

  // Initialize logs when query completes
  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
      setTimeout(() => scrollToBottom('auto'), 100);
    }
  }, [initialLogs]);

  // Real-time updates
  useDeploymentSocket({
    onLogs: (id, newLines) => {
      if (id === deploymentId) {
        setLogs(prev => {
          const combined = [...prev, ...newLines];
          // Keep a reasonable buffer
          return combined.length > 5000 ? combined.slice(-5000) : combined;
        });
      }
    }
  });

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (autoScroll && logs.length > 0) {
      scrollToBottom('auto'); // Don't use smooth when tailing rapidly
    }
  }, [logs.length, autoScroll]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs', err);
    }
  };

  const getLogStyles = (line: string) => {
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('failed') || lowerLine.includes('exception')) {
      return 'text-red-400 bg-red-500/5';
    }
    if (lowerLine.includes('warn') || lowerLine.includes('warning')) {
      return 'text-yellow-400 bg-yellow-500/5';
    }
    if (lowerLine.includes('info')) {
      return 'text-blue-400';
    }
    if (lowerLine.includes('success')) {
      return 'text-emerald-400';
    }
    return 'text-slate-300';
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading logs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-red-400">
        <AlertCircle size={24} className="mb-2" />
        <p>Failed to load logs</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-[#0d1117] rounded-xl border border-slate-800 overflow-hidden font-mono text-xs sm:text-sm shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-2 font-semibold tracking-wider">terminal</span>
        </div>
        <button
          onClick={handleCopy}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors disabled:opacity-50"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-0.5"
      >
        {logs.length === 0 ? (
          <div className="text-slate-500 text-center mt-10">No logs available yet</div>
        ) : (
          logs.map((line, i) => {
            const cleanLine = stripAnsi(line);
            return (
              <div key={i} className={`break-all whitespace-pre-wrap flex px-2 py-0.5 rounded transition-colors hover:bg-slate-800/50 ${getLogStyles(cleanLine)}`}>
                <span className="text-slate-600 mr-4 select-none w-8 text-right shrink-0">{i + 1}</span>
                <span className="flex-1 leading-relaxed">{cleanLine}</span>
              </div>
            );
          })
        )}
      </div>

      {!autoScroll && logs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollToBottom('smooth');
          }}
          className="absolute bottom-6 right-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-full shadow-lg shadow-blue-900/20 transition-all animate-bounce"
          title="Jump to latest"
        >
          <ArrowDown size={14} />
          <span className="text-xs font-semibold">Latest</span>
        </button>
      )}
    </div>
  );
};

export default DeploymentLogsViewer;
