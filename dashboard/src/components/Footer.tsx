import React from 'react';
import { Activity, Cpu, Clock, BookOpen, Github } from 'lucide-react';

interface FooterProps {
  isHealthy: boolean;
  containerCount: number;
}

const Footer: React.FC<FooterProps> = ({ isHealthy, containerCount }) => {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer className="border-t border-slate-800/60 bg-slate-900/40 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

          {/* Left: branding + status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Activity size={13} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-300">DevOpsEase</span>
              <span className="text-xs text-slate-600 font-mono">v1.0</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <div className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
              {isHealthy ? 'All systems operational' : 'Connecting to server…'}
            </div>
          </div>

          {/* Right: meta info */}
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Cpu size={11} />
              {containerCount} container{containerCount !== 1 ? 's' : ''} tracked
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} />
              {formattedDate} · {formattedTime}
            </span>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-4 pt-4 border-t border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-700">
          <span>© {now.getFullYear()} DevOpsEase · Docker management platform</span>
          <div className="flex items-center gap-3">
            <a
              href="https://docs.docker.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-400 transition-colors"
            >
              <BookOpen size={11} /> Docker Docs
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-400 transition-colors"
            >
              <Github size={11} /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
