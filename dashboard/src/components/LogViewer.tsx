import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  ArrowDown,
  Copy,
  Check,
  Calendar
} from 'lucide-react';
import { useContainerLogs } from '../hooks/useContainers';
import { useLogStream } from '../hooks/useLogStream';
import type { ParsedLogLine } from '../api';
import RefreshButton from './RefreshButton';
import { DateTimePicker } from './ui/date-time-picker';

// Normalized log entry with timestamp inference
interface NormalizedLogLine extends ParsedLogLine {
  normalizedTimestamp: string | null;
  parsedDate: Date | null;
  isInferred: boolean;
  raw: string;
}

// Extract timestamp from raw log line (handles Docker stream prefix)
function extractTimestampFromRaw(rawLine: string): string | null {
  const cleaned = rawLine.replace(/^[^\x20-\x7E]+/, '').replace(/^[^0-9[]*/, '');
  
  const patterns = [
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/,
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}:?\d{2})/,
    /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Parse timestamp to Date object
function parseTimestamp(timestamp: string | null): Date | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Format timestamp to local format: DD-MM-YYYY HH:MM:SS
function formatToLocalTimestamp(date: Date | null): string | null {
  if (!date) return null;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

// Normalize logs with timestamp parsing and inference
function normalizeLogTimestamps(logs: ParsedLogLine[]): NormalizedLogLine[] {
  let lastKnownDate: Date | null = null;
  
  return logs.map(log => {
    const rawLine = log.rawLine || log.message;
    
    // Try server timestamp first, then extract from raw
    let parsedDate = parseTimestamp(log.timestamp);
    if (!parsedDate) {
      const extracted = extractTimestampFromRaw(rawLine);
      parsedDate = parseTimestamp(extracted);
    }
    
    if (parsedDate) {
      lastKnownDate = parsedDate;
      return {
        ...log,
        normalizedTimestamp: formatToLocalTimestamp(parsedDate),
        parsedDate,
        isInferred: false,
        raw: rawLine,
      };
    } else {
      return {
        ...log,
        normalizedTimestamp: lastKnownDate ? formatToLocalTimestamp(lastKnownDate) : null,
        parsedDate: lastKnownDate,
        isInferred: lastKnownDate !== null,
        raw: rawLine,
      };
    }
  });
}

interface LogViewerProps {
  containerId: string | null;
  containerName: string;
  initialTimeRange?: { since?: number; until?: number };
}

const LogViewer: React.FC<LogViewerProps> = ({ containerId, containerName, initialTimeRange }) => {
  const { data: logsData, isLoading, error, refetch } = useContainerLogs(containerId);

  // WebSocket log stream — provides real-time log tailing without polling
  const { lines: streamLines, isStreaming } = useLogStream(
    // Only use stream when there's no time-range filter (streaming = live tail)
    initialTimeRange ? null : containerId,
    { tail: 200 }
  );
  
  // State
  const [expandedLine, setExpandedLine] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilters, setActiveFilters] = React.useState<string[]>([]);
  const [showOnlyImportant, setShowOnlyImportant] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  
  // Time range filter state - initialize from prop if provided
  const [showTimeRange, setShowTimeRange] = React.useState(!!initialTimeRange);
  const [startTime, setStartTime] = React.useState<Date | undefined>(
    initialTimeRange?.since ? new Date(initialTimeRange.since * 1000) : undefined
  );
  const [endTime, setEndTime] = React.useState<Date | undefined>(
    initialTimeRange?.until ? new Date(initialTimeRange.until * 1000) : undefined
  );
  const [timeRangeActive, setTimeRangeActive] = React.useState(!!initialTimeRange);
  
  // Refs
  const logContainerRef = React.useRef<HTMLDivElement>(null);
  const prevLogCountRef = React.useRef(0);

  // Get parsed logs and stats
  // When streaming, append WebSocket lines as minimal ParsedLogLine entries
  const parsedLogs = React.useMemo(() => {
    const restLogs: ParsedLogLine[] = logsData?.parsed || [];

    if (!isStreaming || streamLines.length === 0) return restLogs;

    // Convert raw WebSocket lines to ParsedLogLine format
    const wsLogs: ParsedLogLine[] = streamLines.map((line, i) => {
      const level =
        /error|fatal|panic/i.test(line) ? 'error' :
        /warn/i.test(line) ? 'warning' :
        /success|started|ready/i.test(line) ? 'success' :
        'info';

      return {
        id: -(i + 1), // negative IDs avoid collision with server-assigned positive IDs
        rawLine: line,
        timestamp: null as unknown as string,
        level,
        message: line,
        explanation: undefined as unknown as string,
        isImportant: level === 'error' || level === 'warning',
        hasDetails: false,
        timezone: '',
      };
    });

    return wsLogs; // stream replaces REST logs when active
  }, [logsData?.parsed, streamLines, isStreaming]);
  const stats = logsData?.stats || { total: 0, errors: 0, warnings: 0, info: 0, success: 0 };

  // Normalize logs
  const normalizedLogs = React.useMemo(() => normalizeLogTimestamps(parsedLogs), [parsedLogs]);

  // Parse time range inputs to Date objects
  const timeRange = React.useMemo(() => {
    if (!timeRangeActive || (!startTime && !endTime)) return null;
    
    return { start: startTime || null, end: endTime || null };
  }, [startTime, endTime, timeRangeActive]);

  // Apply all filters
  const filteredLogs = React.useMemo(() => {
    let result = normalizedLogs;
    
    // Time range filter
    if (timeRange) {
      result = result.filter(log => {
        if (!log.parsedDate) return false;
        if (timeRange.start && log.parsedDate < timeRange.start) return false;
        if (timeRange.end && log.parsedDate > timeRange.end) return false;
        return true;
      });
    }
    
    // Important filter
    if (showOnlyImportant) {
      result = result.filter(log => log.isImportant);
    }
    
    // Level filters
    if (activeFilters.length > 0) {
      result = result.filter(log => activeFilters.includes(log.level));
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.explanation?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [normalizedLogs, activeFilters, searchQuery, showOnlyImportant, timeRange]);

  // Toggle level filter
  const toggleFilter = (level: string) => {
    setActiveFilters(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  // Apply time range
  const applyTimeRange = () => {
    setTimeRangeActive(true);
    setShowTimeRange(false);
  };

  // Clear time range
  const clearTimeRange = () => {
    setStartTime(undefined);
    setEndTime(undefined);
    setTimeRangeActive(false);
    setShowTimeRange(false);
  };

  // Scroll functions
  const scrollToBottom = React.useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  // Handle scroll - detect position for auto-scroll
  const handleScroll = React.useCallback(() => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setAutoScroll(nearBottom);
    }
  }, []);

  // Auto-scroll on initial load
  React.useEffect(() => {
    if (filteredLogs.length > 0 && prevLogCountRef.current === 0) {
      setTimeout(scrollToBottom, 150);
    }
    prevLogCountRef.current = filteredLogs.length;
  }, [filteredLogs.length, scrollToBottom]);

  // Auto-scroll when new logs arrive
  React.useEffect(() => {
    if (autoScroll && filteredLogs.length > 0) {
      scrollToBottom();
    }
  }, [filteredLogs.length, autoScroll, scrollToBottom]);

  // Icon helper
  const getIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle size={14} />;
      case 'warning': return <AlertTriangle size={14} />;
      case 'info': return <Info size={14} />;
      case 'success': return <CheckCircle size={14} />;
      default: return <FileText size={14} />;
    }
  };

  // No container selected
  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-dds-surface/50 rounded-xl border border-dds-border shadow-sm">
        <FileText size={48} className="text-dds-text-muted mb-4" />
        <h3 className="text-[15px] font-medium text-dds-text-primary">No Container Selected</h3>
        <p className="text-[13px] text-dds-text-secondary mt-1">Select a container to view logs</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-140 bg-dds-bg rounded-xl border border-dds-border overflow-hidden relative shadow-sm">
      {/* Header - Fixed at top, always visible */}
      <div className="shrink-0 px-4 py-3 border-b border-dds-border space-y-3 bg-dds-surface/80">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-dds-text-primary uppercase tracking-wider">
            <FileText size={16} className="text-dds-primary" />
            Logs
            <span className="text-[11px] font-mono font-medium text-dds-text-muted normal-case ml-1">• {containerName}</span>
          </h2>
          
          {/* Refresh Button */}
          <RefreshButton
            onRefresh={() => { refetch(); }}
            isLoading={isLoading}
            size="sm"
            variant="default"
            showLabel={false}
          />
        </div>

        {/* Level Filters + Time Range - Single Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-2">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all border ${
                activeFilters.includes('error') 
                  ? 'bg-dds-red/10 text-dds-red border-dds-red/30' 
                  : 'bg-dds-bg text-dds-text-secondary border-dds-border hover:bg-dds-surface/80 hover:text-dds-white'
              }`}
              onClick={() => toggleFilter('error')}
            >
              <AlertCircle size={12} />
              {stats.errors} Errors
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all border ${
                activeFilters.includes('warning') 
                  ? 'bg-dds-orange/10 text-dds-orange border-dds-orange/30' 
                  : 'bg-dds-bg text-dds-text-secondary border-dds-border hover:bg-dds-surface/80 hover:text-dds-white'
              }`}
              onClick={() => toggleFilter('warning')}
            >
              <AlertTriangle size={12} />
              {stats.warnings} Warnings
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all border ${
                activeFilters.includes('info') 
                  ? 'bg-dds-blue/10 text-dds-blue border-dds-blue/30' 
                  : 'bg-dds-bg text-dds-text-secondary border-dds-border hover:bg-dds-surface/80 hover:text-dds-white'
              }`}
              onClick={() => toggleFilter('info')}
            >
              <Info size={12} />
              {stats.info} Info
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-all border ${
                activeFilters.includes('success') 
                  ? 'bg-dds-green/10 text-dds-green border-dds-green/30' 
                  : 'bg-dds-bg text-dds-text-secondary border-dds-border hover:bg-dds-surface/80 hover:text-dds-white'
              }`}
              onClick={() => toggleFilter('success')}
            >
              <CheckCircle size={12} />
              {stats.success} Success
            </button>
          </div>

          {/* Time Range Button */}
          <div className="relative">
            <button 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-mono font-medium transition-colors border ${
                timeRangeActive 
                  ? 'bg-dds-primary/10 text-dds-primary border-dds-primary/30' 
                  : 'bg-dds-bg text-dds-text-secondary border-dds-border hover:bg-dds-surface/80 hover:text-dds-white'
              }`}
              onClick={() => setShowTimeRange(!showTimeRange)}
            >
              <Calendar size={14} />
              {timeRangeActive ? 'Time Filter Active' : 'Time Range'}
            </button>
            
            {/* Backdrop */}
            {showTimeRange && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowTimeRange(false)}
              />
            )}
            
            {/* Time Range Dropdown */}
            {showTimeRange && (
              <div className="absolute right-0 top-full mt-2 bg-dds-surface border border-dds-border rounded-xl shadow-2xl z-50 p-4 w-80">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">Start Time</label>
                    <DateTimePicker
                      date={startTime}
                      onDateChange={setStartTime}
                      placeholder="Select start time"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">End Time</label>
                    <DateTimePicker
                      date={endTime}
                      onDateChange={setEndTime}
                      placeholder="Select end time"
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={applyTimeRange}
                      className="btn-primary flex-1 justify-center"
                    >
                      <Check size={14} className="mr-1.5" />
                      Apply Filter
                    </button>
                    <button
                      onClick={clearTimeRange}
                      className="px-4 py-2.5 bg-dds-bg hover:bg-dds-border text-dds-text-primary text-[13px] font-medium rounded-lg transition-colors border border-dds-border"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dds-text-muted" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-dds-bg border border-dds-border/50 rounded-lg text-dds-text-primary text-[13px] placeholder:text-dds-text-muted focus:outline-none focus:border-dds-primary transition-colors"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-dds-surface rounded text-dds-text-muted hover:text-dds-white transition-colors"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-dds-text-secondary hover:text-dds-white transition-colors cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showOnlyImportant}
              onChange={(e) => setShowOnlyImportant(e.target.checked)}
              className="w-4 h-4 rounded border-dds-border/50 bg-dds-bg text-dds-primary focus:ring-dds-primary"
            />
            Important only
          </label>
        </div>
      </div>

      {/* Log Container - Scrollable */}
      <div 
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-2 font-mono text-[12px] bg-dds-bg"
      >
        {isLoading && parsedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-dds-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[13px] text-dds-text-muted tracking-wide">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-dds-red">
            <AlertCircle size={24} className="mb-4" />
            <p className="font-medium text-[13px]">Failed to load logs</p>
            <span className="text-[12px] text-dds-text-muted mt-1">{error.message}</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <FileText size={32} className="text-dds-text-muted mb-4" />
            <p className="text-[13px] text-dds-text-secondary">
              {parsedLogs.length === 0 
                ? 'No logs available for this container.'
                : 'No logs match your filters'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-[2px]">
            {filteredLogs.map((log, index) => (
              <LogLine
                key={log.id}
                log={log}
                lineNumber={index + 1}
                isExpanded={expandedLine === log.id}
                onToggle={() => setExpandedLine(expandedLine === log.id ? null : log.id)}
                getIcon={getIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* Jump to Latest - Absolute overlay, only visible when scrolled up */}
      {!autoScroll && (
        <button
          onClick={() => {
            scrollToBottom();
            setAutoScroll(true);
          }}
          className="absolute bottom-12 right-4 group flex items-center gap-2 px-3 py-2 rounded-full bg-dds-primary hover:bg-dds-primary/90 text-white shadow-lg transition-all z-30"
          title="Jump to latest"
        >
          <ArrowDown size={16} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-24 transition-all duration-200 text-[13px] font-medium whitespace-nowrap">
            Jump to latest
          </span>
        </button>
      )}

      {/* Status Bar - minimal, always visible */}
      <div className="shrink-0 flex items-center justify-between px-4 py-1.5 border-t border-dds-border bg-dds-surface text-[11px] font-mono font-medium text-dds-text-secondary">
        <span>
          {filteredLogs.length} OF {stats.total} LOGS
          {timeRangeActive && ' • TIME FILTER ACTIVE'}
          {(activeFilters.length > 0 || searchQuery) && ' • FILTERED'}
        </span>
        <span className={autoScroll ? 'text-dds-green' : 'text-dds-orange'}>
          {autoScroll ? '● LIVE' : '○ PAUSED'}
        </span>
      </div>
    </div>
  );
};

// Log Line Component
interface LogLineProps {
  log: NormalizedLogLine;
  lineNumber: number;
  isExpanded: boolean;
  onToggle: () => void;
  getIcon: (level: string) => React.ReactNode;
}

const LogLine: React.FC<LogLineProps> = ({ log, lineNumber, isExpanded, onToggle, getIcon }) => {
  const [copied, setCopied] = React.useState(false);

  const levelClassesMap: Record<string, string> = {
    error: 'border-l-dds-red hover:bg-dds-red/5',
    warning: 'border-l-dds-orange hover:bg-dds-orange/5',
    info: 'border-l-dds-blue hover:bg-dds-blue/5',
    success: 'border-l-dds-green hover:bg-dds-green/5',
    debug: 'border-l-dds-text-muted hover:bg-dds-surface/50',
    unknown: 'border-l-dds-text-secondary hover:bg-dds-surface/50',
  };
  const levelClasses = levelClassesMap[log.level] || levelClassesMap.unknown;

  const levelColorMap: Record<string, string> = {
    error: 'text-dds-red',
    warning: 'text-dds-orange',
    info: 'text-dds-blue',
    success: 'text-dds-green',
    debug: 'text-dds-text-muted',
    unknown: 'text-dds-text-secondary',
  };
  const levelColor = levelColorMap[log.level] || levelColorMap.unknown;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(log.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const displayTimestamp = log.normalizedTimestamp 
    ? (log.isInferred ? `~${log.normalizedTimestamp}` : log.normalizedTimestamp)
    : 'null';

  return (
    <motion.div
      className={`border-l-2 rounded-r transition-colors cursor-pointer ${levelClasses} ${
        isExpanded ? 'bg-dds-surface/50' : ''
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2 px-3 py-1">
        <span className="w-4 shrink-0 text-center text-dds-text-muted text-[10px] mt-[1px]">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="text-dds-text-muted w-5 text-right shrink-0">{lineNumber}</span>
        <span className={`shrink-0 ${levelColor}`}>{getIcon(log.level)}</span>
        <span className={`shrink-0 w-36 tabular-nums ${
          log.normalizedTimestamp 
            ? (log.isInferred ? 'text-dds-primary/50 italic' : 'text-dds-primary')
            : 'text-dds-text-muted'
        }`}>
          {displayTimestamp}
        </span>
        <span className="text-dds-text-primary break-all flex-1">{log.message}</span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mb-2 space-y-2 mt-1">
              {/* Raw Log */}
              <div className="p-2 bg-dds-bg rounded border border-dds-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Raw</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono text-dds-text-secondary hover:text-dds-white hover:bg-dds-surface rounded transition-colors"
                  >
                    {copied ? <Check size={12} className="text-dds-green" /> : <Copy size={12} />}
                    {copied ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <code className="text-[12px] text-dds-text-secondary break-all block">{log.raw}</code>
              </div>

              {/* Timestamp Info */}
              <div className="flex items-center gap-4 px-2 py-1.5 bg-dds-surface/80 rounded border border-dds-border/50 text-[11px] font-mono">
                <span className="text-dds-text-secondary">
                  TIMESTAMP: <span className={log.isInferred ? 'text-dds-primary/60 ml-1' : 'text-dds-primary ml-1'}>
                    {log.normalizedTimestamp || 'N/A'}
                  </span>
                </span>
                <span className={`px-1.5 py-0.5 rounded ${
                  log.normalizedTimestamp 
                    ? (log.isInferred ? 'bg-dds-orange/10 text-dds-orange' : 'bg-dds-green/10 text-dds-green')
                    : 'bg-dds-bg text-dds-text-muted'
                }`}>
                  {log.normalizedTimestamp ? (log.isInferred ? 'INFERRED' : 'PARSED') : 'NONE'}
                </span>
              </div>

              {/* Explanation */}
              {log.explanation && (
                <div className="p-2 bg-dds-surface rounded border border-dds-border/50">
                  <div className="flex items-center gap-1.5 mb-1.5 text-dds-orange text-[11px] font-mono uppercase tracking-wider">
                    <span>💡</span>
                    <span className="font-medium">What does this mean?</span>
                  </div>
                  <p className="text-dds-text-primary text-[13px] leading-relaxed font-sans">{log.explanation}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LogViewer;
