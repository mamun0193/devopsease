import React from 'react';
import { PlayCircle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface TimelineEvent {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  title: string;
  description: string;
  timestamp?: string;
}

interface ReleaseTimelineProps {
  events: TimelineEvent[];
}

const ReleaseTimeline: React.FC<ReleaseTimelineProps> = ({ events }) => {
  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="size-4 text-emerald-400" />;
      case 'active': return <Loader2 className="size-4 text-blue-400 animate-spin" />;
      case 'failed': return <AlertCircle className="size-4 text-red-400" />;
      case 'pending': return <PlayCircle className="size-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed': return 'border-emerald-500/30 bg-emerald-500/10';
      case 'active': return 'border-blue-500/30 bg-blue-500/10';
      case 'failed': return 'border-red-500/30 bg-red-500/10';
      case 'pending': return 'border-slate-700 bg-slate-800/50';
    }
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4">
          {/* Connector Line */}
          {index < events.length - 1 && (
            <div className={`absolute left-5 top-10 w-0.5 h-full -ml-px ${event.status === 'completed' ? 'bg-emerald-500/30' : 'bg-slate-700/50'}`} />
          )}
          
          <div className={`relative shrink-0 flex items-center justify-center size-10 rounded-full border ${getStatusColor(event.status)}`}>
            {getStatusIcon(event.status)}
          </div>
          
          <div className="flex-1 pb-6 pt-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className={`font-medium ${event.status === 'pending' ? 'text-slate-400' : 'text-slate-200'}`}>
                  {event.title}
                </h4>
                <p className="mt-1 text-sm text-slate-500">{event.description}</p>
              </div>
              {event.timestamp && (
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReleaseTimeline;
