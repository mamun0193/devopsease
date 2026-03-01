import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Hammer,
  Activity,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Layers,
  Globe,
  Network,
  FolderKanban,
  XCircle,
  User,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ResourceNav from '../components/ResourceNav';
import OverviewCard from '../components/OverviewCard';
import { useContainers, useHealthCheck } from '../hooks/useContainers';
import { useBuilds } from '../hooks/useBuilds';
import { useImages, useImageUsageSummary } from '../hooks/useImages';
import { useNetworks } from '../hooks/useNetworks';
import { useVolumes } from '../hooks/useVolumes';
import { useProjects } from '../hooks/useProjects';
import { useDockerHubStatus } from '../hooks/useDockerHub';

function formatMB(mb: number): string {
  if (!mb || mb === 0) return '0 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // ── data ─────────────────────────────────────────────────────────────────
  const { data: containers = [] } = useContainers();
  const { data: health } = useHealthCheck();
  const { data: builds = [] } = useBuilds();
  const { data: images = [] } = useImages();
  const { data: imageSummary } = useImageUsageSummary();
  const { data: networks = [] } = useNetworks();
  const { data: volumes = [] } = useVolumes();
  const { data: projects = [] } = useProjects();
  const { data: hubStatus } = useDockerHubStatus();

  // ── derived ───────────────────────────────────────────────────────────────
  const running  = containers.filter(c => c.state?.running).length;
  const stopped  = containers.filter(c =>
    ['exited', 'dead'].includes(c.state?.status?.toLowerCase() ?? ''),
  ).length;

  const activeBuilds  = builds.filter(b => b.status === 'PENDING' || b.status === 'RUNNING').length;
  const successBuilds = builds.filter(b => b.status === 'SUCCESS').length;
  const failedBuilds  = builds.filter(b => b.status === 'FAILED' || b.status === 'TIMEOUT').length;

  const danglingImages = imageSummary?.danglingImages ?? images.filter(i => i.imageUsageStatus === 'DANGLING').length;
  const totalImageMB   = imageSummary?.totalImageStorageMB ?? images.reduce((s, i) => s + (i.sizeMB ?? 0), 0);

  const activeNetworks = networks.filter(n => n.status === 'ACTIVE').length;
  const unusedNetworks = networks.filter(n => n.status === 'UNUSED').length;

  const totalVolumeMB = volumes.reduce((s, v) => s + (v.sizeMB ?? 0), 0);
  const unusedVolumes = volumes.filter(v => v.status === 'UNUSED').length;

  const runningProjects = projects.filter(p => p.status === 'RUNNING').length;
  const stoppedProjects = projects.filter(p => p.status === 'STOPPED' || p.status === 'CREATED').length;

  const isHubConnected = hubStatus?.connected === true;

  const buildStats = [
    ...(activeBuilds > 0
      ? [{ text: `${activeBuilds} active`, colorClass: 'text-blue-400', icon: <Loader2 size={10} className="animate-spin" /> }]
      : []),
    { text: `${successBuilds} passed`, colorClass: 'text-emerald-400' },
    ...(failedBuilds > 0
      ? [{ text: `${failedBuilds} failed`, colorClass: 'text-red-400' }]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />
      <ResourceNav />

      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Section title ───────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
            <h1 className="text-2xl font-bold text-slate-100">System Overview</h1>
          </div>

          {/* ── Stats grid ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Containers */}
            <OverviewCard
              icon={<Server size={13} />}
              label="Containers"
              onClick={() => navigate('/containers')}
              count={containers.length}
              stats={[
                { text: `${running} running`, colorClass: 'text-emerald-400' },
                { text: `${stopped} stopped`, colorClass: 'text-red-400' },
              ]}
            />

            {/* Builds */}
            <OverviewCard
              icon={<Hammer size={13} />}
              label="Builds"
              onClick={() => navigate('/builds')}
              count={builds.length}
              stats={buildStats}
            />

            {/* Images */}
            <OverviewCard
              icon={<Layers size={13} />}
              label="Images"
              onClick={() => navigate('/images')}
              count={images.length}
              stats={[
                { text: formatMB(totalImageMB), colorClass: 'text-slate-400' },
                ...(danglingImages > 0
                  ? [{ text: `${danglingImages} dangling`, colorClass: 'text-yellow-400' }]
                  : []),
              ]}
            />

            {/* Registry */}
            <OverviewCard
              icon={<Globe size={13} />}
              label="Registry"
              onClick={() => navigate('/registry')}
              variant="status"
              statusNode={
                isHubConnected ? (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                      <CheckCircle2 size={14} /> Connected
                    </span>
                    {hubStatus?.username && (
                      <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <User size={11} /> {hubStatus.username}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5 text-red-400 text-sm font-medium">
                    <XCircle size={14} /> Not connected
                  </span>
                )
              }
            />

            {/* Projects */}
            <OverviewCard
              icon={<FolderKanban size={13} />}
              label="Projects"
              onClick={() => navigate('/projects')}
              count={projects.length}
              stats={[
                { text: `${runningProjects} running`, colorClass: 'text-emerald-400' },
                { text: `${stoppedProjects} stopped`, colorClass: 'text-yellow-400' },
              ]}
            />

            {/* Networks */}
            <OverviewCard
              icon={<Network size={13} />}
              label="Networks"
              onClick={() => navigate('/networks')}
              count={networks.length}
              stats={[
                { text: `${activeNetworks} active`, colorClass: 'text-emerald-400' },
                ...(unusedNetworks > 0
                  ? [{ text: `${unusedNetworks} unused`, colorClass: 'text-yellow-400' }]
                  : []),
              ]}
            />

            {/* Volumes */}
            <OverviewCard
              icon={<HardDrive size={13} />}
              label="Volumes"
              onClick={() => navigate('/volumes')}
              count={volumes.length}
              stats={[
                { text: formatMB(totalVolumeMB), colorClass: 'text-slate-400' },
                ...(unusedVolumes > 0
                  ? [{ text: `${unusedVolumes} unused`, colorClass: 'text-yellow-400' }]
                  : []),
              ]}
            />

            {/* Server */}
            <OverviewCard
              icon={<Activity size={13} />}
              label="Server"
              variant="status"
              statusNode={
                health ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 size={14} /> Healthy
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
                    <AlertTriangle size={14} /> Connecting…
                  </span>
                )
              }
            />

            {/* Docker */}
            <OverviewCard
              icon={<HardDrive size={13} />}
              label="Docker"
              variant="status"
              statusNode={
                health ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 size={14} /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                    <AlertTriangle size={14} /> Unknown
                  </span>
                )
              }
            />
          </div> 

        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Footer isHealthy={!!health} containerCount={containers.length} />
    </div>
  );
};

export default HomePage;
