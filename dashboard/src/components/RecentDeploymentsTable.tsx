import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeployments } from '../hooks/useDeployments';
import { Rocket, Clock, ExternalLink, ScrollText, GitBranch, GitCommit } from 'lucide-react';
import type { Deployment } from '../api';

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

const RecentDeploymentsTable: React.FC = () => {
  const { data: deployments = [], isLoading } = useDeployments();
  const navigate = useNavigate();

  const recent = deployments.slice(0, 8); // Show only recent 8

  if (isLoading) {
    return (
      <div className="card p-6 flex flex-col gap-4">
        <div className="h-4 w-32 bg-dds-surface border border-dds-border rounded animate-pulse" />
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-10 w-full bg-dds-surface/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-dds-border bg-dds-surface/50">
        <h3 className="text-[12px] font-semibold text-dds-white uppercase tracking-wider flex items-center gap-2">
          <Rocket size={14} className="text-dds-primary" />
          Recent Deployments
        </h3>
        <button 
          onClick={() => navigate('/deployments')}
          className="text-[11px] text-dds-text-secondary hover:text-dds-white transition-colors"
        >
          View All →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dds-bg/50 border-b border-dds-border">
              <th className="px-4 py-2 text-[10px] font-medium text-dds-text-muted uppercase tracking-wider w-[25%]">Repository</th>
              <th className="px-4 py-2 text-[10px] font-medium text-dds-text-muted uppercase tracking-wider w-[15%]">Environment</th>
              <th className="px-4 py-2 text-[10px] font-medium text-dds-text-muted uppercase tracking-wider w-[15%]">Commit</th>
              <th className="px-4 py-2 text-[10px] font-medium text-dds-text-muted uppercase tracking-wider w-[15%]">Status</th>
              <th className="px-4 py-2 text-[10px] font-medium text-dds-text-muted uppercase tracking-wider w-[15%]">Started</th>
              <th className="px-4 py-2 text-[10px] font-medium text-dds-text-muted uppercase tracking-wider w-[15%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[12px]">
            {recent.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-dds-text-muted">No recent deployments</td>
              </tr>
            ) : (
              recent.map((d: Deployment) => {
                const shortHash = d.build.commitHash ? d.build.commitHash.slice(0, 7) : '-------';
                const repoName = d.repositoryName || 'Unknown';
                return (
                  <tr key={d._id} className="border-b border-dds-border/50 hover:bg-dds-surface/80 hover:border-l-2 hover:border-l-dds-primary transition-all group">
                    <td className="px-4 py-2.5 font-medium text-dds-white">
                      <div className="flex items-center gap-2">
                        <GitBranch size={14} className="text-dds-text-muted" />
                        <span>{repoName}</span>
                        <span className="text-dds-text-muted">/</span>
                        <span className="text-dds-text-secondary font-normal">{d.build.branch}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge badge-queued">{d.environment}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-dds-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <GitCommit size={14} className="text-dds-text-muted" />
                        {shortHash}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${d.status === 'running' ? 'badge-running' : d.status === 'failed' ? 'badge-failed' : d.status === 'deploying' ? 'badge-warning' : ''}`}>
                        {d.status === 'running' && <span className="pulse-dot pulse-dot-blue mr-1" />}
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-dds-text-muted flex items-center gap-1.5">
                      <Clock size={12} /> {formatRelativeTime(d.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:text-dds-white text-dds-text-secondary transition-colors" title="View Logs">
                          <ScrollText size={14} />
                        </button>
                        {d.port && d.status === 'running' && (
                          <a href={`http://localhost:${d.port}`} target="_blank" rel="noreferrer" className="p-1 hover:text-dds-blue text-dds-text-secondary transition-colors" title="Open App">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentDeploymentsTable;
