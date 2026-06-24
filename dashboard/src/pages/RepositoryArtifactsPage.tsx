import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { systemApi } from '../api';
import { Box, Code, Copy, Download, GitCommit, ShieldAlert, Cpu, AlertTriangle } from 'lucide-react';
import Editor from '@monaco-editor/react';

const fetchArtifacts = async (repoId: string) => {
    return await systemApi.getArtifacts(repoId);
};

export default function RepositoryArtifactsPage() {
    const { repoId } = useParams();
    const [activeTab, setActiveTab] = useState('docker');

    const { data: artifacts, isLoading, error } = useQuery({
        queryKey: ['artifacts', repoId],
        queryFn: () => fetchArtifacts(repoId as string),
        enabled: !!repoId,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !artifacts) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px] text-destructive">
                <ShieldAlert className="w-8 h-8 mr-2" />
                Failed to load generated artifacts.
            </div>
        );
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast notification here
    };

    const downloadFile = (filename: string, content: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Deployment Artifacts</h1>
                    <p className="text-muted-foreground mt-2 flex items-center gap-2">
                        <GitCommit className="w-4 h-4" />
                        Blueprint ID: {artifacts.blueprintId} • Version {artifacts.blueprintVersion}
                    </p>
                </div>
                {artifacts.costEstimate?.totalMonthly > 0 && (
                    <div className="bg-secondary/50 border border-border/50 px-4 py-2 rounded-xl flex flex-col items-end">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estimated Cost</span>
                        <div className="flex items-center text-xl font-bold">
                            <span className="text-primary mr-1">$</span>
                            {artifacts.costEstimate.totalMonthly.toFixed(2)}
                            <span className="text-sm text-muted-foreground font-normal ml-1">/ mo</span>
                        </div>
                    </div>
                )}
            </div>

            {artifacts.warnings && artifacts.warnings.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center text-destructive font-semibold">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Generator Warnings & Assumptions
                    </div>
                    <ul className="list-disc pl-5 text-sm text-destructive/80 space-y-1">
                        {artifacts.warnings.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex gap-6">
                {/* Sidebar Navigation */}
                <div className="w-64 flex-shrink-0 space-y-1 bg-card border border-border/50 rounded-xl p-2 shadow-sm">
                    <button
                        onClick={() => setActiveTab('docker')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'docker' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                        <Box className="w-4 h-4" /> Docker
                    </button>
                    <button
                        onClick={() => setActiveTab('compose')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'compose' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                        <LayersIcon active={activeTab === 'compose'} /> Compose
                    </button>
                    <button
                        onClick={() => setActiveTab('kubernetes')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'kubernetes' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                        <Cpu className="w-4 h-4" /> Kubernetes
                    </button>
                    <button
                        onClick={() => setActiveTab('pipeline')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'pipeline' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                        <Code className="w-4 h-4" /> CI/CD Pipeline
                    </button>
                    <button
                        onClick={() => setActiveTab('environment')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'environment' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                        <FileIcon active={activeTab === 'environment'} /> Environment
                    </button>
                    <button
                        onClick={() => setActiveTab('proxy')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'proxy' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                    >
                        <GlobeIcon active={activeTab === 'proxy'} /> Reverse Proxy
                    </button>
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    {/* Docker Tab */}
                    {activeTab === 'docker' && (
                        <div className="flex flex-col h-[600px]">
                            {artifacts.dockerfiles?.map((df: any, idx: number) => (
                                <ArtifactViewer key={idx} title={df.path} content={df.content} language="dockerfile" copyFn={copyToClipboard} dlFn={downloadFile} />
                            ))}
                            {artifacts.dockerignore?.map((di: any, idx: number) => (
                                <ArtifactViewer key={`di-${idx}`} title={di.path} content={di.content} language="plaintext" copyFn={copyToClipboard} dlFn={downloadFile} />
                            ))}
                        </div>
                    )}

                    {/* Compose Tab */}
                    {activeTab === 'compose' && (
                        <div className="flex flex-col h-[600px]">
                            {artifacts.compose?.rendered ? (
                                <ArtifactViewer title="docker-compose.yml" content={artifacts.compose.rendered} language="yaml" copyFn={copyToClipboard} dlFn={downloadFile} />
                            ) : (
                                <EmptyState message="No Compose configuration generated." />
                            )}
                        </div>
                    )}

                    {/* Kubernetes Tab */}
                    {activeTab === 'kubernetes' && (
                        <div className="flex flex-col h-[600px] overflow-y-auto">
                            {artifacts.kubernetes?.manifests?.map((m: any, idx: number) => (
                                <ArtifactViewer key={idx} title={m.path} content={m.content} language="yaml" copyFn={copyToClipboard} dlFn={downloadFile} />
                            )) || <EmptyState message="No Kubernetes manifests generated." />}
                        </div>
                    )}

                    {/* Pipeline Tab */}
                    {activeTab === 'pipeline' && (
                        <div className="flex flex-col h-[600px]">
                            {artifacts.pipeline?.rendered ? (
                                <ArtifactViewer title=".github/workflows/deploy.yml" content={artifacts.pipeline.rendered} language="yaml" copyFn={copyToClipboard} dlFn={downloadFile} />
                            ) : (
                                <EmptyState message="No Pipeline configuration generated." />
                            )}
                        </div>
                    )}

                    {/* Environment Tab */}
                    {activeTab === 'environment' && (
                        <div className="flex flex-col h-[600px]">
                            {artifacts.environment?.rendered ? (
                                <ArtifactViewer title=".env.example" content={artifacts.environment.rendered} language="plaintext" copyFn={copyToClipboard} dlFn={downloadFile} />
                            ) : (
                                <EmptyState message="No Environment variables detected." />
                            )}
                        </div>
                    )}

                    {/* Proxy Tab */}
                    {activeTab === 'proxy' && (
                        <div className="flex flex-col h-[600px]">
                            {artifacts.proxy?.rendered ? (
                                <ArtifactViewer title="nginx.conf" content={artifacts.proxy.rendered} language="plaintext" copyFn={copyToClipboard} dlFn={downloadFile} />
                            ) : (
                                <EmptyState message="No Reverse Proxy required for this configuration." />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components

function ArtifactViewer({ title, content, language, copyFn, dlFn }: { title: string, content: string, language: string, copyFn: any, dlFn: any }) {
    return (
        <div className="flex-1 flex flex-col border-b border-border/50 last:border-b-0 min-h-[300px]">
            <div className="flex justify-between items-center p-3 bg-secondary/30 border-b border-border/50">
                <span className="text-sm font-mono font-semibold">{title}</span>
                <div className="flex gap-2">
                    <button onClick={() => copyFn(content)} className="p-1.5 bg-secondary hover:bg-secondary/80 rounded border border-border/50 text-muted-foreground transition-colors" title="Copy">
                        <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => dlFn(title.split('/').pop(), content)} className="p-1.5 bg-secondary hover:bg-secondary/80 rounded border border-border/50 text-muted-foreground transition-colors" title="Download">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full bg-[#1e1e1e]">
                <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={content}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}
                />
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Box className="w-12 h-12 mb-4 opacity-20" />
            <p>{message}</p>
        </div>
    );
}

function LayersIcon({ active }: { active: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-primary' : ''}>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    )
}

function FileIcon({ active }: { active: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-primary' : ''}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    )
}

function GlobeIcon({ active }: { active: boolean }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-primary' : ''}>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
}
