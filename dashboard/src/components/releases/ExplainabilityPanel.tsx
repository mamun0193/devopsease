import React from 'react';
import { Clock, Info, User, Zap } from 'lucide-react';
import type { ExplainabilityRecord } from '../../api/releasesApi';
import { formatDistanceToNow } from 'date-fns';

interface ExplainabilityPanelProps {
  records: ExplainabilityRecord[];
}

const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ records }) => {
  if (!records || records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-800/20 rounded-lg border border-slate-700/50">
        <Info className="size-8 text-slate-500 mb-3" />
        <h3 className="font-medium text-slate-300">No telemetry available</h3>
        <p className="text-sm text-slate-500 mt-1">Platform decisions will be recorded here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record, idx) => (
        <div key={idx} className="relative rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50">
          {idx < records.length - 1 && (
            <div className="absolute left-8 top-12 h-6 w-px bg-slate-700/50" />
          )}
          
          <div className="flex items-start gap-3">
            <div className="relative shrink-0 rounded-lg border p-2 text-blue-400 bg-blue-500/10 border-blue-500/20">
              <Zap className="size-4" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-slate-200">
                    {record.decision.replace(/_/g, ' ')}
                  </h4>
                  <p className="mt-1 text-sm text-slate-400">{record.reason}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">
                    {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 flex gap-4 border-t border-slate-700/50 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <User className="size-3.5" />
                  <span>Actor: {record.actor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>Trigger: {record.trigger}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExplainabilityPanel;
