import React from 'react';

export type DeploymentEnvironment = 'dev' | 'staging' | 'production';

interface EnvironmentBadgeProps {
  environment: DeploymentEnvironment;
}

const config: Record<DeploymentEnvironment, { label: string; className: string }> = {
  dev: {
    label: 'dev',
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  },
  staging: {
    label: 'staging',
    className: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  },
  production: {
    label: 'production',
    className: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  },
};

const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ environment }) => {
  const c = config[environment] ?? config.dev;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${c.className}`}>
      {c.label}
    </span>
  );
};

export default EnvironmentBadge;
