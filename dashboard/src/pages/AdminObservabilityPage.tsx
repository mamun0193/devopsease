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

                        {/* Suspicious Activity Panel */}
                        <SuspiciousActivityPanel />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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

// --- Subcomponents ---

interface SuspiciousUser {
    userId: string;
    anomalyScore: number;
    isSuspicious: boolean;
    execCountLastMinute: number;
    restartCountLastMinute: number;
    containerCreateCountLastMinute: number;
}

const SuspiciousActivityPanel = () => {
    const [users, setUsers] = useState<SuspiciousUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAnomalyReport = async () => {
        try {
            const response = await api.get('/admin/anomaly-report');
            if (response.data.success) {
                setUsers(response.data.data.users);
            }
        } catch (error) {
            console.error("Failed to fetch anomaly report", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnomalyReport();
        const interval = setInterval(fetchAnomalyReport, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading && users.length === 0) return null;

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="mr-2">🚨</span>
                <span className="text-gray-200">Suspicious Activity</span>
                {users.length > 0 && (
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs border border-red-500/30">
                        {users.length} Users Detected
                    </span>
                )}
            </h2>

            {users.length === 0 ? (
                <div className="flex items-center text-emerald-400 bg-emerald-900/10 p-4 rounded-lg border border-emerald-900/20">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    No suspicious activity detected
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 text-sm border-b border-gray-700">
                                <th className="pb-3 font-medium">User ID</th>
                                <th className="pb-3 font-medium">Risk Score</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium text-right">Exec (60s)</th>
                                <th className="pb-3 font-medium text-right">Restart (60s)</th>
                                <th className="pb-3 font-medium text-right">Create (60s)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {users.map((user) => (
                                <tr key={user.userId} className="text-sm">
                                    <td className="py-3 font-mono text-gray-300">{user.userId}</td>
                                    <td className="py-3">
                                        <div className="w-24">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-400">Score</span>
                                                <span className={user.anomalyScore >= 0.7 ? "text-red-400 font-bold" : "text-orange-400 font-bold"}>
                                                    {user.anomalyScore.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${user.anomalyScore >= 0.7 ? "bg-red-500" : "bg-orange-500"}`}
                                                    style={{ width: `${user.anomalyScore * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        {user.isSuspicious ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-800/50">
                                                Suspicious
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-800/50">
                                                At Risk
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 text-right text-gray-300">{user.execCountLastMinute}</td>
                                    <td className="py-3 text-right text-gray-300">{user.restartCountLastMinute}</td>
                                    <td className="py-3 text-right text-gray-300">{user.containerCreateCountLastMinute}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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
