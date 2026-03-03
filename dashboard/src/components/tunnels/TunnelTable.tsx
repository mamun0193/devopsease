import React from 'react';
import { Copy, Check, Loader2, ExternalLink, Ban } from 'lucide-react';
import { useRevokeTunnel } from '../../hooks/useTunnels';
import type { Tunnel } from '../../hooks/useTunnels';

function useCountdown(expiresAt: string, status: Tunnel['status'], onExpired: () => void) {
    const [remaining, setRemaining] = React.useState<number>(() =>
        Math.max(0, new Date(expiresAt).getTime() - Date.now())
    );
    const hasExpiredRef = React.useRef(false);

    React.useEffect(() => {
        if (status !== 'ACTIVE') return;

        const tick = () => {
            const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now());
            setRemaining(ms);
            if (ms === 0 && !hasExpiredRef.current) {
                hasExpiredRef.current = true;
                onExpired();
            }
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt, status, onExpired]);

    return remaining;
}

function formatCountdown(ms: number): string {
    if (ms <= 0) return 'Expired';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard access denied — silently ignore
        }
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy URL"
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors shrink-0"
        >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
    );
}


function StatusBadge({ status }: { status: Tunnel['status'] }) {
    const cls =
        status === 'ACTIVE'
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : status === 'EXPIRED'
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-slate-700/50 text-slate-400 border-slate-600/40';

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${cls}`}
        >
            {status}
        </span>
    );
}
interface TunnelRowProps {
    tunnel: Tunnel;
    onExpired: () => void;
}

const TunnelRow: React.FC<TunnelRowProps> = ({ tunnel, onExpired }) => {
    const { mutate: revoke, isPending } = useRevokeTunnel();
    const remaining = useCountdown(tunnel.expiresAt, tunnel.status, onExpired);
    const isActive = tunnel.status === 'ACTIVE';

    const countdownDisplay =
        tunnel.status === 'ACTIVE'
            ? formatCountdown(remaining)
            : tunnel.status === 'EXPIRED'
                ? 'Expired'
                : 'Revoked';

    const isUrgent = tunnel.status === 'ACTIVE' && remaining < 5 * 60 * 1000;

    return (
        <tr className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20 transition-colors">
            {/* Port */}
            <td className="px-4 py-3 text-sm font-mono text-slate-300 whitespace-nowrap">
                :{tunnel.internalPort}
            </td>

            {/* Public URL */}
            <td className="px-4 py-3 max-w-[220px]">
                {isActive ? (
                    <div className="flex items-center gap-1 min-w-0">
                        <a
                            href={tunnel.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-violet-400 hover:text-violet-300 truncate transition-colors flex items-center gap-1"
                            title={tunnel.publicUrl}
                        >
                            <ExternalLink size={11} className="shrink-0" />
                            <span className="truncate">{tunnel.publicUrl.replace(/^https?:\/\//, '')}</span>
                        </a>
                        <CopyButton text={tunnel.publicUrl} />
                    </div>
                ) : (
                    <span className="text-xs text-slate-600 font-mono italic">—</span>
                )}
            </td>

            {/* Countdown / Expires In */}
            <td className="px-4 py-3 whitespace-nowrap">
                <span
                    className={`text-xs font-mono tabular-nums ${isUrgent
                        ? 'text-amber-400 font-semibold'
                        : tunnel.status === 'ACTIVE'
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}
                >
                    {countdownDisplay}
                </span>
            </td>

            {/* Status */}
            <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge status={tunnel.status} />
            </td>

            {/* Revoke */}
            <td className="px-4 py-3 whitespace-nowrap text-right">
                <button
                    onClick={() => revoke(tunnel.id)}
                    disabled={!isActive || isPending}
                    title={isActive ? 'Revoke tunnel' : 'Cannot revoke — tunnel is no longer active'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                     text-slate-400 hover:text-red-400 hover:bg-red-500/10
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                >
                    {isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Ban size={12} />
                    )}
                    {isPending ? 'Revoking…' : 'Revoke'}
                </button>
            </td>
        </tr>
    );
};


interface TunnelTableProps {
    tunnels: Tunnel[];
    onRefetch: () => void;
}

const TunnelTable: React.FC<TunnelTableProps> = ({ tunnels, onRefetch }) => {
    if (tunnels.length === 0) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No tunnels yet. Expose a port to get started.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/40">
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Port</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Public URL</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Expires In</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Action</th>
                    </tr>
                </thead>
                <tbody className="bg-slate-900/60">
                    {tunnels.map((tunnel) => (
                        <TunnelRow key={tunnel.id} tunnel={tunnel} onExpired={onRefetch} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TunnelTable;
