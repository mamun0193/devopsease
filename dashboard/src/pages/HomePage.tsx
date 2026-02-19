import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Server,
  Hammer,
  Activity,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Header from '../components/Header';
import ResourceNav from '../components/ResourceNav';
import { useContainers, useHealthCheck } from '../hooks/useContainers';
import { useBuilds } from '../hooks/useBuilds';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: containers = [] } = useContainers();
  const { data: health } = useHealthCheck();
  const { data: builds = [] } = useBuilds();

  const running = containers.filter(c => c.state?.running).length;
  const stopped = containers.filter(c => ['exited', 'dead'].includes(c.state?.status?.toLowerCase() || '')).length;
  const activeBuilds = builds.filter(b => b.status === 'PENDING' || b.status === 'RUNNING').length;
  const successBuilds = builds.filter(b => b.status === 'SUCCESS').length;
  const failedBuilds = builds.filter(b => b.status === 'FAILED' || b.status === 'TIMEOUT').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />
      <ResourceNav />
      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Status banner */}
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
            <h1 className="text-2xl font-bold text-slate-100">System Overview</h1>
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <motion.div
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-colors"
              onClick={() => navigate('/containers')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                <Server size={13} /> Containers
              </div>
              <p className="text-2xl font-bold text-slate-100">{containers.length}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-emerald-400">{running} running</span>
                <span className="text-slate-600">·</span>
                <span className="text-red-400">{stopped} stopped</span>
              </div>
            </motion.div>

            <motion.div
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-colors"
              onClick={() => navigate('/builds')}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                <Hammer size={13} /> Builds
              </div>
              <p className="text-2xl font-bold text-slate-100">{builds.length}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                {activeBuilds > 0 && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Loader2 size={10} className="animate-spin" /> {activeBuilds} active
                  </span>
                )}
                <span className="text-emerald-400">{successBuilds} passed</span>
                {failedBuilds > 0 && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span className="text-red-400">{failedBuilds} failed</span>
                  </>
                )}
              </div>
            </motion.div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                <Activity size={13} /> Server
              </div>
              <div className="flex items-center gap-2 mt-1">
                {health ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 size={14} /> Healthy
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium">
                    <AlertTriangle size={14} /> Connecting…
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                <HardDrive size={13} /> Docker
              </div>
              <div className="flex items-center gap-2 mt-1">
                {health ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 size={14} /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                    <AlertTriangle size={14} /> Unknown
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <motion.button
              onClick={() => navigate('/containers')}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 text-left transition-colors group"
              whileHover={{ scale: 1.005 }}
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Server size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-slate-100">Manage Containers</p>
                <p className="text-xs text-slate-500 mt-0.5">View, start, stop, and inspect running containers</p>
              </div>
            </motion.button>

            <motion.button
              onClick={() => navigate('/builds')}
              className="flex items-center gap-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 text-left transition-colors group"
              whileHover={{ scale: 1.005 }}
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Hammer size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-slate-100">Image Builds</p>
                <p className="text-xs text-slate-500 mt-0.5">Build images from Dockerfiles with live log streaming</p>
              </div>
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
