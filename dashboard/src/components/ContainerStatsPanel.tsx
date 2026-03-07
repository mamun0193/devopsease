import React from 'react';
import { Activity, Cpu, HardDrive, Network, Wifi, WifiOff, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <Activity size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">No Container Selected</h3>
        <p className="text-slate-500">Select a container to view resource usage</p>
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <Activity size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">Container Not Running</h3>
        <p className="text-slate-500">Stats are only available for running containers</p>
      </div>
    );
  }

  if (!latestStats && dataPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400">Connecting to metrics stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">Resource Usage</h3>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi size={12} />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400">
              <WifiOff size={12} />
              Polling
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-slate-300">CPU</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {latestStats?.cpuPercent?.toFixed(1) ?? '0.0'}
            </span>
            <span className="text-sm text-slate-400">%</span>
          </div>
          {resourceLimits?.cpuCores && (
            <p className="text-xs text-slate-500 mt-1">
              {((latestStats?.cpuPercent ?? 0) * resourceLimits.cpuCores / 100).toFixed(2)} / {resourceLimits.cpuCores} cores
            </p>
          )}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(latestStats?.cpuPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Memory</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              {latestStats?.memoryUsedMB ?? 0}
            </span>
            <span className="text-sm text-slate-400">MB</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            / {resourceLimits?.memoryMB || latestStats?.memoryLimitMB || '—'} MB limit
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(latestStats?.memoryPercent ?? 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Network */}
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Network size={16} className="text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">Network I/O</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">RX</p>
              <span className="text-lg font-bold text-slate-100">{latestStats?.networkRxMB?.toFixed(2) ?? '0'}</span>
              <span className="text-xs text-slate-400 ml-1">MB</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">TX</p>
              <span className="text-lg font-bold text-slate-100">{latestStats?.networkTxMB?.toFixed(2) ?? '0'}</span>
              <span className="text-xs text-slate-400 ml-1">MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {(chartData.length > 1 || loadingHistory) && (
        <div>
          {/* Time range selector */}
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-slate-500" />
            <div className="flex gap-1">
              {RANGE_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedRange(key)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedRange === key
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedRange !== '1m' && historicalData.length > 0 && (
              <span className="text-[10px] text-slate-500 ml-auto">{historicalData.length} data points</span>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : chartData.length > 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CPU Chart */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <h4 className="text-sm font-medium text-slate-300 mb-3">CPU Usage %</h4>
                <ResponsiveContainer width="100%" height={160}>
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
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Memory Chart */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <h4 className="text-sm font-medium text-slate-300 mb-3">Memory Usage (MB)</h4>
                <ResponsiveContainer width="100%" height={160}>
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
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-900/50 rounded-lg border border-slate-800">
              <p className="text-sm text-slate-500">No historical data for this range yet</p>
              <p className="text-xs text-slate-600 mt-1">Metrics are stored every 30 seconds</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default ContainerStatsPanel;

