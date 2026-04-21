import React from 'react';
import { Box } from 'lucide-react';

interface AppFooterProps {
  isHealthy?: boolean;
  containerCount?: number;
}

const AppFooter: React.FC<AppFooterProps> = ({ isHealthy, containerCount }) => (
  <footer className="border-t border-gray-800 bg-gray-950 py-4">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Box className="w-4 h-4 text-gray-500" />
        <span className="text-gray-500 text-xs font-medium">
          DevOpsEase &copy; 2026. Made for developers.
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        {containerCount !== undefined && (
          <span>{containerCount} container{containerCount !== 1 ? 's' : ''}</span>
        )}
        {isHealthy !== undefined && (
          <span className={`flex items-center gap-1 ${isHealthy ? 'text-emerald-500' : 'text-yellow-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
            {isHealthy ? 'Server healthy' : 'Connecting…'}
          </span>
        )}
      </div>
    </div>
  </footer>
);

export default AppFooter;
