import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { domainsApi } from '../api/domainsApi';
import { applicationsApi } from '../api/applicationsApi';
import type { Domain, DomainEvent, Certificate } from '../api/domainsApi';
import { 
  Globe, 
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Server,
  Lock,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
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

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [domain, setDomain] = useState<Domain | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [appDetails, setAppDetails] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const domainData = await domainsApi.getDomain(id!);
      setDomain(domainData);
      
      const [eventsRes, certsRes] = await Promise.all([
        domainsApi.getDomainEvents(id!, { limit: 10 }),
        domainsApi.getCertificateHistory(id!)
      ]);
      
      setEvents(eventsRes.data);
      setCertificates(certsRes);

      // Fetch app details if not populated
      const appId = typeof domainData.applicationId === 'object' ? domainData.applicationId._id : domainData.applicationId;
      try {
         const app = await applicationsApi.getApplication(appId);
         setAppDetails(app);
      } catch (e) {
         console.warn("Could not fetch app details", e);
      }

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch domain details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setIsActionLoading(true);
      await domainsApi.verifyDomain(id!);
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Verification check failed', type: 'error', duration: 5000 }));
      await fetchData(); // refresh to show error state if changed
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRetryVerification = async () => {
    try {
      setIsActionLoading(true);
      await domainsApi.retryVerification(id!);
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Failed to retry verification', type: 'error', duration: 5000 }));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRequestCertificate = async () => {
    try {
      setIsActionLoading(true);
      await domainsApi.requestCertificate(id!);
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Failed to request certificate', type: 'error', duration: 5000 }));
    } finally {
      setIsActionLoading(false);
    }
  };
  
  const handleConnect = async () => {
    try {
      setIsActionLoading(true);
      await domainsApi.connectDomain(id!);
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Failed to connect domain', type: 'error', duration: 5000 }));
    } finally {
      setIsActionLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this domain from routing?')) return;
    try {
      setIsActionLoading(true);
      await domainsApi.disconnectDomain(id!, 'User disconnected via UI');
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Failed to disconnect domain', type: 'error', duration: 5000 }));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to archive this domain? This action cannot be undone.')) return;
    try {
      setIsActionLoading(true);
      await domainsApi.archiveDomain(id!, 'User requested archival via UI');
      navigate('/domains');
    } catch (err: any) {
      dispatch(addToast({ message: err.response?.data?.message || 'Failed to delete domain', type: 'error', duration: 5000 }));
      setIsActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    dispatch(addToast({ message: 'Copied to clipboard', type: 'info', duration: 2000 }));
  };

  if (loading) return <div className="p-8 text-slate-400">Loading domain details...</div>;
  if (error || !domain) return <div className="p-8 text-red-400">{error || 'Domain not found'}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/domains')}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-bold text-white flex items-center">
                {domain.hostname}
              </h1>
              <StatusBadge status={domain.status} />
              {domain.type === 'preview' && (
                <span className="text-[10px] uppercase bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-medium border border-purple-500/30">
                  Preview Domain
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 flex items-center">
              Added {formatDistanceToNow(new Date(domain.createdAt))} ago
            </p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <a
            href={`https://${domain.hostname}`}
            target="_blank"
            rel="noreferrer"
            className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10 flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visit
          </a>
          {domain.status === 'connected' || domain.status === 'healthy' || domain.status === 'unhealthy' ? (
             <button
              onClick={handleDisconnect}
              disabled={isActionLoading}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700"
            >
              Disconnect
            </button>
          ) : domain.status === 'verified' && (
             <button
              onClick={handleConnect}
              disabled={isActionLoading}
              className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Connect Route
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isActionLoading}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          
          {/* Verification Section */}
          {(domain.status === 'pending_verification' || domain.status === 'verification_failed') && domain.verification && (
            <div className="bg-[#1a1b23] border border-amber-500/20 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-amber-500" />
                    Domain Verification Required
                  </h3>
                  <p className="text-sm text-slate-400">
                    To verify ownership, please add the following DNS record to your domain registrar.
                  </p>
                </div>
                {domain.status === 'verification_failed' && (
                  <div className="bg-red-500/10 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 font-medium">
                    Last check failed: {domain.verification.lastError}
                  </div>
                )}
              </div>
              
              <div className="bg-[#13141a] rounded-lg p-4 border border-white/5 font-mono text-sm mb-6">
                <div className="grid grid-cols-4 gap-4 mb-4 text-xs text-slate-500 uppercase tracking-wider">
                  <div>Type</div>
                  <div className="col-span-2">Name</div>
                  <div>Value</div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-white">
                  <div>TXT</div>
                  <div className="col-span-2 flex items-center">
                    _devopsease-challenge
                    <button onClick={() => copyToClipboard('_devopsease-challenge')} className="ml-2 text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                  </div>
                  <div className="flex items-center truncate">
                    <span className="truncate">{domain.verification.token}</span>
                    <button onClick={() => copyToClipboard(domain.verification.token)} className="ml-2 text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleVerify}
                  disabled={isActionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Verify Now
                </button>
                <button
                  onClick={handleRetryVerification}
                  disabled={isActionLoading}
                  className="bg-white/5 hover:bg-white/10 text-white px-5 py-2 rounded-lg text-sm transition-colors border border-white/10"
                >
                  Regenerate Token
                </button>
              </div>
            </div>
          )}

          {/* Certificate Section */}
          <div className="bg-[#1a1b23] rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-slate-400" />
                  TLS Certificate
                </h3>
                {['verified', 'connected', 'healthy', 'unhealthy'].includes(domain.status) && (
                  <button
                    onClick={handleRequestCertificate}
                    disabled={isActionLoading}
                    className="text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Request New Certificate
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {domain.activeCertificate && domain.activeCertificate.status === 'installed' ? (
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mr-4 shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Connection is secure</h4>
                    <p className="text-sm text-slate-400 mb-4">
                      Your domain is secured with a managed TLS certificate. Traffic is encrypted.
                    </p>
                    <div className="bg-[#13141a] rounded-lg p-4 border border-white/5 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-slate-500 mb-1 text-xs uppercase tracking-wider">Expires On</div>
                        <div className="text-white">{format(new Date(domain.activeCertificate.expiresAt), 'MMM dd, yyyy HH:mm')}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1 text-xs uppercase tracking-wider">Auto-Renew</div>
                        <div className="text-white">Enabled (30 days prior)</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : domain.activeCertificate && domain.activeCertificate.status === 'expired' ? (
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mr-4 shrink-0">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Certificate Expired</h4>
                    <p className="text-sm text-slate-400 mb-4">
                      The certificate for this domain has expired. Visitors may see security warnings.
                    </p>
                    <button
                      onClick={() => domainsApi.renewCertificate(domain._id, domain.activeCertificate!.certificateId).then(fetchData)}
                      className="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Renew Now
                    </button>
                  </div>
                </div>
              ) : certificates.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <h4 className="text-white font-medium mb-2">Processing Certificate</h4>
                  <p className="text-sm text-slate-400 max-w-md">
                    We are currently requesting and provisioning a TLS certificate for your domain. This usually takes less than a minute.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-white/10 rounded-xl">
                  <Lock className="w-8 h-8 text-slate-600 mb-4" />
                  <h4 className="text-white font-medium mb-2">No Certificate</h4>
                  <p className="text-sm text-slate-400 max-w-md mb-6">
                    A certificate has not been issued for this domain yet. Verify the domain and connect it to automatically provision a certificate.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline (Explainability) */}
          <div className="bg-[#1a1b23] rounded-xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <h3 className="text-lg font-medium text-white flex items-center">
                <Activity className="w-5 h-5 mr-2 text-slate-400" />
                Audit Log
              </h3>
            </div>
            <div className="p-6">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No events recorded yet.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                  {events.map((event, i) => (
                    <div key={event._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-[#13141a] text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {event.decision.includes('FAILED') || event.decision.includes('ERROR') ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : event.decision.includes('CREATED') || event.decision.includes('VERIFIED') || event.decision.includes('ISSUED') ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Activity className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#13141a] p-4 rounded-xl border border-white/5 shadow">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200 text-sm">{event.decision.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(event.createdAt))}</span>
                        </div>
                        <div className="text-slate-400 text-xs">
                          {event.reason}
                        </div>
                        <div className="mt-2 flex items-center text-[10px] text-slate-500">
                          <span className="bg-white/5 px-2 py-0.5 rounded mr-2">By: {event.actor}</span>
                          <span className="bg-white/5 px-2 py-0.5 rounded">Via: {event.trigger}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#1a1b23] rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Target Application</h3>
            {appDetails ? (
              <div className="bg-[#13141a] rounded-lg p-4 border border-white/5">
                <div className="flex items-center mb-3">
                  <Server className="w-8 h-8 p-1.5 bg-blue-500/10 text-blue-400 rounded-lg mr-3" />
                  <div>
                    <h4 className="text-white font-medium text-sm">{appDetails.name}</h4>
                    <p className="text-slate-500 text-xs">{appDetails.slug}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
                  <span className="text-slate-400">Status</span>
                  <span className={`font-medium ${appDetails.status === 'running' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {appDetails.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">ID: {typeof domain.applicationId === 'object' ? domain.applicationId._id : domain.applicationId}</div>
            )}
          </div>
          
          <div className="bg-[#1a1b23] rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">DNS Configuration</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-400 mb-1">A Record (Apex domains)</div>
                <div className="flex items-center justify-between bg-[#13141a] p-2 rounded-lg border border-white/5">
                  <code className="text-sm text-emerald-400">76.76.21.21</code>
                  <button onClick={() => copyToClipboard('76.76.21.21')} className="text-slate-500 hover:text-white p-1">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1">CNAME Record (Subdomains)</div>
                <div className="flex items-center justify-between bg-[#13141a] p-2 rounded-lg border border-white/5">
                  <code className="text-sm text-emerald-400">cname.devopsease.com</code>
                  <button onClick={() => copyToClipboard('cname.devopsease.com')} className="text-slate-500 hover:text-white p-1">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1b23] rounded-xl border border-white/10 p-6">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Health Status</h3>
            {domain.healthStatus ? (
              <div className="space-y-3">
                 <div className="flex items-center justify-between bg-[#13141a] p-3 rounded-lg border border-white/5">
                    <span className="text-sm text-slate-400">Overall</span>
                    <span className={`text-sm font-bold ${
                       domain.healthStatus === 'HEALTHY' ? 'text-emerald-400' :
                       domain.healthStatus === 'DEGRADED' ? 'text-amber-400' : 'text-red-400'
                    }`}>{domain.healthStatus}</span>
                 </div>
                 {/* Detail view of checks can be expanded here */}
              </div>
            ) : (
              <div className="text-sm text-slate-500 flex items-center bg-[#13141a] p-3 rounded-lg border border-white/5">
                <AlertCircle className="w-4 h-4 mr-2" />
                No health data available. Domain must be connected to evaluate health.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
