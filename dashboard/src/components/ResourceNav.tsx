import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Server, Hammer } from 'lucide-react';

const TABS = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Containers', path: '/containers', icon: Server },
    { label: 'Builds', path: '/builds', icon: Hammer },
] as const;

const ResourceNav: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav className="bg-slate-900/60 border-b border-slate-800/80 sticky top-16 z-40">
            <div className="max-w-7xl mx-auto px-6 flex items-center gap-1">
                {TABS.map(({ label, path, icon: Icon }) => {
                    const isActive = location.pathname === path ||
                        (path !== '/dashboard' && location.pathname.startsWith(path));

                    return (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${isActive
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
