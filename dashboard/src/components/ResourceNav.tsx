import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Server, Hammer, Rocket, Layers, FolderKanban, Network, HardDrive, Globe, GitBranch, Cloud, Box } from 'lucide-react';

const TABS = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Containers', path: '/containers', icon: Server },
    { label: 'Builds', path: '/builds', icon: Hammer },
    { label: 'Deployments', path: '/deployments', icon: Rocket },
    { label: 'Clusters', path: '/clusters', icon: Cloud },
    { label: 'Pods', path: '/pods', icon: Box },
    { label: 'Images', path: '/images', icon: Layers },
    { label: 'Registry', path: '/registry', icon: Globe },
    { label: 'Repositories', path: '/repositories', icon: GitBranch },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Networks', path: '/networks', icon: Network },
    { label: 'Volumes', path: '/volumes', icon: HardDrive },
] as const;

const ResourceNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [headerHidden, setHeaderHidden] = React.useState(false);

    React.useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            setHeaderHidden(detail.hidden);
        };
        window.addEventListener('header-visibility', handler);
        return () => window.removeEventListener('header-visibility', handler);
    }, []);

    return (
        <nav className={`bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/80 sticky z-40 transition-all duration-300 ease-out ${headerHidden ? 'top-0' : 'top-16'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {TABS.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path ||
                        (path !== '/dashboard' && location.pathname.startsWith(path));

                    return (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${isActive
                                ? 'text-blue-400'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <Icon size={15} />
                            {label}
                            {isActive && (
                                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default ResourceNav;
