import React, { useState } from "react";

export const TokensPage: React.FC = () => {
  const [tokens, setTokens] = useState([
    {
      id: "pat-1",
      name: "CI/CD Pipeline Access",
      scopes: ["repository:read", "build:execute"],
      expiresAt: "2026-12-31T00:00:00Z",
      lastUsedAt: "2026-07-08T12:00:00Z",
    }
  ]);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Personal Access Tokens</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Generate New Token
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
        <table className="w-full text-left">
          <thead className="bg-gray-750 border-b border-gray-700">
            <tr>
              <th className="p-4 text-gray-400 font-semibold text-sm">Name</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Scopes</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Expires</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Last Used</th>
              <th className="p-4 text-gray-400 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {tokens.map((token) => (
              <tr key={token.id} className="hover:bg-gray-750/50 transition-colors">
                <td className="p-4 font-medium text-white">{token.name}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {token.scopes.map(scope => (
                      <span key={scope} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-gray-300">{new Date(token.expiresAt).toLocaleDateString()}</td>
                <td className="p-4 text-gray-300">{new Date(token.lastUsedAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <button className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
