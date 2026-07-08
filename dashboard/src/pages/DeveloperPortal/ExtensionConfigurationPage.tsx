import React, { useState } from "react";

export const ExtensionConfigurationPage: React.FC = () => {
  const [config, setConfig] = useState({ webhookUrl: "" });
  
  // This would ideally be generated dynamically from manifest.configSchema
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white mb-2">Configure Extension</h1>
          <p className="text-gray-400">Configure Slack Notifications before enabling.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slack Webhook URL
            </label>
            <input 
              type="text" 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              placeholder="https://hooks.slack.com/services/..."
              value={config.webhookUrl}
              onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-2">The URL where deployment notifications will be sent.</p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-primary mb-1">Generated API Key</h3>
            <p className="text-xs text-gray-400 mb-3">An API Key will be generated and displayed once when you enable this extension.</p>
          </div>
        </div>

        <div className="p-6 bg-gray-750 flex justify-end gap-3">
          <button className="px-4 py-2 text-gray-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Save & Enable
          </button>
        </div>
      </div>
    </div>
  );
};
