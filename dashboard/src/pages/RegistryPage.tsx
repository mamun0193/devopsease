import React from 'react';
import ConnectDockerHubCard from '../components/registry/ConnectDockerHubCard';
import PullImageCard from '../components/registry/PullImageCard';
import DockerHubSearch from '../components/registry/DockerHubSearch';

const RegistryPage: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-dds-bg text-dds-text-primary overflow-hidden">
            <main className="flex-1 overflow-y-auto scrollbar-hide p-6 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-dds-text-primary tracking-tight">Registry</h1>
                        <p className="text-[13px] text-dds-text-secondary mt-0.5">Docker Hub integration</p>
                    </div>

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
