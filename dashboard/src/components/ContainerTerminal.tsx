import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { X, Terminal as TerminalIcon, ChevronDown, Minimize2, Maximize2, RefreshCw, AlertTriangle, Power, Clock } from 'lucide-react';
import { buildWsUrl } from '../config';

interface ContainerTerminalProps {
    containerId: string;
    containerName: string;
    onClose: () => void;
}

interface Toast {
    id: number;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'terminated';

interface TerminationInfo {
    reason: string;
    message: string;
}

const REASON_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
    idle_timeout: { label: 'Idle Timeout', icon: '⏱', color: 'text-amber-400' },
    container_stopped: { label: 'Container Stopped', icon: '⏹', color: 'text-red-400' },
    container_removed: { label: 'Container Removed', icon: '🗑', color: 'text-red-400' },
    container_paused: { label: 'Container Paused', icon: '⏸', color: 'text-yellow-400' },
    container_restarted: { label: 'Container Restarted', icon: '🔄', color: 'text-blue-400' },
    server_shutdown: { label: 'Server Shutdown', icon: '🔌', color: 'text-red-400' },
    manual_termination: { label: 'Manually Terminated', icon: '✋', color: 'text-slate-400' },
    stream_ended: { label: 'Shell Exited', icon: '⏹', color: 'text-slate-400' },
    client_disconnected: { label: 'Disconnected', icon: '🔌', color: 'text-slate-400' },
};

const ContainerTerminal: React.FC<ContainerTerminalProps> = ({
    containerId,
    containerName,
    onClose,
}) => {
    const [reconnectKey, setReconnectKey] = useState(0);

    return (
        <TerminalContent
            key={reconnectKey}
            containerId={containerId}
            containerName={containerName}
            onClose={onClose}
            onReconnect={() => setReconnectKey(prev => prev + 1)}
        />
    );
};

interface TerminalContentProps extends ContainerTerminalProps {
    onReconnect: () => void;
}

