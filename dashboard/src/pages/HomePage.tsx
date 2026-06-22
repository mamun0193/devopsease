import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Hammer,
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
  Rocket,
  GitBranch,
  Cloud,
  Box,
} from 'lucide-react';
import AppFooter from '../components/AppFooter';
import OverviewCard from '../components/OverviewCard';
import ResourceUsagePanel from '../components/ResourceUsagePanel';
import TopContainersPanel from '../components/TopContainersPanel';
import RecentDeploymentsTable from '../components/RecentDeploymentsTable';
import { useContainers, useHealthCheck } from '../hooks/useContainers';
import { useBuilds } from '../hooks/useBuilds';
import { useImages, useImageUsageSummary } from '../hooks/useImages';
import { useNetworks } from '../hooks/useNetworks';
import { useVolumes } from '../hooks/useVolumes';
import { useProjects } from '../hooks/useProjects';
import { useRepos } from '../hooks/useRepos';
import { useDockerHubStatus } from '../hooks/useDockerHub';
import { useDeployments } from '../hooks/useDeployments';
import { useClusters } from '../hooks/useClusters';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
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
  const { data: repos = [] } = useRepos();
  const { data: hubStatus } = useDockerHubStatus();
  const { data: deployments = [] } = useDeployments();
  const { data: clusters = [] } = useClusters();

  // ── derived ───────────────────────────────────────────────────────────────
  const running = containers.filter(c => c.state?.running).length;
  const stopped = containers.filter(c =>
    ['exited', 'dead'].includes(c.state?.status?.toLowerCase() ?? ''),
  ).length;

  const activeBuilds = builds.filter(b => b.status === 'pending' || b.status === 'running').length;
  const successBuilds = builds.filter(b => b.status === 'success').length;
  const failedBuilds = builds.filter(b => b.status === 'failed' || b.status === 'timeout').length;

  const danglingImages = imageSummary?.danglingImages ?? images.filter(i => i.imageUsageStatus === 'DANGLING').length;
  const totalImageMB = imageSummary?.totalImageStorageMB ?? images.reduce((s, i) => s + (i.sizeMB ?? 0), 0);

  const activeNetworks = networks.filter(n => n.status === 'ACTIVE').length;
  const unusedNetworks = networks.filter(n => n.status === 'UNUSED').length;

  const totalVolumeMB = volumes.reduce((s, v) => s + (v.sizeMB ?? 0), 0);
  const unusedVolumes = volumes.filter(v => v.status === 'UNUSED').length;

  const runningProjects = projects.filter(p => p.status === 'RUNNING').length;

  const connectedClusters = clusters.filter(c => c.status === 'connected').length;
  const offlineClusters = clusters.filter(c => c.status === 'failed').length;
  const stoppedProjects = projects.filter(p => p.status === 'STOPPED' || p.status === 'CREATED').length;

  // Repo-derived values for the Projects card
  const connectedRepos = repos.filter(r => r.status === 'active').length;
  const lastRepo = repos.length > 0
    ? [...repos].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;
  const lastRepoLabel = lastRepo?.repoName
    ? lastRepo.repoName.length > 20
      ? lastRepo.repoName.slice(0, 20) + '…'
      : lastRepo.repoName
    : null;

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

  const deployRunning = deployments.filter(d => d.status === 'running').length;
  const deployDeploying = deployments.filter(d => d.status === 'deploying').length;
  const deployFailed = deployments.filter(d => d.status === 'failed').length;
  const deployStopped = deployments.filter(d => d.status === 'stopped').length;

  const deployStats = [
    ...(deployRunning > 0 ? [{ text: `${deployRunning} running`, colorClass: 'text-emerald-400' }] : []),
    ...(deployDeploying > 0 ? [{ text: `${deployDeploying} deploying`, colorClass: 'text-amber-400', icon: <Loader2 size={10} className="animate-spin" /> }] : []),
    ...(deployFailed > 0 ? [{ text: `${deployFailed} failed`, colorClass: 'text-red-400' }] : []),
    ...(deployStopped > 0 ? [{ text: `${deployStopped} stopped`, colorClass: 'text-slate-400' }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-dds-bg text-dds-white">
      
      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">



          {/* ── Stats grid ──────────────────────────────────────────────── */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >

            {/* Containers */}
            <OverviewCard
              col={0}
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
              col={1}
              icon={<Hammer size={13} />}
              label="Builds"
              onClick={() => navigate('/builds')}
              count={builds.length}
              stats={buildStats}
            />

            {/* Deployments */}
            <OverviewCard
              col={2}
              icon={<Rocket size={13} />}
              label="Deployments"
              onClick={() => navigate('/deployments')}
              count={deployments.length}
              stats={deployStats}
            />

            {/* Clusters */}
            <OverviewCard
              col={0}
              icon={<Cloud size={13} />}
              label="Clusters"
              onClick={() => navigate('/clusters')}
              count={clusters.length}
              stats={[
                ...(connectedClusters > 0
                  ? [{ text: `${connectedClusters} connected`, colorClass: 'text-emerald-400' }]
                  : [{ text: 'No clusters connected', colorClass: 'text-slate-500' }]),
                ...(offlineClusters > 0
                  ? [{ text: `${offlineClusters} offline`, colorClass: 'text-red-400' }]
                  : []),
              ]}
            />

            {/* Pods */}
            <OverviewCard
              col={1}
              icon={<Box size={13} />}
              label="Pods"
              onClick={() => navigate('/pods')}
              count={clusters.length > 0 ? clusters.length : 0}
              stats={[
                clusters.length > 0
                  ? { text: `across ${clusters.length} cluster${clusters.length !== 1 ? 's' : ''}`, colorClass: 'text-slate-400' }
                  : { text: 'No clusters available', colorClass: 'text-slate-500' },
              ]}
            />

            {/* Images */}
            <OverviewCard
              col={2}
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
              col={0}
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

            {/* Repositories */}
            <OverviewCard
              col={1}
              icon={<GitBranch size={13} />}
              label="Repositories"
              onClick={() => navigate('/repositories')}
              count={repos.length}
              stats={[
                ...(connectedRepos > 0
                  ? [{ text: `${connectedRepos} connected`, colorClass: 'text-emerald-400' }]
                  : [{ text: 'No repos linked', colorClass: 'text-slate-500' }]),
                ...(lastRepoLabel
                  ? [{ text: `latest: ${lastRepoLabel}`, colorClass: 'text-slate-400' }]
                  : []),
              ]}
            />

            {/* Projects */}
            <OverviewCard
              col={2}
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
              col={0}
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
              col={1}
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

            {/* Docker */}
            <OverviewCard
              col={2}
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

          </motion.div>

          <div className="flex flex-col gap-6">
            {/* Recent Deployments Table */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
              <RecentDeploymentsTable />
            </motion.div>

            {/* Top Containers */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.55 }}>
              <TopContainersPanel />
            </motion.div>

            {/* Resource Quota Panel */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.45 }}>
              <ResourceUsagePanel />
            </motion.div>
          </div>

        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <AppFooter isHealthy={!!health} containerCount={containers.length} />
    </div>
  );
};

export default HomePage;
