import React from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../components/LandingLayout';
import {
  GitBranch, Container, Layers, Activity, Terminal,
  Lock, ArrowRight, Zap, Users, GitMerge, BarChart2,
  Shield, Clock, Check, Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.1 },
  }),
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: <Lock className="w-5 h-5 text-dds-primary" strokeWidth={1.5} />,
    step: '01',
    title: 'Register & set up your account',
    description: 'Sign up, get your plan quota (CPU, RAM, storage), and connect GitHub for OAuth. Resource limits are enforced from day one.',
  },
  {
    icon: <Container className="w-5 h-5 text-dds-blue" strokeWidth={1.5} />,
    step: '02',
    title: 'Manage containers & images',
    description: 'Create containers from any Docker image, write Dockerfiles in-browser, and trigger builds with real-time log streaming.',
  },
  {
    icon: <GitBranch className="w-5 h-5 text-dds-green" strokeWidth={1.5} />,
    step: '03',
    title: 'Define & run CI/CD pipelines',
    description: 'Connect a Git repository, define pipeline stages in YAML, and trigger runs manually or on Git push via webhooks.',
  },
  {
    icon: <Layers className="w-5 h-5 text-dds-orange" strokeWidth={1.5} />,
    step: '04',
    title: 'Deploy to Docker or K8s',
    description: 'Ship your built image as a Docker container or scale it across K8s clusters, replica-controlled and rollback-ready.',
  },
  {
    icon: <BarChart2 className="w-5 h-5 text-dds-primary" strokeWidth={1.5} />,
    step: '05',
    title: 'Monitor from dashboard or CLI',
    description: 'Track pod health, stream live logs, and manage everything from the UI or use the CLI with 80+ commands.',
  },
];

const WHY = [
  {
    icon: <Zap className="w-5 h-5 text-dds-orange" strokeWidth={1.5} />,
    title: 'Zero-config to start',
    description: 'You don\'t need to be a DevOps expert to ship your first container. DevOpsEase auto-detects your stack.',
    points: [
      'Project-type detection (Node, Python, Go, Java, Rust)',
      'Auto-generated Dockerfiles via CLI',
      'Working pipeline scaffold in one command',
    ],
  },
  {
    icon: <Layers className="w-5 h-5 text-dds-blue" strokeWidth={1.5} />,
    title: 'One platform, full stack',
    description: 'No more gluing together Jenkins + Docker Hub + Argo CD + Grafana. Everything lives in one place.',
    points: [
      'Git repos → CI/CD → Docker builds → K8s deployments',
      'Single auth layer across all resources',
      'Unified resource model tracks every container, image, build',
    ],
  },
  {
    icon: <Shield className="w-5 h-5 text-dds-red" strokeWidth={1.5} />,
    title: 'Security built in',
    description: 'Security isn\'t an afterthought. Every layer—auth, secrets, quotas, and access control—is hardened by default.',
    points: [
      'JWT dual-token auth with refresh rotation',
      'AES-encrypted secrets, never exposed in logs',
      'Per-plan CPU/RAM/storage quotas enforced at runtime',
    ],
  },
  {
    icon: <Terminal className="w-5 h-5 text-dds-green" strokeWidth={1.5} />,
    title: 'CLI-first, UI-second',
    description: 'The CLI gives you full terminal control — 25 command modules, 80+ sub-commands, JSON output for scripting.',
    points: [
      'devopsease deploy / logs / scale / rollback',
      '--json flag on all read commands for piping to jq',
      'devopsease doctor runs 7 live health checks',
    ],
  },
  {
    icon: <Users className="w-5 h-5 text-dds-primary" strokeWidth={1.5} />,
    title: 'Built for beginners and pros',
    description: 'Simple enough for your very first deployment, powerful enough for multi-cluster Kubernetes at scale.',
    points: [
      'RBAC roles: operator, admin with granular permissions',
      'Free tier gets real containers, not a sandbox',
      'Scale from 2 containers (Free) to infinite (Enterprise)',
    ],
  },
  {
    icon: <Clock className="w-5 h-5 text-dds-blue" strokeWidth={1.5} />,
    title: 'Real-time everything',
    description: 'No polling, no stale data. WebSocket streams push live updates for build logs, metrics, and deployments.',
    points: [
      'Build logs streamed line-by-line during docker build',
      'Container CPU/memory metrics streamed constantly',
      'Deployment status events pushed without refresh',
    ],
  },
];

