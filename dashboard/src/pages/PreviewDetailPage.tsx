import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Clock, Server, TerminalSquare, AlertTriangle, ShieldAlert, GitBranch, ArrowLeft } from 'lucide-react';
import { previewApi } from '../api';
import { format } from 'date-fns';

const PreviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [extensionMinutes, setExtensionMinutes] = useState(60);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: preview, isLoading } = useQuery({
    queryKey: ['preview', id],
    queryFn: () => previewApi.getPreview(id!),
    enabled: !!id
  });

  const { data: events } = useQuery({
    queryKey: ['preview-events', id],
    queryFn: () => previewApi.getEvents(id!),
    enabled: !!id
  });

  const extendMutation = useMutation({
    mutationFn: () => previewApi.extendPreview(id!, extensionMinutes),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['preview', id] });
      queryClient.invalidateQueries({ queryKey: ['preview-events', id] });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to extend preview');
    }
  });

  const destroyMutation = useMutation({
    mutationFn: () => previewApi.destroyPreview(id!, 'Manual destruction via UI'),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['preview', id] });
      queryClient.invalidateQueries({ queryKey: ['preview-events', id] });
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message || err?.message || 'Failed to destroy preview');
    }
  });

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!preview) return <div className="p-6 text-gray-400">Preview not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/previews" className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {preview.slug}
          </h1>
          <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
            <GitBranch className="w-4 h-4" /> {preview.manifest?.branch} | {preview.manifest?.commitSha?.substring(0, 7)}
          </p>
        </div>
        <div className="ml-auto flex gap-3">
          {preview.status === 'ready' && preview.targets?.[0]?.url && (
            <a 
              href={preview.targets[0].url} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" /> Open App
            </a>
          )}
          {['ready', 'creating', 'deploying', 'failed'].includes(preview.status) && (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to destroy this preview environment?')) destroyMutation.mutate();
              }}
              disabled={destroyMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-medium text-sm border border-red-500/20"
            >
              <AlertTriangle className="w-4 h-4" /> Destroy
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-400">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-[#151515] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Environment Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">Status</span>
                <span className="text-gray-200 capitalize">{preview.status}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Repository</span>
                <span className="text-gray-200">{preview.repositoryId?.name}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Created</span>
                <span className="text-gray-200">{format(new Date(preview.createdAt), 'PPpp')}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Expires</span>
                <span className="text-gray-200">{preview.status === 'ready' ? format(new Date(preview.expiresAt), 'PPpp') : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bg-[#151515] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TerminalSquare className="w-5 h-5" /> Timeline
            </h2>
            <div className="space-y-4">
              {events?.map((ev) => (
                <div key={ev._id} className="flex gap-4 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                  <div className="mt-1">
                    <ShieldAlert className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-300">{ev.decision}</span>
                      <span className="text-xs text-gray-600">{format(new Date(ev.createdAt), 'HH:mm:ss')}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{ev.reason}</p>
                    <div className="text-xs text-gray-500 mt-2 flex gap-3">
                      <span>Actor: {ev.actor}</span>
                      <span>Trigger: {ev.trigger}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Extension Card */}
          {preview.status === 'ready' && (
            <div className="bg-[#151515] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Extend Lifetime
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Extensions used: {preview.extensionCount}</p>
                <select 
                  value={extensionMinutes} 
                  onChange={e => setExtensionMinutes(Number(e.target.value))}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value={30}>+30 Minutes</option>
                  <option value={60}>+1 Hour</option>
                  <option value={120}>+2 Hours</option>
                  <option value={240}>+4 Hours</option>
                </select>
              </div>
              <button 
                onClick={() => extendMutation.mutate()}
                disabled={extendMutation.isPending}
                className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Extend Preview
              </button>
            </div>
          )}

          {/* Targets Card */}
          <div className="bg-[#151515] border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" /> Targets
            </h2>
            {preview.targets?.map((target, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded-lg text-sm">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-300">{target.name}</span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 rounded-full">{target.status}</span>
                </div>
                <div className="text-gray-500">Port: {target.port || 'N/A'}</div>
              </div>
            ))}
            {(!preview.targets || preview.targets.length === 0) && (
              <div className="text-sm text-gray-500 text-center py-4">No targets active</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewDetailPage;
