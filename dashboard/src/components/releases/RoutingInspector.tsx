import React from 'react';
import { ArrowRight, Server, ShieldAlert, Split, Route, Box, PlaySquare } from 'lucide-react';
import type { RoutingTable } from '../../api/trafficApi';
import type { Release } from '../../api/releasesApi';

interface RoutingInspectorProps {
  routingTable: RoutingTable | null;
  activeReleases: Release[];
}

const RoutingInspector: React.FC<RoutingInspectorProps> = ({ routingTable, activeReleases }) => {
  if (!routingTable) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-800/20 border border-slate-700/50 rounded-lg">
        No routing table available for this application.
      </div>
    );
  }

  const Node = ({ icon: Icon, title, active = false }: { icon: any, title: string, active?: boolean }) => (
    <div className={`flex flex-col items-center justify-center p-4 border rounded-lg w-28 text-center transition-colors ${active ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
      <Icon className={`size-6 mb-2 ${active ? 'text-purple-400' : 'text-slate-500'}`} />
      <span className="text-xs font-medium">{title}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-x-auto">
        <Node icon={Server} title="Gateway" active />
        <ArrowRight className="size-5 text-slate-600" />
        <Node icon={ShieldAlert} title="Traffic Policy" />
        <ArrowRight className="size-5 text-slate-600" />
        <Node icon={Route} title="Routing Table" active />
        <ArrowRight className="size-5 text-slate-600" />
        <div className="flex flex-col gap-4">
          {routingTable.routes.map((route, idx) => {
            const release = activeReleases.find(r => r._id === route.releaseId);
            return (
              <div key={idx} className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center p-3 border border-blue-500/30 bg-blue-500/10 rounded-lg w-32 text-center text-blue-300">
                  <Split className="size-5 mb-1 text-blue-400" />
                  <span className="text-xs font-medium">Release {release ? release.version : 'Unknown'}</span>
                  <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded mt-1">{route.weight}% Traffic</span>
                </div>
                <ArrowRight className="size-4 text-slate-600" />
                <div className="flex flex-col gap-2">
                  {route.targets.map((t, tidx) => (
                    <div key={tidx} className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded">
                      <Box className="size-3.5" />
                      {t.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 text-sm text-slate-400 flex items-start gap-3">
        <PlaySquare className="size-5 shrink-0 text-purple-400 mt-0.5" />
        <div>
          <strong className="text-slate-300 block mb-1">How requests are routed</strong>
          The Gateway intercepts incoming requests, looks up the highly-optimized <span className="text-purple-300">Routing Table v{routingTable.version}</span>, applies the weighted algorithm, and forwards the request to the runtime deployment targets.
        </div>
      </div>
    </div>
  );
};

export default RoutingInspector;
