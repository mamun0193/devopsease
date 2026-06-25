import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export default function DeploymentExecutionPage() {
    const { executionId } = useParams();
    
    const [execution, setExecution] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('PENDING');
    
    const wsRef = useRef<WebSocket | null>(null);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchExecution();
        setupWebSocket();

        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [executionId]);

    useEffect(() => {
        // Auto-scroll logs
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const fetchExecution = async () => {
        try {
            const res = await fetch(`/api/deployments/executions/${executionId}`);
            const data = await res.json();
            if (data.success) {
                setExecution(data.data);
                setStatus(data.data.status);
            }
            
            // fetch existing logs
            const logsRes = await fetch(`/api/deployments/executions/${executionId}/logs`);
            const logsData = await logsRes.json();
            if (logsData.success && logsData.data.logs) {
                setLogs(logsData.data.logs.split('\n'));
            }
        } catch (err) {
            console.error('Failed to fetch execution data', err);
        }
    };

    const setupWebSocket = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/executions/${executionId}`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            
            if (msg.eventType === 'log') {
                setLogs(prev => [...prev, msg.data.message.trim()]);
            } else {
                // other events like validation-started, deployment-complete
                // mapping event types to status if needed, or just relying on polling
                if (msg.eventType === 'deployment-complete') setStatus('SUCCESS');
                else if (msg.eventType === 'deployment-failed') setStatus('FAILED');
                else if (msg.eventType === 'rollback-started') setStatus('ROLLING_BACK');
                else if (msg.eventType === 'rollback-complete') setStatus('ROLLED_BACK');
            }
        };
        
        wsRef.current = ws;
    };

    const handleRollback = async () => {
        try {
            const res = await fetch(`/api/deployments/executions/${executionId}/rollback`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setStatus('ROLLING_BACK');
            }
        } catch (err) {
            console.error('Failed to start rollback', err);
        }
    };

    if (!execution) return <div>Loading Execution...</div>;

    const isFinished = ['SUCCESS', 'FAILED', 'ROLLED_BACK'].includes(status);

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center">
                        Deployment Execution
                        <span className={`ml-4 px-3 py-1 rounded text-sm font-semibold 
                            ${status === 'SUCCESS' ? 'bg-green-600' : 
                              status === 'FAILED' ? 'bg-red-600' : 
                              status === 'ROLLING_BACK' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                            {status}
                        </span>
                    </h1>
                    <p className="text-gray-400 mt-1">ID: {executionId} | Provider: {execution.provider}</p>
                </div>
                <div>
                    {isFinished && (
                        <button 
                            onClick={handleRollback} 
                            disabled={status === 'ROLLED_BACK' || status === 'ROLLING_BACK'}
                            className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 px-4 py-2 rounded font-bold text-white transition-colors"
                        >
                            Rollback Deployment
                        </button>
                    )}
                </div>
            </div>

            {/* Pipeline Stage Visualization (Simplified) */}
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded mb-6">
                {['PENDING', 'VALIDATING', 'PREPARING', 'EXECUTING', 'HEALTH_CHECKING', 'SUCCESS'].map((stage, i) => (
                    <div key={stage} className={`flex items-center ${i !== 5 ? 'flex-1' : ''}`}>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold
                            ${status === stage || (isFinished && stage === 'SUCCESS' && status === 'SUCCESS') 
                                ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                            {stage}
                        </div>
                        {i !== 5 && <div className="h-1 flex-1 bg-gray-700 mx-2"></div>}
                    </div>
                ))}
            </div>

            {/* Live Logs Terminal */}
            <div className="flex-1 bg-black rounded p-4 font-mono text-sm overflow-y-auto border border-gray-700 shadow-inner">
                {logs.length === 0 ? (
                    <span className="text-gray-500">Waiting for logs...</span>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="text-gray-300">
                            {log}
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>
            
            {/* Metadata Footer */}
            <div className="mt-4 text-xs text-gray-500 flex justify-between">
                <span>Started: {new Date(execution.startedAt).toLocaleString()}</span>
                {execution.completedAt && (
                    <span>Duration: {execution.duration}ms</span>
                )}
            </div>
        </div>
    );
}