const STACK = [
  { label: 'Git Integration', icon: <GitMerge className="w-4 h-4" /> },
  { label: 'CI/CD Pipelines', icon: <GitBranch className="w-4 h-4" /> },
  { label: 'Docker Builds', icon: <Container className="w-4 h-4" /> },
  { label: 'Kubernetes', icon: <Layers className="w-4 h-4" /> },
  { label: 'Observability', icon: <Activity className="w-4 h-4" /> },
  { label: 'Secrets', icon: <Lock className="w-4 h-4" /> },
  { label: 'CLI Tool', icon: <Terminal className="w-4 h-4" /> },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AboutPage: React.FC = () => (
  <LandingLayout>
    {/* ── Split Hero ─────────────────────────────────────────────────────── */}
    <section className="py-20 border-b border-dds-border/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — headline */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
            <h1 className="text-4xl md:text-5xl font-bold text-dds-white leading-tight">
              DevOps shouldn't <br/> be  
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400 px-3">
                a full-time job
              </span>
            </h1>
          </motion.div>

          {/* Right — description */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <p className="text-dds-text-secondary text-lg leading-relaxed mb-8">
              DevOpsEase is a complete DevOps platform built to automate your entire workflow from
              Git push to production, without the complexity.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/features" className="btn-primary px-6 py-3 text-sm">
                Explore Features <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>

    {/* ── What's inside — pill grid ────────────────────────────────────────── */}
    <section className="py-8 border-b border-dds-border/50 bg-dds-bg/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={1}
          className="flex flex-wrap justify-center gap-3"
        >
          {STACK.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-dds-surface border border-dds-border text-dds-text-secondary text-sm font-medium transition-colors hover:text-dds-white hover:border-dds-text-muted"
            >
              <span className="text-dds-primary">{s.icon}</span>
              {s.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>

    {/* ── How It Works ─────────────────────────────────────────────────────── */}
    <section className="py-10 border-b border-dds-border/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl font-bold text-dds-white mb-4">How It Works</h2>
          <p className="text-dds-text-secondary max-w-xl mx-auto text-lg">
            Five simple steps from your first commit to a running, monitored application.
          </p>
        </motion.div>

        {/* Step flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i * 0.2}
              className="card flex flex-col p-6 relative group"
            >
              {/* Connector line on desktop */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-[1px] bg-dds-border -z-10 -ml-4" />
              )}
              
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-[6px] bg-dds-elevated flex items-center justify-center border border-dds-border">
                  {s.icon}
                </div>
                <span className="text-xs font-bold text-dds-text-muted tracking-widest bg-dds-bg px-2 py-1 rounded-[4px] border border-dds-border">
                  {s.step}
                </span>
              </div>
              
              <h3 className="text-base font-bold text-dds-white mb-2 tracking-tight">{s.title}</h3>
              <p className="text-dds-text-secondary text-[14px] leading-relaxed flex-1">
                {s.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Why DevOpsEase ───────────────────────────────────────────────────── */}
    <section className="py-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl font-bold text-dds-white mb-4">Why DevOpsEase?</h2>
        <p className="text-dds-text-secondary max-w-xl mx-auto text-lg">
          We built the tool we wished existed when setting up DevOps from scratch.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {WHY.map((w, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={i * 0.1}
            className="card card-interactive flex flex-col p-8 gap-5"
          >
            <div className="flex items-center gap-4 mb-1">
              <div className="p-2.5 rounded-[6px] bg-dds-elevated border border-dds-border">
                {w.icon}
              </div>
              <h3 className="text-lg font-bold text-dds-white tracking-tight">{w.title}</h3>
            </div>
            
            <p className="text-dds-text-secondary text-[15px] leading-relaxed">
              {w.description}
            </p>
            
            <ul className="flex flex-col gap-2.5 mt-auto pt-4 border-t border-dds-border/50">
              {w.points.map((pt, j) => (
                <li key={j} className="flex items-start gap-3 text-sm text-dds-text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-dds-border mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>

    {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
    <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="rounded-[6px] border border-dds-primary/20 bg-dds-elevated p-12 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-dds-white mb-4">
          From your first container to<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">
            production Kubernetes
          </span>
        </h2>
        <p className="text-dds-text-secondary mb-8 max-w-xl mx-auto text-[15px] leading-relaxed">
          Start on the Free plan with 2 containers and 512 MB RAM. Upgrade as your infrastructure grows. No lock-in, no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login?tab=register" className="btn-primary px-8 py-3 text-sm">
            Start for Free
          </Link>
          <Link to="/features" className="btn-secondary px-8 py-3 text-sm">
            Explore Features
          </Link>
        </div>
      </motion.div>
    </section>

  </LandingLayout>
);

export default AboutPage;
