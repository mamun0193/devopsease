import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';

export default function RepositoryArtifactStudioPage() {
    const { repoId } = useParams();
    const navigate = useNavigate();
    
    const [bundle, setBundle] = useState<any>(null);
    const [revision, setRevision] = useState<any>(null);
    const [preview, setPreview] = useState<any>(null);
    
    const [selectedFile, setSelectedFile] = useState<string>('docker-compose.yml');
    const [editorContent, setEditorContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchArtifacts();
    }, [repoId]);

    const fetchArtifacts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/system/artifacts/${repoId}`);
            const data = await res.json();
            if (data.success) {
                setBundle(data.data.bundle);
                setRevision(data.data.revision);
                setPreview(data.data.preview);
                // default select compose
                setEditorContent(data.data.revision.editedArtifacts?.compose?.content || data.data.bundle.compose?.content || '');
            }
        } catch (err) {
            console.error('Failed to load artifacts', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const updatedCompose = {
                compose: {
                    ...bundle.compose,
                    content: editorContent
                }
            };
            const res = await fetch(`/api/system/artifacts/${bundle._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ editedArtifacts: updatedCompose })
            });
            const data = await res.json();
            if (data.success) {
                setRevision(data.data.revision);
                setPreview(data.data.preview);
            }
        } catch (err) {
            console.error('Failed to save artifact revision', err);
        }
    };

    const handleApprove = async () => {
        try {
            const res = await fetch(`/api/system/artifacts/${revision._id}/approve`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setRevision(data.data);
            }
        } catch (err) {
            console.error('Failed to approve artifact revision', err);
        }
    };

    const handleDeploy = async () => {
        try {
            const res = await fetch(`/api/deployments/execute/${revision._id}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                navigate(`/deployments/${data.data.deploymentId}`);
            }
        } catch (err) {
            console.error('Failed to start deployment', err);
        }
    };

    if (loading) return <div>Loading Artifact Studio...</div>;

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 p-4 border-r border-gray-700 flex flex-col">
                <h2 className="text-xl font-bold mb-4">Artifacts</h2>
                <div 
                    className={`cursor-pointer p-2 rounded ${selectedFile === 'docker-compose.yml' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    onClick={() => setSelectedFile('docker-compose.yml')}
                >
                    docker-compose.yml
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col">
                {/* Topbar */}
                <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
                    <div>
                        <span className="font-semibold text-lg">{selectedFile}</span>
                        <span className="ml-4 text-sm text-gray-400">
                            Status: <span className="text-white bg-gray-700 px-2 py-1 rounded">{revision?.approvalStatus}</span>
                        </span>
                    </div>
                    <div className="space-x-3">
                        <button onClick={handleSave} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">Save Edit</button>
                        {revision?.approvalStatus !== 'APPROVED' && (
                            <button onClick={handleApprove} className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded">Approve</button>
                        )}
                        {revision?.approvalStatus === 'APPROVED' && (
                            <button onClick={handleDeploy} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold">Deploy Now</button>
                        )}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1">
                    <Editor
                        height="100%"
                        language="yaml"
                        theme="vs-dark"
                        value={editorContent}
                        onChange={(val) => setEditorContent(val || '')}
                        options={{ minimap: { enabled: false } }}
                    />
                </div>
            </div>

            {/* Right Sidebar - Validation & Preview */}
            <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Validation Report</h3>
                <div className="mb-6 space-y-2">
                    <div className="flex justify-between">
                        <span>Readiness Score:</span>
                        <span className={revision?.readinessScore >= 80 ? 'text-green-400' : 'text-yellow-400'}>
                            {revision?.readinessScore}%
                        </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-2">
                        {revision?.validationResult?.scores && Object.entries(revision.validationResult.scores).map(([key, score]) => (
                            <div key={key} className="flex justify-between">
                                <span className="capitalize">{key}:</span>
                                <span>{score as number}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {revision?.warnings?.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-yellow-400 font-semibold mb-2">Warnings ({revision.warnings.length})</h4>
                        <ul className="text-sm text-gray-300 list-disc pl-4 space-y-1">
                            {revision.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                )}

                <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Deployment Preview</h3>
                {preview && (
                    <div className="text-sm text-gray-300 space-y-4">
                        <div>
                            <span className="font-semibold block text-white">Services:</span>
                            {preview.services.join(', ')}
                        </div>
                        <div>
                            <span className="font-semibold block text-white">Resource Estimates:</span>
                            CPU: {preview.resourceEstimates.cpu} <br />
                            Mem: {preview.resourceEstimates.memory}
                        </div>
                        <div>
                            <span className="font-semibold block text-white">Cost Estimation:</span>
                            {preview.costEstimation.totalMonthly} {preview.costEstimation.currency} / mo
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
