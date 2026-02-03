import React from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  Server,
  Network,
  HardDrive,
  Tag,
  Activity,
  RefreshCw,
  Terminal,
  Globe,
  ChevronRight
} from 'lucide-react';
import { useContainerInspect } from '../hooks/useContainers';
import { formatTimestamp } from '../utils/formatters';

interface ContainerInfoProps {
  containerId: string | null;
}

const ContainerInfo: React.FC<ContainerInfoProps> = ({ containerId }) => {
  const { data: info, isLoading, error, refetch } = useContainerInspect(containerId);

  if (!containerId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Info size={48} className="text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-300">No Container Selected</h3>
        <p className="text-slate-500">Select a container to view its details</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Loading container details...</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Info size={32} className="text-red-400 mb-4" />
        <p className="text-slate-300">Failed to load container details</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  console.log('Container State:', info?.state);

  return (
    <div className="p-6 space-y-6">
      {/* Help Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <span className="text-lg">📋</span>
        <span className="text-sm text-blue-300">
          <strong>What is this?</strong> This shows all the technical details about your container -
          like its image, network settings, and storage. Useful for debugging configuration issues.
        </span>
      </div>

      {/* Basic Info */}
      <Section title="Basic Information" icon={<Server size={18} />}>
        <InfoRow
          label="Name"
          value={info.name?.replace(/^\//, '')}
          hint="The friendly name for this container"
        />
        <InfoRow
          label="Image"
          value={info.image}
          hint="The Docker image this container was created from"
          mono
        />
        <InfoRow
          label="Status"
          value={info.state?.status}
          hint="Current state of the container"
          badge
          badgeVariant={info.state?.status === 'running' ? 'success' : 'error'}
        />
        <InfoRow
          label="Restart Count"
          value={String(info.restartCount || 0)}
          hint="How many times this container has restarted"
        />
      </Section>

      {/* State Details */}
      <Section title="State Details" icon={<Activity size={18} />}>
        <InfoRow
          label="Running"
          value={info.state?.running ? 'Yes' : 'No'}
          hint="Is the container currently running?"
        />
        <InfoRow
          label="Exit Code"
          value={
            info.state?.exitCode !== undefined
              ? `${info.state.exitCode}`
              : 'N/A'
          }
          hint={info.state?.exitCodeReason || 'No exit reason available'}
          highlight={info.state?.exitCode !== 0 && info.state?.exitCode !== undefined}
        />
        {info.state?.oomKilled && (
          <InfoRow
            label="OOM Killed"
            value="Yes"
            hint="Container was killed due to out of memory"
            highlight
          />
        )}
        {info.state?.startedAt && info.state.startedAt !== '0001-01-01T00:00:00Z' && (
          <InfoRow
            label="Started At"
            value={formatTimestamp(info.state.startedAt)}
            hint="When the container started"
          />
        )}
        {!info.state?.running && info.state?.finishedAt && info.state.finishedAt !== '0001-01-01T00:00:00Z' && (
          <InfoRow
            label="Finished At"
            value={formatTimestamp(info.state.finishedAt)}
            hint="When the container stopped"
          />
        )}
      </Section>

      {/* Network */}
      {info.networks && info.networks.length > 0 && (
        <Section title="Network" icon={<Network size={18} />}>
          {info.networks.map((network, index) => (
            <div key={index} className="space-y-2 pb-3 border-b border-slate-800 last:border-0 last:pb-0">
              <InfoRow
                label="Network Name"
                value={network.name}
                hint="The Docker network this container is connected to"
              />
              <InfoRow
                label="IP Address"
                value={network.ipAddress || 'Not assigned'}
                hint="The container's IP address on this network"
                mono
              />
            </div>
          ))}
        </Section>
      )}

      {/* Ports */}
      {info.ports && Object.keys(info.ports).length > 0 && (
        <Section title="Port Mappings" icon={<Globe size={18} />}>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-400 mb-3">
            <span>💡</span>
            <span>Port mappings connect container ports to your computer. Format: HOST:CONTAINER</span>
          </div>
          {Object.entries(info.ports).map(([containerPort, hostBindings]) => (
            <div key={containerPort}>
              {hostBindings && hostBindings.length > 0 ? (
                hostBindings.map((binding, index) => (
                  <InfoRow
                    key={index}
                    label={`Port ${containerPort}`}
                    value={`${binding.HostIp || '0.0.0.0'}:${binding.HostPort} → ${containerPort}`}
                    hint="Traffic on the host port is forwarded to the container port"
                    mono
                  />
                ))
              ) : (
                <InfoRow
                  label={`Port ${containerPort}`}
                  value="Not mapped to host"
                  hint="This port is only accessible from inside Docker networks"
                />
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Environment Variables */}
      {info.environmentVariables && info.environmentVariables.length > 0 && (
        <Section title="Environment Variables" icon={<Terminal size={18} />}>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-400 mb-3">
            <span>🔧</span>
            <span>Environment variables configure the application inside the container</span>
          </div>
          <div className="space-y-1">
            {info.environmentVariables.slice(0, 10).map((env, index) => (
              <div key={index} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50">
                <span className="text-blue-400 font-mono text-xs">{env.key}</span>
                <span className="text-slate-600">=</span>
                <span className="text-slate-400 font-mono text-xs truncate">
                  {env.key.toLowerCase().includes('password') ||
                    env.key.toLowerCase().includes('secret') ||
                    env.key.toLowerCase().includes('token')
                    ? '••••••••'
                    : env.value || '(empty)'
                  }
                </span>
              </div>
            ))}
            {info.environmentVariables.length > 10 && (
              <div className="text-xs text-slate-500 px-2 pt-2">
                +{info.environmentVariables.length - 10} more variables
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Mounts */}
      {info.mounts && info.mounts.length > 0 && (
        <Section title="Storage Mounts" icon={<HardDrive size={18} />}>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-400 mb-3">
            <span>📁</span>
            <span>Mounts connect folders on your computer to folders inside the container</span>
          </div>
          {info.mounts.map((mount, index) => (
            <div key={index} className="space-y-2 pb-3 border-b border-slate-800 last:border-0 last:pb-0">
              <InfoRow
                label="Type"
                value={mount.type}
                hint="'bind' = folder from host, 'volume' = Docker managed storage"
              />
              <InfoRow
                label="Source"
                value={mount.source}
                hint="Location on your computer"
                mono
              />
              <InfoRow
                label="Destination"
                value={mount.destination}
                hint="Location inside the container"
                mono
              />
              <InfoRow
                label="Read/Write"
                value={mount.rw ? 'Yes' : 'Read Only'}
                hint="Can the container modify files?"
              />
            </div>
          ))}
        </Section>
      )}

      {/* Labels */}
      {info.labels && Object.keys(info.labels).length > 0 && (
        <Section title="Labels" icon={<Tag size={18} />} collapsed>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-xs text-slate-400 mb-3">
            <span>🏷️</span>
            <span>Labels are metadata tags attached to the container for organization</span>
          </div>
          <div className="space-y-1">
            {Object.entries(info.labels).slice(0, 8).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50">
                <span className="text-purple-400 font-mono text-xs break-all">{key}</span>
                <span className="text-slate-600">=</span>
                <span className="text-slate-400 font-mono text-xs truncate">{value}</span>
              </div>
            ))}
            {Object.keys(info.labels).length > 8 && (
              <div className="text-xs text-slate-500 px-2 pt-2">
                +{Object.keys(info.labels).length - 8} more labels
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
};

// Section Component
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, collapsed = false }) => {
  const [isOpen, setIsOpen] = React.useState(!collapsed);

  return (
    <motion.div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-blue-400">{icon}</span>
        <span className="font-medium text-slate-200 flex-1 text-left">{title}</span>
        <motion.span
          className="text-slate-500"
          animate={{ rotate: isOpen ? 90 : 0 }}
        >
          <ChevronRight size={16} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 pt-0 space-y-3">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  badge?: boolean;
  badgeVariant?: 'success' | 'error' | 'warning' | 'info';
  highlight?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  hint,
  mono,
  badge,
  badgeVariant = 'info',
  highlight
}) => {
  const getBadgeClasses = () => {
    switch (badgeVariant) {
      case 'success': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'error': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'warning': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className={`flex items-start justify-between gap-4 py-2 px-3 rounded-lg ${highlight ? 'bg-red-500/10 border border-red-500/20' : 'hover:bg-slate-800/50'}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-slate-400">{label}</span>
        {hint && <span className="text-xs text-slate-600">{hint}</span>}
      </div>
      {badge ? (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${getBadgeClasses()}`}>
          {value}
        </span>
      ) : (
        <span className={`text-sm text-slate-200 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
      )}
    </div>
  );
};

export default ContainerInfo;
