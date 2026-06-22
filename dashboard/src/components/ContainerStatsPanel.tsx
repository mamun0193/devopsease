import React from 'react';
import { Activity, Cpu, HardDrive, Network, Wifi, WifiOff, Clock } from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useMetricsStream } from '../hooks/useMetricsStream';
import type { MetricsDataPoint } from '../hooks/useMetricsStream';
import api from '../api';
import {
  type TimeRange,
  RANGE_LABELS,
  formatTimeForRange,
  ChartTooltip,
  ChartGradients,
  AXIS_STYLE,
} from '../utils/chartUtils';

interface ContainerStatsProps {
  containerId: string | null;
  containerState: string;
  resourceLimits?: {
    memoryMB: number | null;
    cpuCores: number | null;
  } | null;
}

const ContainerStatsPanel: React.FC<ContainerStatsProps> = ({ containerId, containerState, resourceLimits }) => {
  const isRunning = containerState === 'running';
  const [selectedRange, setSelectedRange] = React.useState<TimeRange>('1m');
  const [historicalData, setHistoricalData] = React.useState<MetricsDataPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const { dataPoints, latestStats, isStreaming } = useMetricsStream(containerId, isRunning);

  // Fetch historical data when range changes (not for 1m — that uses live data)
  React.useEffect(() => {
    if (!containerId || selectedRange === '1m') {
      setHistoricalData([]);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);

    api.get(`/containers/${containerId}/metrics-history?range=${selectedRange}`)
      .then((res: any) => {
        if (!cancelled) {
          setHistoricalData(res.data?.data?.dataPoints || []);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoricalData([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => { cancelled = true; };
  }, [containerId, selectedRange]);

  // Use live data for 1m, historical data for other ranges
  const chartData = selectedRange === '1m' ? dataPoints : historicalData;

  // Check if aggregated data has min/max bands
  const hasMinMax = selectedRange !== '1m' && chartData.length > 0 && chartData[0]?.cpuMin != null;

  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-dds-surface/50 rounded-xl border border-dds-border shadow-sm">
        <Activity size={48} className="text-dds-text-muted mb-4" />
        <h3 className="text-[15px] font-medium text-dds-text-primary">No Container Selected</h3>
        <p className="text-[13px] text-dds-text-secondary mt-1">Select a container to view resource usage</p>
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-dds-surface/50 rounded-xl border border-dds-border shadow-sm">
        <Activity size={48} className="text-dds-text-muted mb-4" />
        <h3 className="text-[15px] font-medium text-dds-text-primary">Container Not Running</h3>
        <p className="text-[13px] text-dds-text-secondary mt-1">Stats are only available for running containers</p>
      </div>
    );
  }

  if (!latestStats && dataPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-dds-surface/50 rounded-xl border border-dds-border shadow-sm">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-dds-primary mb-4" />
        <p className="text-[13px] text-dds-text-secondary">Connecting to metrics stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-dds-primary" />
          <h3 className="text-[15px] font-semibold text-dds-text-primary uppercase tracking-wider">Resource Usage</h3>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium tracking-wider text-dds-green bg-dds-green/10 border border-dds-green/30 px-2 py-0.5 rounded">
              <Wifi size={12} /> LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium tracking-wider text-dds-orange bg-dds-orange/10 border border-dds-orange/30 px-2 py-0.5 rounded">
              <WifiOff size={12} /> POLLING
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="bg-dds-surface rounded-xl p-5 border border-dds-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={16} className="text-dds-primary" />
            <span className="text-[13px] font-medium text-dds-text-secondary uppercase tracking-wide">CPU</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dds-text-primary font-mono tracking-tight">
              {latestStats?.cpuPercent?.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-[13px] text-dds-text-muted font-medium">%</span>
          </div>
          {resourceLimits?.cpuCores && (
            <p className="text-[11px] text-dds-text-muted mt-1 font-mono">
              {((latestStats?.cpuPercent ?? 0) * resourceLimits.cpuCores / 100).toFixed(2)} / {resourceLimits.cpuCores} cores
            </p>
          )}
          <div className="w-full bg-dds-bg rounded-full h-1 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-dds-primary to-dds-blue h-1 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(latestStats?.cpuPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="bg-dds-surface rounded-xl p-5 border border-dds-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={16} className="text-dds-blue" />
            <span className="text-[13px] font-medium text-dds-text-secondary uppercase tracking-wide">Memory</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-dds-text-primary font-mono tracking-tight">
              {latestStats?.memoryUsedMB ?? 0}
            </span>
            <span className="text-[13px] text-dds-text-muted font-medium">MB</span>
          </div>
          <p className="text-[11px] text-dds-text-muted mt-1 font-mono">
            / {resourceLimits?.memoryMB || latestStats?.memoryLimitMB || '—'} MB limit
          </p>
          <div className="w-full bg-dds-bg rounded-full h-1 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-dds-blue to-dds-green h-1 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(latestStats?.memoryPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Network */}
        <div className="bg-dds-surface rounded-xl p-5 border border-dds-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Network size={16} className="text-dds-green" />
            <span className="text-[13px] font-medium text-dds-text-secondary uppercase tracking-wide">Network I/O</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div>
              <p className="text-[10px] text-dds-text-muted uppercase tracking-wider mb-1 font-medium">RX</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-dds-text-primary font-mono tracking-tight">{latestStats?.networkRxMB?.toFixed(2) ?? '0'}</span>
                <span className="text-[10px] text-dds-text-muted">MB</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-dds-text-muted uppercase tracking-wider mb-1 font-medium">TX</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-dds-text-primary font-mono tracking-tight">{latestStats?.networkTxMB?.toFixed(2) ?? '0'}</span>
                <span className="text-[10px] text-dds-text-muted">MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {(chartData.length > 1 || loadingHistory) && (
        <div className="mt-8">
          {/* Time range selector */}
          <div className="flex items-center gap-3 mb-4">
            <Clock size={14} className="text-dds-text-muted" />
            <div className="flex gap-1.5">
              {RANGE_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedRange(key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${selectedRange === key
                    ? 'bg-dds-primary text-white shadow-sm'
                    : 'bg-dds-surface text-dds-text-secondary border border-dds-border hover:bg-dds-surface/80 hover:text-dds-text-primary'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedRange !== '1m' && historicalData.length > 0 && (
              <span className="text-[11px] text-dds-text-muted ml-auto font-mono">{historicalData.length} data points</span>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-16 bg-dds-surface/50 rounded-xl border border-dds-border shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dds-primary" />
            </div>
          ) : chartData.length > 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CPU Chart */}
              <div className="bg-dds-surface rounded-xl p-5 border border-dds-border shadow-sm">
                <h4 className="text-[14px] font-medium text-dds-text-primary mb-5">CPU Usage %</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <ChartGradients />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => formatTimeForRange(ts, selectedRange)}
                      {...AXIS_STYLE}
                      minTickGap={40}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      {...AXIS_STYLE}
                      width={35}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cpuPercent"
                      name="CPU"
                      stroke="#a855f7"
                      strokeWidth={2}
                      fill="url(#cpuGradient)"
                      isAnimationActive={false}
                    />
                    {hasMinMax && (
                      <Line
                        type="monotone"
                        dataKey="cpuMax"
                        name="Max"
                        stroke="#a855f7"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        strokeOpacity={0.4}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                    {hasMinMax && (
                      <Line
                        type="monotone"
                        dataKey="cpuMin"
                        name="Min"
                        stroke="#a855f7"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        strokeOpacity={0.3}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Memory Chart */}
              <div className="bg-dds-surface rounded-xl p-5 border border-dds-border shadow-sm">
                <h4 className="text-[14px] font-medium text-dds-text-primary mb-5">Memory Usage (MB)</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <ChartGradients />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(ts) => formatTimeForRange(ts, selectedRange)}
                      {...AXIS_STYLE}
                      minTickGap={40}
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      {...AXIS_STYLE}
                      width={40}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="memoryUsedMB"
                      name="Memory"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#memGradient)"
                      isAnimationActive={false}
                    />
                    {hasMinMax && (
                      <Line
                        type="monotone"
                        dataKey="memoryMax"
                        name="Max"
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        strokeOpacity={0.4}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                    {hasMinMax && (
                      <Line
                        type="monotone"
                        dataKey="memoryMin"
                        name="Min"
                        stroke="#3b82f6"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        strokeOpacity={0.3}
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-dds-surface/50 rounded-xl border border-dds-border shadow-sm">
              <p className="text-[13px] text-dds-text-secondary">No historical data for this range yet</p>
              <p className="text-[11px] text-dds-text-muted mt-1">Metrics are stored every 30 seconds</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ContainerStatsPanel;
