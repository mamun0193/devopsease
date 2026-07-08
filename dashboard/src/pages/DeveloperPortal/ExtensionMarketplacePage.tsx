import React, { useState } from "react";

export const ExtensionMarketplacePage: React.FC = () => {
  const [extensions] = useState([
    {
      id: "ext-1",
      name: "Slack Notifications",
      version: "1.2.0",
      description: "Send deployment status alerts to Slack channels.",
      author: "DevOpsEase",
      capabilities: ["webhook:read"],
      status: "available", // or "installed"
    }
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Extension Marketplace</h1>
      <p className="text-gray-400 mb-8">Discover and install plugins to extend DevOpsEase capabilities.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {extensions.map(ext => (
          <div key={ext.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-primary/50 transition-colors shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold text-white">{ext.name}</h2>
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">v{ext.version}</span>
            </div>
            
            <p className="text-sm text-gray-400 mb-6 h-10">{ext.description}</p>
            
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Capabilities requested:</p>
              <div className="flex flex-wrap gap-2">
                {ext.capabilities.map(cap => (
                  <span key={cap} className="text-xs bg-red-900/30 text-red-400 border border-red-900/50 px-2 py-1 rounded">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <button className="w-full bg-primary/10 hover:bg-primary/20 text-primary font-medium py-2 rounded-lg transition-colors border border-primary/30">
              Install Extension
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
