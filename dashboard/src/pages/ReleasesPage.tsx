import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Box, Activity, AlertTriangle, Search, Filter, ShieldAlert } from 'lucide-react';
import { useReleases } from '../hooks/useReleases';
import StatusBadge from '../components/StatusBadge';

const ReleasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: releases, isLoading, error } = useReleases();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-700 border-t-purple-500" />
          <p>Loading Releases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center mt-6 mx-6">
        <ShieldAlert className="mx-auto size-10 text-red-500 mb-3" />
        <h3 className="font-medium text-red-500">Failed to load releases</h3>
        <p className="mt-1 text-sm text-red-400">Please try again later. {error.message}</p>
      </div>
    );
  }

  const activeReleases = releases?.filter(r => r.status === 'Active') || [];
  const draftReleases = releases?.filter(r => r.status === 'Draft') || [];
  const failedReleases = releases?.filter(r => r.status === 'RolledBack') || [];
  
  const filteredReleases = releases?.filter(r => 
    r.version.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r._id.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
      <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Activity size={24} className="text-dds-text-primary" />
                <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Releases</h1>
              </div>
              <p className="text-sm text-dds-text-secondary mt-1">Manage and orchestrate application releases.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-dds-green/10 p-2 text-dds-green">
                  <PlayCircle className="size-5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-dds-text-secondary">Active</p>
                  <p className="text-2xl font-semibold text-dds-text-primary">{activeReleases.length}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-dds-text-muted/20 p-2 text-dds-text-secondary">
                  <Box className="size-5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-dds-text-secondary">Drafts</p>
                  <p className="text-2xl font-semibold text-dds-text-primary">{draftReleases.length}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-dds-red/10 p-2 text-dds-red">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-dds-text-secondary">Rolled Back</p>
                  <p className="text-2xl font-semibold text-dds-text-primary">{failedReleases.length}</p>
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-dds-primary/10 p-2 text-dds-primary">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-dds-text-secondary">Total Releases</p>
                  <p className="text-2xl font-semibold text-dds-text-primary">{releases?.length || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dds-text-muted" />
              <input
                type="text"
                placeholder="Search releases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <button className="btn-secondary flex items-center gap-2">
              <Filter size={14} />
              Filter
            </button>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-dds-border bg-dds-muted/50">
                  <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Version</th>
                  <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Application</th>
                  <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider">Created</th>
                  <th className="py-3 px-4 text-[11px] font-mono text-dds-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReleases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-dds-text-muted text-[13px]">
                      No releases found.
                    </td>
                  </tr>
                ) : (
                  filteredReleases.map((release) => (
                    <tr key={release._id} className="group border-b border-dds-border last:border-0 hover:bg-dds-muted/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-[13px] font-medium text-dds-text-primary">
                        v{release.version}
                      </td>
                      <td className="py-3 px-4 font-mono text-[13px] text-dds-text-secondary">
                        {release.applicationId}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={release.status as any} />
                      </td>
                      <td className="py-3 px-4 text-[12px] font-mono text-dds-text-secondary">
                        {new Date(release.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/releases/${release._id}`)}
                          className="btn-secondary py-1 px-3 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReleasesPage;
