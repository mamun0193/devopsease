import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import {
  LayoutDashboard, Server, Hammer, Rocket, Layers, FolderKanban, Network, HardDrive,
  Globe, GitBranch, GitMerge, Cloud, Box, Settings, Users, ChevronDown, ChevronRight, Activity, TerminalSquare, KeyRound, Eye, Zap, Shield, ShieldAlert, Sparkles
} from 'lucide-react';

type NavGroup = {
  title: string;
  items: { label: string; path: string; icon: React.ElementType; requiresAdmin?: boolean }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Source Control',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban },
      { label: 'Repositories', path: '/repositories', icon: GitBranch },
      { label: 'Pipelines', path: '/pipelines', icon: GitMerge },
      { label: 'Builds', path: '/builds', icon: Hammer },
    ],
  },
  {
    title: 'Runtime',
    items: [
      { label: 'Applications', path: '/applications', icon: Globe },
      { label: 'Domains', path: '/domains', icon: Globe },
      { label: 'Environments', path: '/environments', icon: KeyRound },
      { label: 'Releases', path: '/releases', icon: Activity },
      { label: 'Deployments', path: '/deployments', icon: Rocket },
      { label: 'Previews', path: '/previews', icon: Eye },
      { label: 'Containers', path: '/containers', icon: Server },
      { label: 'Pods', path: '/pods', icon: Box },
      { label: 'Images', path: '/images', icon: Layers },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { label: 'Clusters', path: '/clusters', icon: Cloud, requiresAdmin: true },
      { label: 'Networks', path: '/networks', icon: Network, requiresAdmin: true },
      { label: 'Volumes', path: '/volumes', icon: HardDrive, requiresAdmin: true },
      { label: 'Registry', path: '/registry', icon: Globe, requiresAdmin: true },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Copilot', path: '/copilot', icon: Sparkles },
      { label: 'Alerts', path: '/alerts', icon: Activity },
      { label: 'Platform Health', path: '/observability', icon: Activity, requiresAdmin: true },
      { label: 'DevOpsEase Autopilot', path: '/autopilot', icon: Zap, requiresAdmin: true },
      { label: 'Security Center', path: '/security', icon: Shield, requiresAdmin: true },
      { label: 'Platform Resilience', path: '/backups', icon: ShieldAlert, requiresAdmin: true },
    ],
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-64 h-full bg-dds-sidebar border-r border-dds-border flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide select-none flex-shrink-0">
      <div className="p-4 flex items-center gap-3 border-b border-dds-border sticky top-0 bg-dds-sidebar z-10">
        <div className="w-8 h-8 rounded-[6px] bg-dds-primary flex items-center justify-center shadow-lg shadow-dds-primary/20">
          <TerminalSquare size={18} className="text-white" />
        </div>
        <span className="font-sans font-semibold tracking-tight text-dds-white">DevOpsEase</span>
      </div>

      <nav className="flex-1 p-3 space-y-3">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => !item.requiresAdmin || isAdmin);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-dds-text-muted uppercase tracking-wider hover:text-dds-text-secondary transition-colors"
            >
              {group.title}
              {collapsedGroups[group.title] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            
            {!collapsedGroups[group.title] && (
              <div className="space-y-0.5 mt-1">
                {visibleItems.map(({ label, path, icon: Icon }) => {
                  const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-dds-primary/10 text-dds-primary' 
                          : 'text-dds-text-secondary hover:bg-dds-surface hover:text-dds-white'
                      }`}
                    >
                      <Icon size={15} className={isActive ? 'text-dds-primary' : 'text-dds-text-muted'} />
                      {label}
                      {isActive && (
                        <div className="ml-auto w-1 h-1 rounded-full bg-dds-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-dds-border mt-auto">
        <div className="space-y-0.5">
          <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-sm font-medium text-dds-text-secondary hover:bg-dds-surface hover:text-dds-white transition-colors">
            <Settings size={15} className="text-dds-text-muted" />
            Settings
          </button>
          <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-sm font-medium text-dds-text-secondary hover:bg-dds-surface hover:text-dds-white transition-colors">
            <Users size={15} className="text-dds-text-muted" />
            Team
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
