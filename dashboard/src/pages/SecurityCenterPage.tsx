import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface SecurityEvent {
  _id: string;
  domain: string;
  eventType: string;
  severity: string;
  timestamp: string;
  summary: string;
  userId?: { name: string; email: string };
  explanation?: { decision: string; trigger: string; actor: string; reason: string };
}

export default function SecurityCenterPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/api/resilience/security/events');
      setEvents(res.data.data);
    } catch (err) {
      console.error('Failed to fetch security events', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'ERROR': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'WARNING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'INFO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white/90">Platform Security Center</h1>
          <p className="text-slate-400 mt-2 text-lg">Centralized governance and audit trail for DevOpsEase.</p>
        </div>
        <button onClick={fetchEvents} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition">
          Refresh
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading security events...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No security events found.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {events.map((event) => (
              <div key={event._id} className="p-6 hover:bg-slate-800/50 transition duration-200">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="text-sm font-semibold text-white/80">{event.domain}</span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-sm font-medium text-blue-400">{event.eventType}</span>
                    </div>
                    <p className="text-slate-300 mt-2">{event.summary}</p>
                    
                    {event.explanation && (
                      <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="text-slate-500 w-20">Actor:</span>
                          <span className="text-white/80 font-mono">{event.userId?.email || event.explanation.actor}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-slate-500 w-20">Reason:</span>
                          <span className="text-slate-300">{event.explanation.reason}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
