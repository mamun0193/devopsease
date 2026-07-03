import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, ExternalLink, Settings, Clock, Server } from 'lucide-react';
import { previewApi } from '../api';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const PreviewsPage: React.FC = () => {
  const [repoIdFilter] = useState<string>('');

  const { data: previews, isLoading } = useQuery({
    queryKey: ['previews', repoIdFilter],
    queryFn: () => previewApi.listPreviews(repoIdFilter || undefined),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded-full border border-green-500/20">Ready</span>;
      case 'deploying':
      case 'creating':
      case 'preparing':
        return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded-full border border-blue-500/20 animate-pulse">Building</span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded-full border border-red-500/20">Failed</span>;
      case 'expired':
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded-full border border-yellow-500/20">Expired</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/10 text-gray-500 text-xs rounded-full border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="w-6 h-6 text-indigo-500" />
            Preview Environments
          </h1>
          <p className="text-gray-400 text-sm mt-1">Ephemeral environments for testing pull requests and branches</p>
        </div>
      </div>

      <div className="bg-[#151515] rounded-xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading previews...</div>
        ) : previews?.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No preview environments found</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-white/10 text-sm text-gray-400">
                <th className="p-4 font-medium">Environment</th>
                <th className="p-4 font-medium">Repository</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Expires In</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {previews?.map((preview) => (
                <tr key={preview._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Server className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <Link to={`/previews/${preview._id}`} className="font-medium text-blue-400 hover:underline">
                          {preview.slug}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1">
                          Branch: {preview.manifest?.branch}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-gray-300">{preview.repositoryId?.name || 'Unknown Repo'}</span>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(preview.status)}
                  </td>
                  <td className="p-4 text-sm text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {preview.status === 'ready' ? formatDistanceToNow(new Date(preview.expiresAt)) : 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {preview.targets?.[0]?.url && preview.status === 'ready' && (
                        <a href={preview.targets[0].url} target="_blank" rel="noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white" title="Open Preview">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <Link to={`/previews/policies/${preview.repositoryId?._id}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white" title="Policy Settings">
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PreviewsPage;
