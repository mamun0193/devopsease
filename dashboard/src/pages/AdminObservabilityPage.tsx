import React, { useEffect, useState } from 'react';
import api from '../api';
import Header from '../components/Header';

interface SystemMetrics {
    activeWebSockets: number;
    activeExecSessions: number;
    tokenRefreshCount: number;
    failedLogins: number;
    rateLimitHits: number;
    uptimeSeconds: number;
    timestamp: string;
}

const AdminObservabilityPage: React.FC = () => {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            const response = await api.get('/metrics');
            setMetrics(response.data);
            setError(null);
        } catch (err: any) {
            if (err.response && err.response.status === 403) {
                setError("Access Denied: Admin privileges required.");
            } else if (err.response && err.response.status === 429) {
                // Rate limited, just keep old data and don't show error to avoid flickering
                console.warn("Metrics rate limited");
            } else {
                setError("Failed to fetch system metrics.");
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        let result = "";
        if (days > 0) result += `${days}d `;
        if (hours > 0) result += `${hours}h `;
        result += `${minutes}m ${secs}s`;
        return result;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Header />
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-emerald-400">System Observability</h1>

                {error ? (
                    <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                ) : null}

                {loading && !metrics ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                ) : metrics ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <MetricCard title="System Uptime" value={formatUptime(metrics.uptimeSeconds)} color="emerald" />
                            <MetricCard title="Active WebSockets" value={metrics.activeWebSockets} color="blue" />
                            <MetricCard title="Active Exec Sessions" value={metrics.activeExecSessions} color="violet" />
                            <MetricCard title="Token Refreshes" value={metrics.tokenRefreshCount} color="indigo" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                                <h2 className="text-xl font-semibold mb-4 text-gray-300">Security Events</h2>
                                <div className="space-y-4">
                                    <SecurityRow label="Failed Logins" value={metrics.failedLogins} type="danger" />
                                    <SecurityRow label="Rate Limit Hits" value={metrics.rateLimitHits} type="warning" />
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
                                <h2 className="text-xl font-semibold mb-4 text-gray-300">System Health</h2>
                                <div className="flex items-center space-x-2">
                                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-emerald-400 font-medium">System Operating Normally</span>
                                </div>
                                <p className="text-gray-500 mt-2 text-sm">Last updated: {new Date(metrics.timestamp || Date.now()).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, color }: { title: string, value: string | number, color: string }) => {
    const colorClasses = {
        emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        violet: "text-violet-400 bg-violet-400/10 border-violet-400/20",
        indigo: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    }[color] || "text-gray-400 bg-gray-400/10 border-gray-400/20";

    return (
        <div className={`rounded-xl p-6 border ${colorClasses}`}>
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">{title}</h3>
            <div className={`text-3xl font-bold ${color === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
        </div>
    );
};

const SecurityRow = ({ label, value, type }: { label: string, value: number, type: 'danger' | 'warning' }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-700 last:border-0">
        <span className="text-gray-300">{label}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${type === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
            {value}
        </span>
    </div>
);

export default AdminObservabilityPage;
