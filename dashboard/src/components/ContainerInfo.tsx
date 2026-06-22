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
        <Info size={48} className="text-dds-text-muted mb-4" />
        <h3 className="text-[15px] font-medium text-dds-text-primary">No Container Selected</h3>
        <p className="text-[13px] text-dds-text-secondary mt-1">Select a container to view its details</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="w-8 h-8 border-2 border-dds-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[13px] font-medium text-dds-text-muted tracking-wide">Loading container details...</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <Info size={32} className="text-dds-red mb-4" />
        <p className="text-[13px] font-medium text-dds-text-primary">Failed to load container details</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 mt-4 px-4 py-2 bg-dds-surface hover:bg-dds-bg border border-dds-border rounded-lg text-[13px] text-dds-text-primary transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start gap-3 p-4 bg-dds-surface border border-dds-border shadow-sm rounded-xl">
        <span className="text-lg">📋</span>
        <span className="text-[13px] text-dds-text-primary">
          <strong className="text-dds-primary font-medium mr-1">What is this?</strong> This shows all the technical details about your container -
          like its image, network settings, and storage. Useful for debugging configuration issues.
        </span>
      </div>


      <Section title="Basic Information" icon={<Server size={16} />}>
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
        {info.restartPolicy && info.restartPolicy.name !== 'no' && (
          <>
            <InfoRow
              label="Restart Policy"
              value={info.restartPolicy.name}
              hint="Docker restart policy for this container"
              badge
              badgeVariant="info"
            />
            <InfoRow
              label="Restart Limit"
              value={info.restartPolicy.restartLimit > 0 ? `${info.restartCount || 0} / ${info.restartPolicy.restartLimit}` : 'Unlimited'}
              hint={info.restartPolicy.restartLimit > 0 ? `Container will stop restarting after ${info.restartPolicy.restartLimit} attempts` : 'No restart limit configured'}
              highlight={info.restartPolicy.restartLimit > 0 && (info.restartCount || 0) >= info.restartPolicy.restartLimit}
            />
          </>
        )}
      </Section>

      {/* State Details */}
      <Section title="State Details" icon={<Activity size={16} />}>
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
        <Section title="Network" icon={<Network size={16} />}>
          {info.networks.map((network, index) => (
            <div key={index} className="space-y-2 pb-3 border-b border-dds-border last:border-0 last:pb-0">
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
        <Section title="Port Mappings" icon={<Globe size={16} />}>
          <div className="flex items-center gap-2 px-3 py-2 bg-dds-bg border border-dds-border/50 rounded-lg text-[12px] text-dds-text-secondary mb-3">
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
        <Section title="Environment Variables" icon={<Terminal size={16} />}>
          <div className="flex items-center gap-2 px-3 py-2 bg-dds-bg border border-dds-border/50 rounded-lg text-[12px] text-dds-text-secondary mb-3">
            <span>🔧</span>
            <span>Environment variables configure the application inside the container</span>
          </div>
          <div className="space-y-1">
            {info.environmentVariables.slice(0, 10).map((env, index) => (
              <div key={index} className="flex items-center gap-2 py-1.5 px-3 rounded hover:bg-dds-bg transition-colors">
                <span className="text-dds-primary font-mono text-[12px]">{env.key}</span>
                <span className="text-dds-text-muted">=</span>
                <span className="text-dds-text-secondary font-mono text-[12px] truncate">
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
              <div className="text-[12px] text-dds-text-muted px-3 pt-2">
                +{info.environmentVariables.length - 10} more variables
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Mounts */}
      {info.mounts && info.mounts.length > 0 && (
        <Section title="Storage Mounts" icon={<HardDrive size={16} />}>
          <div className="flex items-center gap-2 px-3 py-2 bg-dds-bg border border-dds-border/50 rounded-lg text-[12px] text-dds-text-secondary mb-3">
            <span>📁</span>
            <span>Mounts connect folders on your computer to folders inside the container</span>
          </div>
          {info.mounts.map((mount, index) => (
            <div key={index} className="space-y-2 pb-3 border-b border-dds-border last:border-0 last:pb-0">
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
        <Section title="Labels" icon={<Tag size={16} />} collapsed>
          <div className="flex items-center gap-2 px-3 py-2 bg-dds-bg border border-dds-border/50 rounded-lg text-[12px] text-dds-text-secondary mb-3">
            <span>🏷️</span>
            <span>Labels are metadata tags attached to the container for organization</span>
          </div>
          <div className="space-y-1">
            {Object.entries(info.labels).slice(0, 8).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 py-1.5 px-3 rounded hover:bg-dds-bg transition-colors">
                <span className="text-dds-blue font-mono text-[12px] break-all">{key}</span>
                <span className="text-dds-text-muted">=</span>
                <span className="text-dds-text-secondary font-mono text-[12px] truncate">{value}</span>
              </div>
            ))}
            {Object.keys(info.labels).length > 8 && (
              <div className="text-[12px] text-dds-text-muted px-3 pt-2">
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
    <motion.div className="bg-dds-surface border border-dds-border rounded-xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-dds-bg/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-dds-primary">{icon}</span>
        <span className="font-medium text-[15px] text-dds-text-primary flex-1 text-left">{title}</span>
        <motion.span
          className="text-dds-text-muted"
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
        <div className="px-4 pb-4 pt-0 space-y-1">
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
      case 'success': return 'badge badge-success';
      case 'error': return 'badge badge-failed';
      case 'warning': return 'badge badge-warning';
      default: return 'badge badge-queued';
    }
  };

  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 px-3 rounded-lg transition-colors ${highlight ? 'bg-dds-red/5 border border-dds-red/20' : 'hover:bg-dds-bg/60'}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] text-dds-text-secondary">{label}</span>
        {hint && <span className="text-[11px] text-dds-text-muted mt-0.5">{hint}</span>}
      </div>
      {badge ? (
        <span className={getBadgeClasses()}>
          {value}
        </span>
      ) : (
        <span className={`text-[13px] text-dds-text-primary text-right break-all ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</span>
      )}
    </div>
  );
};

export default ContainerInfo;
