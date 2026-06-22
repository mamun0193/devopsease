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
        <div className="w-full bg-dds-bg border border-dds-border/50 rounded-full h-1.5 overflow-hidden">
            <div
                className={`${color} h-full rounded-full transition-all duration-500 ease-out`}
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
            className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-dds-bg transition-colors group"
        >
            <span className="text-[13px] text-dds-text-primary truncate flex-1 group-hover:text-dds-primary transition-colors">
                {name}
            </span>
            <div className="w-24">
                <BarIndicator
                    value={metric === 'cpu' ? container.cpuPercent : container.memoryUsedMB}
                    max={metric === 'cpu' ? 100 : container.memoryLimitMB || 1024}
                    color={metric === 'cpu' ? 'bg-dds-primary' : 'bg-dds-blue'}
                />
            </div>
            <span className="text-[12px] text-dds-text-secondary font-mono w-16 text-right">
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
        <div className="bg-dds-surface border border-dds-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-dds-primary" />
                    <h2 className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">
                        Top Containers
                    </h2>
                </div>
                {isLoading && <Loader2 size={13} className="animate-spin text-dds-text-muted" />}
            </div>

            {!hasData ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 bg-dds-border rounded" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top by CPU */}
                    {data.topCPU.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2 px-3">
                                <Cpu size={12} className="text-dds-primary" />
                                <span className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">By CPU</span>
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
                            <div className="flex items-center gap-1.5 mb-2 px-3">
                                <HardDrive size={12} className="text-dds-blue" />
                                <span className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">By Memory</span>
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
