import React from 'react';
import type { RoutingTable } from '../../api/trafficApi';
import type { Release } from '../../api/releasesApi';

interface TrafficVisualizationProps {
  routingTable: RoutingTable | null;
  activeReleases: Release[];
}

const TrafficVisualization: React.FC<TrafficVisualizationProps> = ({ routingTable, activeReleases }) => {
  if (!routingTable || routingTable.routes.length === 0) {
    return (
      <div className="h-12 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-center justify-center text-slate-500 text-sm">
        No traffic configured
      </div>
    );
  }

  // Define some distinct colors for different releases
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-amber-500'
  ];

  return (
    <div className="space-y-3">
      {/* The Bar */}
      <div className="h-8 w-full bg-slate-800 rounded-lg overflow-hidden flex border border-slate-700/50">
        {routingTable.routes.map((route, index) => (
          <div 
            key={index}
            style={{ width: `${route.weight}%` }}
            className={`h-full ${colors[index % colors.length]} transition-all duration-500 flex items-center justify-center`}
            title={`Release ${route.releaseId}: ${route.weight}%`}
          >
            {route.weight > 10 && <span className="text-xs font-bold text-white/90 drop-shadow-md">{route.weight}%</span>}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {routingTable.routes.map((route, index) => {
          const release = activeReleases.find(r => r._id === route.releaseId);
          return (
            <div key={index} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <span className="text-sm font-medium text-slate-300">
                Release {release ? release.version : route.releaseId.substring(0,6)}
              </span>
              <span className="text-xs text-slate-500">({route.weight}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrafficVisualization;
