import React from 'react';
import { useContainers } from '../hooks/useContainers';
import Header from '../components/Header';
import ContainerList from '../components/ContainerList';

type FilterType = 'all' | 'running' | 'stopped' | 'paused';

const HomePage: React.FC = () => {
  const { data: containers = [], isLoading, error } = useContainers();
  const [activeFilter, setActiveFilter] = React.useState<FilterType>('all');

  // Filter containers based on selected filter
  const filteredContainers = React.useMemo(() => {
    switch (activeFilter) {
      case 'running':
        return containers.filter(c => c.state?.status?.toLowerCase() === 'running');
      case 'stopped':
        return containers.filter(c => ['exited', 'dead'].includes(c.state?.status?.toLowerCase() || ''));
      case 'paused':
        return containers.filter(c => c.state?.status?.toLowerCase() === 'paused');
      default:
        return containers;
    }
  }, [containers, activeFilter]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950">
        <Header onFilterChange={setActiveFilter} activeFilter={activeFilter} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Connection Error</h2>
            <p className="text-slate-400 mb-6">Could not connect to the DevOpsEase server.</p>
            <div className="bg-slate-800/50 rounded-xl p-4 text-left">
              <p className="font-semibold text-slate-200 mb-3">Make sure:</p>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>The server is running at <code className="bg-slate-700 px-2 py-0.5 rounded text-blue-400">http://localhost:3497</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Docker Desktop is running</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Run <code className="bg-slate-700 px-2 py-0.5 rounded text-blue-400">npm start</code> in the server folder</span>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header onFilterChange={setActiveFilter} activeFilter={activeFilter} />
      <main className="flex-1 p-6 lg:p-8">
        {activeFilter !== 'all' && (
          <div className="max-w-7xl mx-auto mb-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Filtering:</span>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${activeFilter === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                activeFilter === 'stopped' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
              </span>
              <button
                onClick={() => setActiveFilter('all')}
                className="text-slate-500 hover:text-slate-300 underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        <ContainerList
          containers={filteredContainers}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
};

export default HomePage;
