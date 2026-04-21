import React from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../components/LandingLayout';
import {
    GitBranch, Container, Layers, Activity, Terminal,
    Lock, ArrowRight, ChevronRight, Zap, Users,
    GitMerge, BarChart2, Shield, Clock,
    CheckCircle, Cpu
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

// How It Works steps 

const STEPS = [
    {
        icon: <Lock className="w-5 h-5 text-indigo-400" />,
        step: '01',
        title: 'Register & set up your account',
        description:
            'Sign up, get your plan quota (CPU, RAM, storage), and connect GitHub for OAuth. Your resource limits are enforced from day one.',
        color: 'indigo',
    },
    {
        icon: <Container className="w-5 h-5 text-cyan-400" />,
        step: '02',
        title: 'Manage containers & images',
        description:
            'Create containers from any Docker image, write Dockerfiles in-browser, and trigger builds with real-time log streaming over WebSocket.',
        color: 'cyan',
    },
    {
        icon: <GitBranch className="w-5 h-5 text-violet-400" />,
        step: '03',
        title: 'Define & run CI/CD pipelines',
        description:
            'Connect a Git repository, define pipeline stages in YAML (build → test → deploy), and trigger runs manually or on Git push via webhooks.',
        color: 'violet',
    },
    {
        icon: <Layers className="w-5 h-5 text-emerald-400" />,
        step: '04',
        title: 'Deploy to Docker or Kubernetes',
        description:
            'Ship your built image as a Docker container or scale it across Kubernetes clusters, namespace-scoped, replica-controlled, rollback-ready.',
        color: 'emerald',
    },
    {
        icon: <BarChart2 className="w-5 h-5 text-amber-400" />,
        step: '05',
        title: 'Monitor from dashboard or CLI',
        description:
            'Track pod health, stream live logs, and manage everything from the UI or use the `devopsease` CLI with 80+ commands for full terminal control.',
        color: 'amber',
    },
];

const WHY = [
    {
        icon: <Zap className="w-5 h-5" />,
        color: 'indigo',
        title: 'Zero-config to start',
        description: 'You don\'t need to be a DevOps expert to ship your first container. DevOpsEase auto-detects your stack and does the heavy lifting.',
        points: [
            'Project-type detection (Node, Python, Go, Java, Rust)',
            'Auto-generated Dockerfiles via devopsease init',
            'Working pipeline scaffold in one interactive command',
        ],
    },
    {
        icon: <Layers className="w-5 h-5" />,
        color: 'emerald',
        title: 'One platform, full stack',
        description: 'No more gluing together Jenkins + Docker Hub + Argo CD + Grafana. Everything lives in one place with a unified API.',
        points: [
            'Git repos → CI/CD → Docker builds → K8s deployments',
            'Single auth layer across all resources',
            'Unified resource model tracks every container, image, build',
        ],
    },
    {
        icon: <Shield className="w-5 h-5" />,
        color: 'rose',
        title: 'Security built in',
        description: 'Security isn\'t an afterthought. Every layer : auth, secrets, quotas, and access control is hardened by default.',
        points: [
            'JWT dual-token auth with family-based revocation',
            'AES-encrypted secrets, never exposed in logs',
            'Per-plan CPU/RAM/storage quotas enforced at runtime',
        ],
    },
    {
        icon: <Terminal className="w-5 h-5" />,
        color: 'cyan',
        title: 'CLI-first, UI-second',
        description: 'The devopsease CLI gives you full terminal control — 25 command modules, 80+ sub-commands, JSON output for scripting.',
        points: [
            'devopsease deploy / logs / scale / rollback',
            '--json flag on all read commands for piping to jq',
            'devopsease doctor runs 7 live health checks',
        ],
    },
    {
        icon: <Users className="w-5 h-5" />,
        color: 'violet',
        title: 'Built for beginners and pros',
        description: 'Simple enough for your very first deployment, powerful enough for multi-cluster Kubernetes at production scale.',
        points: [
            'RBAC roles: operator, admin with granular permissions',
            'Free tier gets real containers, not a sandbox',
            'Scale from 2 containers (Free) to 20 (Premium)',
        ],
    },
    {
        icon: <Clock className="w-5 h-5" />,
        color: 'amber',
        title: 'Real-time everything',
        description: 'No polling, no stale data. WebSocket streams push live updates for build logs, container metrics, and deployment events.',
        points: [
            'Build logs streamed line-by-line during docker build',
            'Container CPU/memory metrics every 10 seconds',
            'Deployment status events pushed without refresh',
        ],
    },
];

//  What's inside 

const STACK = [
    { label: 'Git Integration', icon: <GitMerge className="w-4 h-4" /> },
    { label: 'CI/CD Pipelines', icon: <GitBranch className="w-4 h-4" /> },
    { label: 'Docker Builds', icon: <Container className="w-4 h-4" /> },
    { label: 'Kubernetes', icon: <Layers className="w-4 h-4" /> },
    { label: 'Observability', icon: <Activity className="w-4 h-4" /> },
    { label: 'Secrets', icon: <Lock className="w-4 h-4" /> },
    { label: 'CLI Tool', icon: <Terminal className="w-4 h-4" /> },
    { label: 'Resource Quotas', icon: <Cpu className="w-4 h-4" /> },
    { label: 'Build Intelligence', icon: <Zap className="w-4 h-4" /> },
];

//  Color maps 

const ACCENT: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

const STEP_BORDER: Record<string, string> = {
    indigo: 'border-indigo-500/30',
    cyan: 'border-cyan-500/30',
    violet: 'border-violet-500/30',
    emerald: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
};

// Page 

export const AboutPage: React.FC = () => (
    <LandingLayout>

        {/* Hero */}
        <section className="py-12 text-center relative">
            <div className="max-w-3xl mx-auto px-4">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                >
                    <span className="inline-flex items-center gap-1.5 px-3 py-3 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        About DevOpsEase
                    </span>
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
                        DevOps shouldn't be<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            a full-time job
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        DevOpsEase is a complete DevOps platform built to automate your entire workflow from
                        Git push to production, without the complexity.
                    </p>
                </motion.div>
            </div>
        </section>

        {/* What's inside — pill grid */}
        <section className="max-w-4xl mx-auto px-4 pb-14">
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={1}
                className="flex flex-wrap justify-center gap-2"
            >
                {STACK.map((s) => (
                    <span
                        key={s.label}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-sm font-medium"
                    >
                        <span className="text-indigo-400">{s.icon}</span>
                        {s.label}
                    </span>
                ))}
            </motion.div>
        </section>

        {/* How It Works */}
        <section className="py-15 bg-gray-950/50 border-y border-gray-800/50">
            <div className="max-w-7xl mx-auto px-4">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl font-bold text-white mb-3">How It Works</h2>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Five simple steps from your first commit to a running, monitored application.
                    </p>
                </motion.div>

                {/* Step flow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                    {STEPS.map((s, i) => (
                        <motion.div
                            key={i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="visible"
                            custom={i * 0.5}
                            className={`relative flex flex-col p-5 bg-gray-900 border rounded-2xl hover:border-gray-600 transition-colors ${STEP_BORDER[s.color]}`}
                        >
                            {/* connector arrow — hidden on last */}
                            {i < STEPS.length - 1 && (
                                <span className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-700 text-lg z-10">›</span>
                            )}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {s.icon}
                                </div>
                                <span className="text-xs font-bold text-gray-600 tracking-widest">{s.step}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                            <p className="text-gray-500 text-xs leading-relaxed">{s.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

        {/* Why DevOpsEase */}
        <section className="py-16 max-w-7xl mx-auto px-4">
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="text-center mb-12"
            >
                <h2 className="text-3xl font-bold text-white mb-3">Why DevOpsEase?</h2>
                <p className="text-gray-400 max-w-xl mx-auto">
                    We built the tool we wished existed when setting up DevOps from scratch.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {WHY.map((w, i) => (
                    <motion.div
                        key={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i * 0.1}
                        className="flex gap-4 p-5 bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-2xl transition-colors"
                    >
                        <div className={`p-2 rounded-xl h-fit border flex-shrink-0 ${ACCENT[w.color]}`}>
                            {w.icon}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white mb-1">{w.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-3">{w.description}</p>
                            <ul className="flex flex-col gap-1.5">
                                {w.points.map((pt, j) => (
                                    <li key={j} className="flex items-start gap-2 text-xs text-gray-500">
                                        <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${ACCENT[w.color].split(' ')[0].replace('text-', 'bg-')}`} />
                                        {pt}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-7xl mx-auto px-4 pb-24">
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-gray-900 to-cyan-500/10 p-12"
            >
                {/* CTA text */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-3">
                        From your first container to<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            production Kubernetes
                        </span>
                    </h2>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
                        Start on the Free plan with 2 containers and 512 MB RAM.
                        Upgrade as your infrastructure grows. No lock-in, no credit card to begin.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/login?tab=register"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
                        >
                            Start for Free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/features"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 hover:-translate-y-0.5 transition-all"
                        >
                            Explore Features <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        </section>

    </LandingLayout>
);

export default AboutPage;
