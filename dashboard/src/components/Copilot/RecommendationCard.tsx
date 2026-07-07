import React from 'react';
import { Shield, Activity, Zap, DollarSign, Layers, Box } from 'lucide-react';

interface AffectedResource {
  resourceType: string;
  resourceId: string;
}

export interface RecommendationProps {
  category: 'SECURITY' | 'PERFORMANCE' | 'RELIABILITY' | 'COST' | 'ARCHITECTURE' | 'DEPLOYMENT';
  title: string;
  description: string;
  why: string;
  evidence: string;
  expectedBenefit: string;
  affectedResources: AffectedResource[];
  confidence: number;
}

export default function RecommendationCard({ rec }: { rec: RecommendationProps }) {
  
  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case 'SECURITY': return { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      case 'PERFORMANCE': return { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
      case 'RELIABILITY': return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      case 'COST': return { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
      case 'ARCHITECTURE': return { icon: Layers, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
      case 'DEPLOYMENT': return { icon: Box, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
      default: return { icon: Zap, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' };
    }
  };

  const config = getCategoryConfig(rec.category);
  const Icon = config.icon;

  return (
    <div className={`p-5 rounded-xl border ${config.border} ${config.bg} backdrop-blur-sm shadow-xl transition-all duration-300 hover:scale-[1.01]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <span className={`text-sm font-bold tracking-wider uppercase ${config.color}`}>{rec.category}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-400 font-medium">Confidence</span>
          <span className={`text-sm font-mono font-bold ${rec.confidence > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
            {rec.confidence}%
          </span>
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-white mb-2">{rec.title}</h3>
      <p className="text-slate-300 text-sm mb-4 leading-relaxed">{rec.description}</p>
      
      <div className="space-y-3 mb-4">
        <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
          <h4 className="text-xs text-slate-500 font-semibold uppercase mb-1">Why & Evidence</h4>
          <p className="text-sm text-slate-300"><span className="text-slate-400">Why:</span> {rec.why}</p>
          <p className="text-sm text-slate-300 mt-1"><span className="text-slate-400">Evidence:</span> {rec.evidence}</p>
        </div>
        
        <div className="bg-green-500/5 p-3 rounded-lg border border-green-500/20">
          <h4 className="text-xs text-green-500/70 font-semibold uppercase mb-1">Expected Benefit</h4>
          <p className="text-sm text-green-400/90">{rec.expectedBenefit}</p>
        </div>
      </div>
      
      {rec.affectedResources && rec.affectedResources.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-700/50">
          {rec.affectedResources.map((res, idx) => (
            <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 font-mono">
              {res.resourceType}: {res.resourceId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
