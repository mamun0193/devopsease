import React, { useState, useEffect } from 'react';
import { domainsApi } from '../api/domainsApi';
import type { Domain } from '../api/domainsApi';
import { applicationsApi } from '../api/applicationsApi';
import { Link } from 'react-router-dom';
import { 
  Globe, 
  Plus, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ExternalLink,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    connected: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    verified: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    pending_verification: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    verification_failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    unhealthy: 'bg-red-500/10 text-red-500 border-red-500/20',
    disconnected: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    added: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    archived: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.added}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export default function DomainsPage() {
  const dispatch = useAppDispatch();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);

  // Add Domain Form
  const [hostname, setHostname] = useState('');
  const [appId, setAppId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDomains();
  }, [page]);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const res = await domainsApi.listDomains({ page, limit: 20 });
      setDomains(res.data);
      if (res.pagination) setPagination(res.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const res = await applicationsApi.getApplications();
      setApplications(res);
    } catch (err) {
      console.error('Failed to fetch apps', err);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname || !appId) return;

    try {
      setIsSubmitting(true);
      await domainsApi.addDomain({
        hostname,
        applicationId: appId,
        type: 'custom'
      });
      setIsAddModalOpen(false);
      setHostname('');
      setAppId('');
      fetchDomains();
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Failed to add domain', type: 'error', duration: 5000 }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDomains = domains.filter(d => 
    d.hostname.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Globe className="w-6 h-6 mr-3 text-blue-400" />
            Domains & Certificates
          </h1>
          <p className="text-slate-400 text-sm">
            Manage custom domains and TLS certificates for your applications
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </button>
      </div>

      <div className="bg-[#1a1b23] rounded-xl border border-white/10 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search domains..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#13141a] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading domains...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : filteredDomains.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border-t border-white/5 bg-[#13141a]/50">
            <Globe className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No domains found</h3>
            <p className="text-slate-400 mb-6 text-sm max-w-md">
              Connect custom domains to your applications to make them accessible via custom URLs with automatically provisioned TLS certificates.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Add your first domain
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#13141a] text-xs uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="px-6 py-4 font-medium">Domain</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Certificate</th>
                  <th className="px-6 py-4 font-medium">Health</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredDomains.map((domain) => (
                  <tr key={domain._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-white flex items-center">
                            {domain.hostname}
                            {domain.type === 'preview' && (
                              <span className="ml-2 text-[10px] uppercase bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Preview</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center">
                            App ID: {typeof domain.applicationId === 'object' ? domain.applicationId?.slug || domain.applicationId?._id : domain.applicationId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={domain.status} />
                    </td>
                    <td className="px-6 py-4">
                      {domain.activeCertificate && domain.activeCertificate.status === 'installed' ? (
                        <div className="flex items-center text-emerald-400 text-xs font-medium">
                          <ShieldCheck className="w-4 h-4 mr-1.5" />
                          Secured (Expires in {formatDistanceToNow(new Date(domain.activeCertificate.expiresAt))})
                        </div>
                      ) : domain.activeCertificate ? (
                        <div className="flex items-center text-amber-400 text-xs font-medium">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {domain.activeCertificate.status}
                        </div>
                      ) : (
                        <div className="flex items-center text-slate-500 text-xs">
                          <AlertCircle className="w-4 h-4 mr-1.5" />
                          No certificate
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       {domain.healthStatus === 'HEALTHY' ? (
                          <div className="flex items-center text-emerald-400">
                             <CheckCircle2 className="w-4 h-4 mr-1.5" />
                             <span className="text-xs">Healthy</span>
                          </div>
                       ) : domain.healthStatus === 'DEGRADED' ? (
                          <div className="flex items-center text-amber-400">
                             <AlertCircle className="w-4 h-4 mr-1.5" />
                             <span className="text-xs">Degraded</span>
                          </div>
                       ) : domain.healthStatus === 'UNHEALTHY' ? (
                          <div className="flex items-center text-red-400">
                             <Activity className="w-4 h-4 mr-1.5" />
                             <span className="text-xs">Unhealthy</span>
                          </div>
                       ) : (
                          <div className="text-slate-600 text-xs">—</div>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`https://${domain.hostname}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Visit URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <Link
                          to={`/domains/${domain._id}`}
                          className="text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {!loading && !error && filteredDomains.length > 0 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#13141a]/50 text-sm text-slate-400">
             <div>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} domains
             </div>
             <div className="flex space-x-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   Previous
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   Next
                </button>
             </div>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1b23] border border-white/10 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Custom Domain</h2>
            <form onSubmit={handleAddDomain}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Hostname</label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="e.g. app.example.com"
                    className="w-full bg-[#13141a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Must be a valid fully qualified domain name.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Target Application</label>
                  <select
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="w-full bg-[#13141a] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 appearance-none"
                    required
                  >
                    <option value="">Select an application...</option>
                    {applications.map(app => (
                      <option key={app._id} value={app._id}>{app.name} ({app.slug})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !hostname || !appId}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
