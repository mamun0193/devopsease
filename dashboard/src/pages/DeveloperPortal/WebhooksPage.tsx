import React, { useState } from "react";

export const WebhooksPage: React.FC = () => {
  const [webhooks] = useState([
    {
      id: "wh-1",
      url: "https://my-internal-tool.com/webhook",
      subscriptions: ["build.*", "deployment.failed"],
      isActive: true,
      consecutiveFailures: 0,
      lastDeliveryStatus: "success",
    },
    {
      id: "wh-2",
      url: "https://broken-tool.com/api/events",
      subscriptions: ["repository.push"],
      isActive: false,
      consecutiveFailures: 10,
      lastDeliveryStatus: "dead_letter",
    }
  ]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Outgoing Webhooks</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Add Webhook
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
        <table className="w-full text-left">
          <thead className="bg-gray-750 border-b border-gray-700">
            <tr>
              <th className="p-4 text-gray-400 font-semibold text-sm">Endpoint URL</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Subscriptions</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Status</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Last Delivery</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {webhooks.map((wh) => (
              <tr key={wh.id} className={`hover:bg-gray-750/50 transition-colors ${!wh.isActive ? 'opacity-60' : ''}`}>
                <td className="p-4 font-medium text-white">{wh.url}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {wh.subscriptions.map(sub => (
                      <span key={sub} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {sub}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {wh.isActive ? (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div> Active
                    </span>
                  ) : (
                    <span className="text-red-400 text-sm flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div> Disabled
                    </span>
                  )}
                </td>
                <td className="p-4">
                   <span className={`text-sm ${wh.lastDeliveryStatus === 'success' ? 'text-gray-300' : 'text-red-400'}`}>
                     {wh.lastDeliveryStatus} {wh.consecutiveFailures > 0 && `(${wh.consecutiveFailures} fails)`}
                   </span>
                </td>
                <td className="p-4 flex gap-3">
                  <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Edit</button>
                  <button className="text-gray-400 hover:text-white transition-colors text-sm font-medium">History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
