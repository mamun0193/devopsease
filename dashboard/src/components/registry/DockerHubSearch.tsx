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

    // Debounce search input by 400ms
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
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header with Search */}
            <div className="px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center border border-cyan-500/20">
                        <Search size={16} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-100">Explore Docker Hub</h3>
                        <p className="text-xs text-slate-500">Search and pull images from Docker Hub</p>
                    </div>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search images... (e.g. nginx, redis, postgres)"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-colors"
                    />
                    {isFetching && (
                        <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-500" />
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
                {showingSearch ? (
                    // Search Results
                    <div>
                        <p className="text-xs text-slate-500 mb-3">
                            {isSearching ? 'Searching...' : `${searchData?.totalCount || 0} results for "${debouncedQuery}"`}
                        </p>
                        {isSearching && !searchData ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 size={20} className="animate-spin text-slate-500" />
                            </div>
                        ) : searchData?.results.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-sm text-slate-500">No images found</p>
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
                    // Popular Images Grid
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={14} className="text-amber-400" />
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Popular Images</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {POPULAR_IMAGES.map((img) => (
                                <button
                                    key={img.name}
                                    onClick={() => handlePull(img.name)}
                                    disabled={!isConnected || pullMutation.isPending}
                                    className="group relative text-left px-3.5 py-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {pullingImage === img.name ? (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-800/90">
                                            <Loader2 size={16} className="animate-spin text-cyan-400" />
                                        </div>
                                    ) : null}
                                    <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">{img.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{img.desc}</p>
                                </button>
                            ))}
                        </div>
                        {!isConnected && (
                            <p className="text-xs text-yellow-400/70 mt-4 text-center">
                                Connect Docker Hub above to pull images
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Extracted row component for search results
const SearchResultRow: React.FC<{
    image: DockerHubSearchResult;
    onPull: (name: string) => void;
    isPulling: boolean;
    disabled: boolean;
}> = ({ image, onPull, isPulling, disabled }) => {
    return (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-800/30 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{image.name}</p>
                    {image.isOfficial && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-300 bg-blue-500/15 border border-blue-500/20">
                            <Shield size={9} />
                            Official
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{image.description || 'No description'}</p>
                <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Star size={10} className="text-amber-500" />
                        {formatPulls(image.starCount)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Download size={10} />
                        {formatPulls(image.pullCount)}
                    </span>
                </div>
            </div>
            <button
                onClick={() => onPull(image.name)}
                disabled={disabled}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
