import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Download, Loader2, Shield, TrendingUp } from 'lucide-react';
import { useDockerHubSearch, usePullImage, useDockerHubStatus } from '../../hooks/useDockerHub';
import type { DockerHubSearchResult } from '../../api';

const POPULAR_IMAGES = [
    { name: 'nginx', desc: 'High-performance HTTP server and reverse proxy' },
    { name: 'redis', desc: 'In-memory data structure store' },
    { name: 'postgres', desc: 'Advanced open source relational database' },
    { name: 'mongo', desc: 'Cross-platform document-oriented database' },
    { name: 'node', desc: 'JavaScript runtime built on V8' },
    { name: 'python', desc: 'Interpreted, high-level programming language' },
    { name: 'mysql', desc: 'Open source relational database' },
    { name: 'alpine', desc: 'Minimal Docker image based on Alpine Linux' },
    { name: 'ubuntu', desc: 'Ubuntu is a Debian-based Linux operating system' },
    { name: 'httpd', desc: 'Apache HTTP Server' },
    { name: 'rabbitmq', desc: 'Open source message broker' },
    { name: 'memcached', desc: 'Distributed memory object caching system' },
];

function formatPulls(count: number): string {
    if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return String(count);
}

const DockerHubSearch: React.FC = () => {
    const { data: hubStatus } = useDockerHubStatus();
    const pullMutation = usePullImage();
    const isConnected = hubStatus?.connected === true;

    const [searchInput, setSearchInput] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [pullingImage, setPullingImage] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const { data: searchData, isLoading: isSearching, isFetching } = useDockerHubSearch(debouncedQuery);

    const handlePull = (imageName: string) => {
        if (!isConnected || pullMutation.isPending) return;
        setPullingImage(imageName);
        pullMutation.mutate(imageName, {
            onSettled: () => setPullingImage(null),
        });
    };

    const showingSearch = debouncedQuery.length >= 2;

    return (
        <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-dds-border bg-dds-surface">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-dds-primary/15 flex items-center justify-center border border-dds-primary/20">
                        <Search size={16} className="text-dds-primary" />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-dds-text-primary">Explore Docker Hub</h3>
                        <p className="text-[11px] font-mono text-dds-text-muted">Search and pull images from Docker Hub</p>
                    </div>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dds-text-muted" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search images... (e.g. nginx, redis, postgres)"
                        className="input w-full pl-10 pr-4 py-2.5"
                    />
                    {isFetching && (
                        <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-dds-text-muted" />
                    )}
                </div>
            </div>

            <div className="px-6 py-5">
                {showingSearch ? (
                    <div>
                        <p className="text-[12px] text-dds-text-muted mb-3">
                            {isSearching ? 'Searching...' : `${searchData?.totalCount || 0} results for "${debouncedQuery}"`}
                        </p>
                        {isSearching && !searchData ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 size={20} className="animate-spin text-dds-text-muted" />
                            </div>
                        ) : searchData?.results.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-[13px] text-dds-text-secondary">No images found</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {searchData?.results.slice(0, 15).map((img) => (
                                    <SearchResultRow
                                        key={img.name}
                                        image={img}
                                        onPull={handlePull}
                                        isPulling={pullingImage === img.name}
                                        disabled={!isConnected || pullMutation.isPending}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={14} className="text-dds-yellow" />
                            <p className="text-[11px] font-mono font-medium text-dds-text-muted uppercase tracking-wider">Popular Images</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {POPULAR_IMAGES.map((img) => (
                                <button
                                    key={img.name}
                                    onClick={() => handlePull(img.name)}
                                    disabled={!isConnected || pullMutation.isPending}
                                    className="group relative text-left px-3.5 py-3 rounded-md bg-dds-surface border border-dds-border hover:border-dds-primary/30 hover:bg-dds-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {pullingImage === img.name ? (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-dds-bg/90">
                                            <Loader2 size={16} className="animate-spin text-dds-primary" />
                                        </div>
                                    ) : null}
                                    <p className="text-[13px] font-medium text-dds-text-primary group-hover:text-dds-primary transition-colors">{img.name}</p>
                                    <p className="text-[11px] text-dds-text-secondary mt-0.5 line-clamp-1">{img.desc}</p>
                                </button>
                            ))}
                        </div>
                        {!isConnected && (
                            <p className="text-[12px] text-dds-yellow/70 mt-4 text-center">
                                Connect Docker Hub above to pull images
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const SearchResultRow: React.FC<{
    image: DockerHubSearchResult;
    onPull: (name: string) => void;
    isPulling: boolean;
    disabled: boolean;
}> = ({ image, onPull, isPulling, disabled }) => {
    return (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-dds-surface border border-dds-border hover:border-dds-text-muted transition-colors">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-dds-text-primary truncate">{image.name}</p>
                    {image.isOfficial && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-dds-blue bg-dds-blue/10 border border-dds-blue/20">
                            <Shield size={9} />
                            Official
                        </span>
                    )}
                </div>
                <p className="text-[12px] text-dds-text-secondary mt-0.5 line-clamp-1">{image.description || 'No description'}</p>
                <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-dds-text-muted">
                        <Star size={10} className="text-dds-yellow" />
                        {formatPulls(image.starCount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-dds-text-muted">
                        <Download size={10} />
                        {formatPulls(image.pullCount)}
                    </span>
                </div>
            </div>
            <button
                onClick={() => onPull(image.name)}
                disabled={disabled}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-dds-blue bg-dds-blue/10 border border-dds-blue/20 hover:bg-dds-blue/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isPulling ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <Download size={12} />
                )}
                Pull
            </button>
        </div>
    );
};

export default DockerHubSearch;
