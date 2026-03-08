import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, HardDrive, TrendingUp, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useVisibilityInterval } from '../hooks/useContainerPolling';

interface TopContainer {
    containerId: string;
    containerName: string;
    cpuPercent: number;
    memoryUsedMB: number;
    memoryLimitMB: number;
}

interface TopContainersData {
    topCPU: TopContainer[];
    topMemory: TopContainer[];
}

// Real-time polling — top container metrics change continuously
function useTopContainers() {
    const refetchInterval = useVisibilityInterval(20000);

    return useQuery<TopContainersData>({
        queryKey: ['topContainers'],
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: TopContainersData }>('/containers/top');
            return response.data.data;
        },
        refetchInterval,
        staleTime: 15000,
    });
}

function BarIndicator({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
                className={`${color} h-1.5 rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function ContainerRow({ container, metric }: { container: TopContainer; metric: 'cpu' | 'memory' }) {
    const name = container.containerName || container.containerId.substring(0, 12);
    return (
        <Link
            to={`/container/${container.containerId}`}
            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/50 transition-colors group"
        >
            <span className="text-sm text-slate-300 truncate flex-1 group-hover:text-blue-400 transition-colors">
                {name}
            </span>
            <div className="w-24">
                <BarIndicator
                    value={metric === 'cpu' ? container.cpuPercent : container.memoryUsedMB}
                    max={metric === 'cpu' ? 100 : container.memoryLimitMB || 1024}
                    color={metric === 'cpu' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}
                />
            </div>
            <span className="text-xs text-slate-400 tabular-nums w-16 text-right">
                {metric === 'cpu'
                    ? `${container.cpuPercent.toFixed(1)}%`
                    : `${container.memoryUsedMB} MB`
                }
            </span>
        </Link>
    );
}

const TopContainersPanel: React.FC = () => {
    const { data, isLoading } = useTopContainers();

    const hasData = data && (data.topCPU.length > 0 || data.topMemory.length > 0);

    if (!hasData && !isLoading) return null;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-400" />
                    <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
                        Top Containers
                    </h2>
                </div>
                {isLoading && <Loader2 size={13} className="animate-spin text-slate-500" />}
            </div>

            {!hasData ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 bg-slate-800 rounded" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top by CPU */}
                    {data.topCPU.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Cpu size={12} className="text-purple-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">By CPU</span>
                            </div>
                            <div className="space-y-0.5">
                                {data.topCPU.map((c) => (
                                    <ContainerRow key={c.containerId} container={c} metric="cpu" />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Top by Memory */}
                    {data.topMemory.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <HardDrive size={12} className="text-blue-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">By Memory</span>
                            </div>
                            <div className="space-y-0.5">
                                {data.topMemory.map((c) => (
                                    <ContainerRow key={c.containerId} container={c} metric="memory" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TopContainersPanel;
