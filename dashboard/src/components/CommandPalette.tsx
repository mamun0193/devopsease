import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, Server, Box, Layers, Hammer, Settings, ArrowRight } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Reset search when opened
  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen]);

  // Handle global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    // Listen for custom event from Header button
    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  const onClose = () => setIsOpen(false);

  const commands = [
    { id: 'deployments', icon: <Rocket size={14} />, label: 'Go to Deployments', path: '/deployments', category: 'Navigation' },
    { id: 'containers', icon: <Server size={14} />, label: 'Go to Containers', path: '/containers', category: 'Navigation' },
    { id: 'images', icon: <Layers size={14} />, label: 'Go to Images', path: '/images', category: 'Navigation' },
    { id: 'builds', icon: <Hammer size={14} />, label: 'Go to Builds', path: '/builds', category: 'Navigation' },
    { id: 'settings', icon: <Settings size={14} />, label: 'Preferences', path: '/settings', category: 'System' },
    { id: 'new-deploy', icon: <Box size={14} />, label: 'Create New Deployment', path: '/deployments/new', category: 'Actions' },
  ];

  const filteredCommands = commands.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-dds-bg/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-lg bg-dds-surface border border-dds-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Input area */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-dds-border">
              <Search size={18} className="text-dds-text-secondary" />
              <input 
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-dds-white text-sm outline-none placeholder:text-dds-text-muted"
              />
              <div className="px-2 py-0.5 rounded bg-dds-bg border border-dds-border text-[10px] text-dds-text-muted font-mono font-medium">
                ESC
              </div>
            </div>

            {/* Results area */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length > 0 ? (
                <div className="space-y-1">
                  {filteredCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelect(cmd.path)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-dds-text-secondary hover:text-dds-white hover:bg-dds-bg hover:border-l-2 hover:border-dds-primary transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-dds-text-muted group-hover:text-dds-primary transition-colors">
                          {cmd.icon}
                        </span>
                        {cmd.label}
                      </div>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-dds-text-muted" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-dds-text-muted">
                  No results found for "{search}"
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 border-t border-dds-border bg-dds-bg flex items-center justify-between text-[11px] text-dds-text-muted">
              <span>Use <kbd className="bg-dds-surface px-1.5 py-0.5 rounded border border-dds-border font-mono mx-1">↑</kbd> <kbd className="bg-dds-surface px-1.5 py-0.5 rounded border border-dds-border font-mono mx-1">↓</kbd> to navigate</span>
              <span><kbd className="bg-dds-surface px-1.5 py-0.5 rounded border border-dds-border font-mono mx-1">↵</kbd> to select</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
