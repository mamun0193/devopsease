import React from 'react';
import Header from '../components/Header';
import type { FilterItem } from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import ConnectDockerHubCard from '../components/registry/ConnectDockerHubCard';
import PullImageCard from '../components/registry/PullImageCard';
import DockerHubSearch from '../components/registry/DockerHubSearch';
import { useDockerHubStatus } from '../hooks/useDockerHub';
import { Download, Search } from 'lucide-react';

const RegistryPage: React.FC = () => {
    const { data: hubStatus } = useDockerHubStatus();
    const isConnected = hubStatus?.connected === true;

    const filterItems: FilterItem[] = [
        {
            key: 'hub',
            label: 'Hub',
            count: isConnected ? 1 : 0,
            color: isConnected ? 'text-emerald-400' : 'text-slate-500',
            activeBg: 'bg-slate-700',
            activeBorder: 'border-slate-600',
            dot: isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600',
        },
        {
            key: 'pull',
            label: 'Pull',
            count: 0,
            color: 'text-blue-400',
            activeBg: 'bg-blue-500/20',
            activeBorder: 'border-blue-500/50',
            icon: <Download size={14} className="text-blue-400" />,
        },
        {
            key: 'search',
            label: 'Search',
            count: 0,
            color: 'text-violet-400',
            activeBg: 'bg-violet-500/20',
            activeBorder: 'border-violet-500/50',
            icon: <Search size={14} className="text-violet-400" />,
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header onFilterChange={() => {}} activeFilter="hub" filterItems={filterItems} />
            <ResourceNav />
            <main className="flex-1 p-6 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-100">Registry</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Docker Hub integration</p>
                    </div>

                    {/* Vertical stacked layout */}
                    <div className="space-y-6">
                        <ConnectDockerHubCard />
                        <PullImageCard />
                        <DockerHubSearch />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegistryPage;
