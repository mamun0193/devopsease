import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, ArrowLeft, Shield } from 'lucide-react';
import { previewApi, type PreviewPolicy } from '../api';

const PreviewPolicyPage: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const queryClient = useQueryClient();

  const { data: policy, isLoading } = useQuery({
    queryKey: ['preview-policy', repoId],
    queryFn: () => previewApi.getPolicy(repoId!),
    enabled: !!repoId
  });

  const [formData, setFormData] = useState<Partial<PreviewPolicy>>({});

  useEffect(() => {
    if (policy) setFormData(policy);
  }, [policy]);

  const saveMutation = useMutation({
    mutationFn: () => previewApi.upsertPolicy(repoId!, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preview-policy', repoId] });
      alert('Policy saved successfully');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = Number(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  if (isLoading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/previews" className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-500" />
              Preview Policy
            </h1>
            <p className="text-gray-400 text-sm mt-1">Configure environment limits and automation</p>
          </div>
        </div>
        <button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <Save className="w-4 h-4" /> Save Policy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Automation Settings */}
        <div className="bg-[#151515] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-white/10 pb-3">
            <Shield className="w-5 h-5 text-gray-400" /> Automation
          </h2>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              name="autoCreateOnPush"
              checked={formData.autoCreateOnPush || false}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-black/20 border-white/10 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            <div>
              <div className="text-sm font-medium text-gray-200">Auto-create on push</div>
              <div className="text-xs text-gray-500">Automatically create a preview environment when a PR is pushed</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              name="autoDestroyOnMerge"
              checked={formData.autoDestroyOnMerge || false}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-black/20 border-white/10 text-indigo-500 focus:ring-0 focus:ring-offset-0"
            />
            <div>
              <div className="text-sm font-medium text-gray-200">Auto-destroy on merge</div>
              <div className="text-xs text-gray-500">Destroy the preview environment when the PR is closed or merged</div>
            </div>
          </label>
        </div>

        {/* Lifecycle Settings */}
        <div className="bg-[#151515] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-white/10 pb-3">
            <Settings className="w-5 h-5 text-gray-400" /> Lifecycle Limits
          </h2>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Base TTL (Minutes)</label>
            <input 
              type="number"
              name="ttlMinutes"
              value={formData.ttlMinutes || 240}
              onChange={handleChange}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Lifetime (Minutes)</label>
            <input 
              type="number"
              name="maxLifetimeMinutes"
              value={formData.maxLifetimeMinutes || 1440}
              onChange={handleChange}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Extensions</label>
            <input 
              type="number"
              name="maxExtensions"
              value={formData.maxExtensions || 3}
              onChange={handleChange}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPolicyPage;
