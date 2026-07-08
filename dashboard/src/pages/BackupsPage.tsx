import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/toastSlice';

export default function BackupsPage() {
  const dispatch = useAppDispatch();
  const [backups, setBackups] = useState<any[]>([]);
  const [restores, setRestores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Restore Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<'SELECT' | 'PREVIEW' | 'EXECUTING'>('SELECT');
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [restorePlan, setRestorePlan] = useState<any>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [b, r] = await Promise.all([
        axios.get('/api/resilience/backups'),
        axios.get('/api/resilience/restores')
      ]);
      setBackups(b.data);
      setRestores(r.data);
    } catch (err) {
      console.error('Failed to fetch backups', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await axios.post('/api/resilience/backups', { tier: 'pinned' });
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err?.response?.data?.message || 'Failed to create backup', type: 'error', duration: 5000 }));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    try {
      await axios.delete(`/api/resilience/backups/${id}`);
      await fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err?.response?.data?.message || 'Failed to delete backup', type: 'error', duration: 5000 }));
    }
  };

  // Restore Wizard Logic
  const initiateRestore = (backupId: string) => {
    setSelectedBackupId(backupId);
    setWizardStep('SELECT');
    setWizardOpen(true);
    generatePlan(backupId);
  };

  const generatePlan = async (backupId: string) => {
    setWizardStep('PREVIEW');
    try {
      const res = await axios.post('/api/resilience/restores/plan', { backupId });
      setRestorePlan(res.data);
    } catch (err: any) {
      dispatch(addToast({ message: err?.response?.data?.message || 'Failed to generate restore plan', type: 'error', duration: 5000 }));
      setWizardOpen(false);
    }
  };

  const executeRestore = async () => {
    if (!restorePlan) return;
    setWizardStep('EXECUTING');
    try {
      await axios.post(`/api/resilience/restores/${restorePlan.restore._id}/execute`);
      dispatch(addToast({ message: 'Restore execution started! The platform will enter maintenance mode.', type: 'info', duration: 5000 }));
      setWizardOpen(false);
      fetchData();
    } catch (err: any) {
      dispatch(addToast({ message: err?.response?.data?.message || 'Failed to execute restore', type: 'error', duration: 5000 }));
      setWizardOpen(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white/90">Platform Resilience</h1>
          <p className="text-slate-400 mt-2 text-lg">Manage platform backups, retention policies, and recovery operations.</p>
        </div>
        <button 
          onClick={handleCreateBackup}
          disabled={creating}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {creating ? 'Creating Backup...' : 'Create Pinned Backup'}
        </button>
      </div>

      {/* RESTORE WIZARD MODAL */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Restore Platform State</h2>
            
            {wizardStep === 'PREVIEW' && !restorePlan ? (
              <div className="text-center p-8 text-slate-400 animate-pulse">Generating Restore Plan (diffing state)...</div>
            ) : wizardStep === 'PREVIEW' && restorePlan ? (
              <div className="space-y-6">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <h3 className="text-yellow-400 font-semibold mb-2">Warning: Destructive Operation</h3>
                  <p className="text-slate-300 text-sm">
                    This will pause the platform scheduler, create a pre-restore backup, and restore exactly what is in this manifest. Current state not in the backup will be deleted.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl font-mono text-green-400">{restorePlan.plan.totals.inserted}</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">Inserts</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl font-mono text-blue-400">{restorePlan.plan.totals.updated}</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">Updates</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl font-mono text-red-400">{restorePlan.plan.totals.deleted}</div>
                    <div className="text-xs text-slate-500 uppercase mt-1">Deletes</div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-8">
                  <button onClick={() => setWizardOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white transition">Cancel</button>
                  <button onClick={executeRestore} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition font-medium">
                    Execute Restore
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400">Executing...</div>
            )}
          </div>
        </div>
      )}

      {/* BACKUPS TABLE */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white/90">Available Backups</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Backup ID</th>
                <th className="px-6 py-4 font-medium">Tier</th>
                <th className="px-6 py-4 font-medium">Size</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Expires</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {backups.map(b => (
                <tr key={b._id} className="hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4 font-mono text-slate-300">{b._id.substring(0, 8)}...</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      b.retentionTier === 'pinned' ? 'bg-purple-500/20 text-purple-400' :
                      b.retentionTier === 'daily' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {b.retentionTier.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{formatBytes(b.storageMetadata?.sizeBytes || 0)}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-400">{b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : 'Never'}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => initiateRestore(b._id)} className="text-blue-400 hover:text-blue-300 font-medium">Restore</button>
                    <button onClick={() => handleDeleteBackup(b._id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESTORE HISTORY */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white/90">Restore History</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-6">
          {restores.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No restores have been performed.</p>
          ) : (
            <div className="space-y-6">
              {restores.map(r => (
                <div key={r._id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        r.status === 'SUCCESS' ? 'bg-green-500/20 text-green-400' :
                        r.status === 'FAILED' || r.status === 'ROLLED_BACK' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400 animate-pulse'
                      }`}>
                        {r.status}
                      </span>
                      <span className="text-slate-300 font-medium">Stage: {r.stage}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Started: {new Date(r.startedAt).toLocaleString()}</p>
                    {r.error && <p className="text-sm text-red-400 mt-1">{r.error}</p>}
                  </div>
                  <div className="flex space-x-6 text-sm">
                    <div className="text-center">
                      <div className="text-green-400 font-mono text-lg">{r.explainability?.inserted || 0}</div>
                      <div className="text-slate-500 text-xs">INSERTS</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 font-mono text-lg">{r.explainability?.updated || 0}</div>
                      <div className="text-slate-500 text-xs">UPDATES</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-mono text-lg">{r.explainability?.deleted || 0}</div>
                      <div className="text-slate-500 text-xs">DELETES</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
