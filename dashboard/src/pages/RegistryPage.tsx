import React from 'react';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import ConnectDockerHubCard from '../components/registry/ConnectDockerHubCard';
import PullImageCard from '../components/registry/PullImageCard';
import DockerHubSearch from '../components/registry/DockerHubSearch';

const RegistryPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950">
            <Header />
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
