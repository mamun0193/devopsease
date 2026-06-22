import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { CommandPalette } from './CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Global shortcut to toggle terminal (Ctrl + `)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-dds-bg text-dds-white font-sans selection:bg-dds-primary/30 selection:text-white">
      <CommandPalette />
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header />
        
        {/* The content injected via Routes */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-0">
          {children}
        </div>

        {/* Resizable Bottom Terminal Drawer */}
        {isTerminalOpen && (
          <div 
            style={{ height: terminalHeight }} 
            className="border-t border-dds-border bg-[#000000] flex flex-col relative z-20"
          >
            {/* Drag Handle (mocked for now, just visual) */}
            <div className="h-1 absolute top-0 left-0 right-0 cursor-row-resize bg-transparent hover:bg-dds-primary/50 transition-colors z-30" />
            
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] bg-[#0D0D10]">
              <span className="text-[11px] font-mono font-medium text-dds-text-secondary uppercase tracking-wider">Live Terminal</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-dds-green font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-dds-green animate-pulse" /> Connected
                </span>
                <button 
                  onClick={() => setIsTerminalOpen(false)}
                  className="text-dds-text-muted hover:text-dds-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[12px] text-[#A1A1AA] leading-relaxed">
              <div className="text-[#3B82F6]">➜  ~</div>
              <div>Connected to Global Deployment Stream...</div>
              <div className="text-[#22C55E]">✔ System health operational.</div>
              <div className="text-[#F59E0B] animate-pulse mt-2">_</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