const TerminalContent: React.FC<TerminalContentProps> = ({
    containerId,
    containerName,
    onClose,
    onReconnect,
}) => {
    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [shellType, setShellType] = useState<string>('bash');
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [terminationInfo, setTerminationInfo] = useState<TerminationInfo | null>(null);
    const [idleCountdown, setIdleCountdown] = useState<number | null>(null);
    const resizeTimeoutRef = useRef<number | null>(null);
    const isUserScrollingRef = useRef(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const toastIdRef = useRef(0);
    const idleTimerRef = useRef<number | null>(null);
    const lastIORef = useRef<number>(Date.now());

    const hasConnectedRef = useRef(false);
    const connectionToastShownRef = useRef(false);
    const errorTimeoutRef = useRef<number | null>(null);

    // Idle timeout (5 minutes) — must match backend EXEC_IDLE_TIMEOUT_MS
    const IDLE_TIMEOUT_MS = 300000;
    const COUNTDOWN_THRESHOLD = 60;

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    // Idle countdown timer
    const resetIdleTracking = useCallback(() => {
        lastIORef.current = Date.now();
        setIdleCountdown(null);
    }, []);

    useEffect(() => {
        if (status !== 'connected') {
            setIdleCountdown(null);
            return;
        }

        const interval = window.setInterval(() => {
            const elapsed = Date.now() - lastIORef.current;
            const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));

            if (remaining <= COUNTDOWN_THRESHOLD) {
                setIdleCountdown(remaining);
            } else {
                setIdleCountdown(null);
            }
        }, 1000);

        idleTimerRef.current = interval;

        return () => {
            window.clearInterval(interval);
            idleTimerRef.current = null;
        };
    }, [status, IDLE_TIMEOUT_MS]);

    const checkScrollPosition = useCallback(() => {
        const term = xtermRef.current;
        if (!term) return;

        const buffer = term.buffer.active;
        const viewportY = buffer.viewportY;
        const baseY = buffer.baseY;
        const scrolledUp = viewportY < baseY;
        setIsScrolledUp(scrolledUp);
        isUserScrollingRef.current = scrolledUp;
    }, []);

    const scrollToBottom = useCallback(() => {
        const term = xtermRef.current;
        if (!term || !fitAddonRef.current) return;
        try {
            term.scrollToBottom();
        } catch (_) { /* terminal may be disposed */ }
        setIsScrolledUp(false);
        isUserScrollingRef.current = false;
    }, []);

    const preventScrollPropagation = useCallback((e: WheelEvent) => {
        const viewport = terminalRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
        if (!viewport) return;

        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const atTop = scrollTop === 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight;

        if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
            e.preventDefault();
        }
        e.stopPropagation();
    }, []);

    const preventModalScroll = useCallback((e: React.WheelEvent | React.TouchEvent) => {
        const target = e.target as HTMLElement;
        const isTerminalViewport = target.closest('.xterm-viewport');
        if (!isTerminalViewport) {
            e.preventDefault();
        }
    }, []);

    useEffect(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            lineHeight: 1.2,
            letterSpacing: 0,
            fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
            scrollback: 5000,
            scrollSensitivity: 1,
            fastScrollSensitivity: 3,
            theme: {
                background: '#0c1222',
                foreground: '#e2e8f0',
                cursor: '#60a5fa',
                cursorAccent: '#0c1222',
                selectionBackground: 'rgba(96, 165, 250, 0.4)',
                selectionForeground: '#ffffff',
                black: '#1e293b',
                red: '#f87171',
                green: '#4ade80',
                yellow: '#fbbf24',
                blue: '#60a5fa',
                magenta: '#c084fc',
                cyan: '#22d3ee',
                white: '#f1f5f9',
                brightBlack: '#475569',
                brightRed: '#fca5a5',
                brightGreen: '#86efac',
                brightYellow: '#fde047',
                brightBlue: '#93c5fd',
                brightMagenta: '#d8b4fe',
                brightCyan: '#67e8f9',
                brightWhite: '#ffffff',
            },
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);

        const setupViewport = () => {
            const viewport = terminalRef.current?.querySelector('.xterm-viewport') as HTMLElement | null;
            if (viewport) {
                viewport.style.overflowY = 'scroll';
                viewport.style.overflowX = 'hidden';
                viewport.style.setProperty('scrollbar-width', 'auto', 'important');
                viewport.style.setProperty('scrollbar-color', '#64748b #0f172a', 'important');
                viewport.style.height = '100%';
            }

            const screen = terminalRef.current?.querySelector('.xterm-screen') as HTMLElement | null;
            if (screen) {
                screen.style.height = '100%';
            }
        };

        setupViewport();
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        requestAnimationFrame(() => {
            setupViewport();
            fitAddon.fit();
        });

        setTimeout(() => term.focus(), 100);

        const terminalElement = terminalRef.current;
        const handleClick = () => term.focus();
        terminalElement.addEventListener('click', handleClick);

        terminalElement.addEventListener('wheel', preventScrollPropagation, { passive: false });

        term.onScroll(() => {
            checkScrollPosition();
        });

        // Defer WS creation so React StrictMode cleanup cancels it before any WS opens
        const wsConnectTimer = window.setTimeout(() => {
            const ws = new WebSocket(buildWsUrl(`/ws/exec/${containerId}`));
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connecting');
                term.writeln('\x1b[38;5;244m→ Connecting to container...\x1b[0m');
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    switch (message.type) {
                        case 'connected': {
                            if (errorTimeoutRef.current) {
                                clearTimeout(errorTimeoutRef.current);
                                errorTimeoutRef.current = null;
                            }

                            hasConnectedRef.current = true;
                            setStatus('connected');
                            resetIdleTracking();
                            const shellMatch = message.message.match(/\(([^)]+)\)/);
                            if (shellMatch) {
                                setShellType(shellMatch[1]);
                            }
                            term.writeln(`\x1b[38;5;82m✓ ${message.message}\x1b[0m`);
                            term.writeln('');

                            if (!connectionToastShownRef.current) {
                                connectionToastShownRef.current = true;
                                showToast('Live container shell active', 'warning');
                            }

                            if (fitAddonRef.current && xtermRef.current) {
                                fitAddonRef.current.fit();
                                const { cols, rows } = xtermRef.current;
                                ws.send(JSON.stringify({ type: 'resize', cols, rows }));
                            }

                            scrollToBottom();
                            break;
                        }

                        case 'output':
                            resetIdleTracking();
                            term.write(message.data);
                            if (!isUserScrollingRef.current) {
                                requestAnimationFrame(() => {
                                    xtermRef.current?.scrollToBottom();
                                });
                            }
                            break;

                        case 'session_terminated': {
                            setStatus('terminated');
                            const reasonInfo = REASON_DISPLAY[message.reason] || { label: message.reason, icon: '⚠', color: 'text-amber-400' };
                            setTerminationInfo({
                                reason: message.reason,
                                message: message.message || reasonInfo.label,
                            });

                            // Disable terminal input
                            term.options.disableStdin = true;

                            term.writeln('');
                            term.writeln(`\x1b[38;5;196m${reasonInfo.icon} ${message.message || reasonInfo.label}\x1b[0m`);

                            if (hasConnectedRef.current) {
                                showToast(message.message || reasonInfo.label, 'error');
                            }
                            scrollToBottom();
                            break;
                        }

                        case 'error':
                            setStatus('error');
                            term.writeln(`\x1b[38;5;196m✗ Error: ${message.message}\x1b[0m`);
                            if (!hasConnectedRef.current) {
                                showToast(`Error: ${message.message}`, 'error');
                            }
                            scrollToBottom();
                            break;

                        case 'disconnected':
                            setStatus('disconnected');
                            term.writeln('');
                            term.writeln(`\x1b[38;5;220m⚠ ${message.message}\x1b[0m`);
                            term.options.disableStdin = true;
                            if (hasConnectedRef.current && connectionToastShownRef.current) {
                                showToast('Session ended', 'info');
                            }
                            scrollToBottom();
                            break;
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onerror = () => {
                errorTimeoutRef.current = window.setTimeout(() => {
                    if (!hasConnectedRef.current) {
                        setStatus('error');
                        term.writeln('\x1b[38;5;196m✗ Connection error\x1b[0m');
                        showToast('Connection error', 'error');
                        scrollToBottom();
                    }
                }, 100);
            };

            ws.onclose = () => {
                if (errorTimeoutRef.current) {
                    clearTimeout(errorTimeoutRef.current);
                    errorTimeoutRef.current = null;
                }

                if (status !== 'error' && status !== 'disconnected' && status !== 'terminated') {
                    setStatus('disconnected');
                    try {
                        if (xtermRef.current) {
                            term.writeln('');
                            term.writeln('\x1b[38;5;220m⚠ Connection closed\x1b[0m');
                            term.options.disableStdin = true;
                        }
                    } catch (_) { /* terminal may be disposed */ }
                    scrollToBottom();
                }
            };
        }, 0); // end deferred WS creation

        const disposable = term.onData((data) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'input', data }));
                resetIdleTracking();
            }
        });

        // Resize handling
        const handleResize = () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            resizeTimeoutRef.current = window.setTimeout(() => {
                if (fitAddonRef.current && xtermRef.current) {
                    try {
                        fitAddonRef.current.fit();
                        setupViewport();
                        if (wsRef.current?.readyState === WebSocket.OPEN) {
                            const { cols, rows } = xtermRef.current;
                            wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
                        }
                    } catch (error) {
                        console.error('Error resizing terminal:', error);
                    }
                }
            }, 50);
        };

        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        if (terminalContainerRef.current) {
            resizeObserver.observe(terminalContainerRef.current);
        }

        return () => {
            clearTimeout(wsConnectTimer);
            disposable.dispose();
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
            terminalElement.removeEventListener('click', handleClick);
            terminalElement.removeEventListener('wheel', preventScrollPropagation);

            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            const currentWs = wsRef.current;
            if (currentWs && (currentWs.readyState === WebSocket.OPEN || currentWs.readyState === WebSocket.CONNECTING)) {
                currentWs.close();
            }
            wsRef.current = null;

            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }

            hasConnectedRef.current = false;
            connectionToastShownRef.current = false;

            xtermRef.current = null;
            fitAddonRef.current = null;
            term.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId]);

    const handleTerminate = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'terminate' }));
        }
    };

    const handleCloseRequest = () => {
        if (status === 'connected') {
            setShowCloseConfirm(true);
        } else {
            handleDisconnect();
        }
    };

    const handleDisconnect = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.close();
        }
        onClose();
    };

    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'bg-emerald-500';
            case 'connecting': return 'bg-amber-500 animate-pulse';
            case 'disconnected': return 'bg-slate-500';
            case 'terminated': return 'bg-red-500';
            case 'error': return 'bg-red-500';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connected': return 'Connected';
            case 'connecting': return 'Connecting...';
            case 'disconnected': return 'Disconnected';
            case 'terminated': return 'Terminated';
            case 'error': return 'Error';
        }
    };

    const getToastColor = (type: Toast['type']) => {
        switch (type) {
            case 'success': return 'bg-emerald-600 text-white';
            case 'error': return 'bg-red-600 text-white';
            case 'warning': return 'bg-amber-600 text-white';
            case 'info': return 'bg-blue-600 text-white';
        }
    };

    const handleMaximize = () => {
        setIsMinimized(false);
        requestAnimationFrame(() => {
            xtermRef.current?.focus();
            fitAddonRef.current?.fit();
            if (wsRef.current?.readyState === WebSocket.OPEN && xtermRef.current) {
                const { cols, rows } = xtermRef.current;
                wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
            }
        });
    };


    return (
        <>
            {/* MINIMIZED BAR */}
            <div
                className="fixed bottom-4 right-4 z-50 transition-all duration-200"
                style={{
                    opacity: isMinimized ? 1 : 0,
                    pointerEvents: isMinimized ? 'auto' : 'none',
                    transform: isMinimized ? 'translateY(0)' : 'translateY(20px)',
                }}
            >
                <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-700 min-w-[280px]">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <TerminalIcon size={18} className="text-blue-400" />
                            <div>
                                <p className="text-sm font-medium text-slate-100">{containerName}</p>
                                <p className="text-xs text-slate-400">{shellType}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                            {idleCountdown !== null && status === 'connected' && (
                                <span className="text-xs text-amber-400 font-mono">{idleCountdown}s</span>
                            )}
                            <button
                                onClick={handleMaximize}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                                title="Maximize"
                            >
                                <Maximize2 size={16} />
                            </button>
                            <button
                                onClick={handleCloseRequest}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            <div
                className="terminal-modal fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200"
                style={{
                    overflow: 'hidden',
                    opacity: isMinimized ? 0 : 1,
                    visibility: isMinimized ? 'hidden' : 'visible',
                    pointerEvents: isMinimized ? 'none' : 'auto',
                }}
                onWheel={preventModalScroll}
                onTouchMove={preventModalScroll}
            >
                <div
                    className="terminal-modal-content bg-slate-900 rounded-xl shadow-2xl w-[90%] border border-slate-700/80 flex flex-col"
                    style={{
                        height: 'min(85vh, 700px)',
                        maxHeight: '85vh',
                        overflow: 'hidden',
                    }}
                >
                    {/* HEADER */}
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-slate-800/60 shrink-0"
                        style={{ height: '56px', minHeight: '56px' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="ml-2">
                                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                                    <TerminalIcon size={16} className="text-blue-400" />
                                    {containerName}
                                    {status === 'connected' && shellType && (
                                        <span className="text-xs font-normal text-slate-500">({shellType})</span>
                                    )}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Idle countdown indicator */}
                            {idleCountdown !== null && status === 'connected' && (
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${idleCountdown <= 30
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    }`}>
                                    <Clock size={12} />
                                    <span className="text-xs font-mono">{idleCountdown}s</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50">
                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
                                <span className="text-xs text-slate-400">{getStatusText()}</span>
                            </div>

                            {/* Terminate Session button */}
                            {status === 'connected' && (
                                <button
                                    onClick={handleTerminate}
                                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-red-400/60 hover:text-red-400"
                                    title="Terminate Session"
                                >
                                    <Power size={16} />
                                </button>
                            )}

                            {status === 'connected' && (
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-slate-200"
                                    title="Minimize"
                                >
                                    <Minimize2 size={16} />
                                </button>
                            )}

                            <button
                                onClick={handleCloseRequest}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-slate-500 hover:text-red-400"
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* TERMINAL WRAPPER */}
                    <div
                        ref={terminalContainerRef}
                        className="terminal-wrapper flex-1 relative"
                        style={{
                            overflow: 'hidden',
                            minHeight: 0,
                            background: '#0c1222',
                        }}
                    >
                        <div
                            ref={terminalRef}
                            className="terminal-container absolute inset-0"
                            style={{
                                padding: '8px 4px 8px 12px',
                                background: '#0c1222',
                                overflow: 'hidden',
                            }}
                        />

                        {/* Scroll to bottom indicator */}
                        {isScrolledUp && (
                            <button
                                onClick={scrollToBottom}
                                className="absolute bottom-4 right-6 px-3 py-1.5 bg-blue-500/90 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center gap-1.5 text-xs font-medium transition-all z-10"
                                title="Scroll to bottom"
                            >
                                <ChevronDown size={14} />
                                New output
                            </button>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div
                        className="px-4 bg-slate-800/40 shrink-0 border-t border-slate-700/50 flex items-center justify-center"
                        style={{ height: '40px', minHeight: '40px' }}
                    >
                        <p className="text-[11px] text-slate-500">
                            Press{' '}
                            <kbd className="px-1.5 py-0.5 bg-slate-700/60 rounded text-[10px] font-mono text-slate-400">
                                Ctrl+D
                            </kbd>{' '}
                            or type{' '}
                            <kbd className="px-1.5 py-0.5 bg-slate-700/60 rounded text-[10px] font-mono text-slate-400">
                                exit
                            </kbd>{' '}
                            to close the shell
                        </p>
                    </div>

                </div>

                {/* TERMINATION OVERLAY */}
                {status === 'terminated' && terminationInfo && !showCloseConfirm && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
                        <div className="bg-slate-800 p-6 rounded-lg shadow-2xl border border-slate-700 flex flex-col items-center gap-4 max-w-sm text-center">
                            <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                                <Power size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-slate-100">
                                    Session Terminated
                                </h3>
                                <div className="mt-2 flex items-center justify-center gap-2">
                                    <span className={`text-sm font-medium ${REASON_DISPLAY[terminationInfo.reason]?.color || 'text-amber-400'}`}>
                                        {REASON_DISPLAY[terminationInfo.reason]?.icon || '⚠'}{' '}
                                        {REASON_DISPLAY[terminationInfo.reason]?.label || terminationInfo.reason}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 mt-1">
                                    {terminationInfo.message}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={onReconnect}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} />
                                    Reconnect
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RECONNECT OVERLAY */}
                {status === 'disconnected' && !showCloseConfirm && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
                        <div className="bg-slate-800 p-6 rounded-lg shadow-2xl border border-slate-700 flex flex-col items-center gap-4 max-w-sm text-center">
                            <div className="p-3 rounded-full bg-slate-700 text-slate-400">
                                <TerminalIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-slate-100">
                                    Session Ended
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    The terminal connection has been closed.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={onReconnect}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} />
                                    Reconnect
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ERROR OVERLAY */}
                {status === 'error' && !showCloseConfirm && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
                        <div className="bg-slate-800 p-6 rounded-lg shadow-2xl border border-slate-700 flex flex-col items-center gap-4 max-w-sm text-center">
                            <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-slate-100">Connection Error</h3>
                                <p className="text-sm text-slate-400 mt-1">Failed to connect to container.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={onReconnect}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} />
                                    Reconnect
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONFIRM CLOSE OVERLAY */}
                {showCloseConfirm && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/80 backdrop-blur-[4px]">
                        <div className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-4 max-w-sm w-full animate-in zoom-in-95 duration-200">
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-amber-500/10 rounded-full shrink-0">
                                    <AlertTriangle size={20} className="text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-semibold text-slate-100">Close Terminal?</h3>
                                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                        This will disconnect the active session. Any running commands in the foreground will be terminated.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 justify-end">
                                <button
                                    onClick={() => setShowCloseConfirm(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-500/20 transition-all hover:translate-y-[-1px]"
                                >
                                    Close Terminal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`${getToastColor(toast.type)} px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm`}
                    >
                        <span className="flex-1">{toast.message}</span>
                        <button
                            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                            className="shrink-0 hover:opacity-80 transition-opacity"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
};

export default ContainerTerminal;
