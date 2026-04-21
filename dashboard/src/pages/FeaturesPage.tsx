import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../components/LandingLayout';
import {
    GitBranch, Cpu, Container, Globe, Shield, Terminal,
    Activity, Layers, Zap, RefreshCw, Lock, BarChart2,
    CheckCircle, ArrowRight, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

//  Data    

const CATEGORIES = ['All', 'CI/CD', 'Docker', 'Kubernetes', 'Observability', 'Security', 'CLI'];

const FEATURES = [
    //  CI/CD 
    {
        category: 'CI/CD',
        icon: <GitBranch className="w-6 h-6" />,
        color: 'indigo',
        title: 'Git-Driven CI/CD Pipelines',
        description:
            'Define your entire pipeline in a devopsease.yml file. Push to Git and DevOpsEase automatically builds, tests, and deploys — no manual steps.',
        bullets: [
            'Automatic trigger on Git push',
            'YAML-defined pipeline stages',
            'Build → Test → Deploy ordering',
            'Pipeline status & log streaming',
        ],
    },
    {
        category: 'CI/CD',
        icon: <RefreshCw className="w-6 h-6" />,
        color: 'violet',
        title: 'Rollbacks & Deployments',
        description:
            'Every deployment is versioned. Roll back to any previous stable state in seconds — no downtime, no drama.',
        bullets: [
            'One-click rollback to any build',
            'Desired-state reconciliation',
            'Blue/green deployment support',
            'Deployment history with diffs',
        ],
    },
    {
        category: 'CI/CD',
        icon: <Zap className="w-6 h-6" />,
        color: 'indigo',
        title: 'Build Intelligence',
        description:
            'Automated failure analysis explains why a build broke in plain English — not raw stack traces.',
        bullets: [
            'Failure category detection',
            'Plain-English error explanations',
            'Build log parsing & highlights',
            'Retry with context awareness',
        ],
    },

    //  Docker 
    {
        category: 'Docker',
        icon: <Container className="w-6 h-6" />,
        color: 'cyan',
        title: 'Docker Builds & Deployments',
        description:
            'Auto-detect your project type and build optimized Docker images. Deploy containers instantly with resource limits enforced per plan.',
        bullets: [
            'Auto Dockerfile generation',
            'Image build & push to registry',
            'Per-plan CPU & memory limits',
            'Volume & network management',
        ],
    },
    {
        category: 'Docker',
        icon: <Globe className="w-6 h-6" />,
        color: 'cyan',
        title: 'Public Tunnels',
        description:
            'Expose any running container to the internet instantly with a secure public URL. Perfect for testing webhooks and demos.',
        bullets: [
            'One-click tunnel creation',
            'Auto-revoke on container stop',
            'Scoped per user & container',
            'Audit trail for all tunnels',
        ],
    },

    //  Kubernetes 
    {
        category: 'Kubernetes',
        icon: <Layers className="w-6 h-6" />,
        color: 'emerald',
        title: 'Kubernetes Orchestration',
        description:
            'Manage clusters, namespaces, deployments, and services from a single dashboard. Scale replicas with one click.',
        bullets: [
            'Multi-cluster support',
            'Namespace & deployment management',
            'One-click replica scaling',
            'Ingress & service routing',
        ],
    },
    {
        category: 'Kubernetes',
        icon: <Cpu className="w-6 h-6" />,
        color: 'emerald',
        title: 'Kubernetes Dashboard',
        description:
            'Unified view of all cluster resources — pods, deployments, services — with namespace filtering and auto-refresh.',
        bullets: [
            'Aggregated cluster overview',
            'Namespace selector',
            'Pod shell access (exec)',
            'Auto-refresh every 30s',
        ],
    },

    //  Observability 
    {
        category: 'Observability',
        icon: <Activity className="w-6 h-6" />,
        color: 'amber',
        title: 'Real-Time Observability',
        description:
            'Live container metrics, pod health, and log streaming. Know exactly what\'s happening in your infrastructure at all times.',
        bullets: [
            'Live CPU & memory charts',
            'Pod status & event tracking',
            'Structured log streaming',
            'Health alerts with thresholds',
        ],
    },
    {
        category: 'Observability',
        icon: <BarChart2 className="w-6 h-6" />,
        color: 'amber',
        title: 'Resource Monitor',
        description:
            'Continuous Docker stats collection every 10 seconds. Alerts fire automatically when thresholds are breached — before things break.',
        bullets: [
            '10-second polling interval',
            'CPU & memory threshold alerts',
            'Container count tracking',
            'Historical metrics retention',
        ],
    },

    //  Security 
    {
        category: 'Security',
        icon: <Lock className="w-6 h-6" />,
        color: 'rose',
        title: 'Secrets Management',
        description:
            'Store and inject environment-specific secrets securely. Encrypted at rest, scoped per environment, never exposed in logs.',
        bullets: [
            'AES-encrypted secret storage',
            'Per-environment scoping',
            'Auto-injected at deploy time',
            'Audit log for secret access',
        ],
    },
    {
        category: 'Security',
        icon: <Shield className="w-6 h-6" />,
        color: 'rose',
        title: 'Security & Quotas',
        description:
            'Plan-based resource quotas enforced at the runtime level. Brute-force protection, JWT refresh tokens, and role-based access.',
        bullets: [
            'Per-plan CPU / RAM / storage quotas',
            'Rate limiting by action type',
            'RBAC with operator & admin roles',
            'Brute-force & session protection',
        ],
    },

    //  CLI 
    {
        category: 'CLI',
        icon: <Terminal className="w-6 h-6" />,
        color: 'cyan',
        title: 'Powerful CLI Tool',
        description:
            'Everything available in the dashboard is also in the CLI. Automate workflows, script deployments, and integrate with your existing tooling.',
        bullets: [
            'Full parity with dashboard',
            'devopsease deploy / logs / scale',
            'Scriptable for CI automation',
            'JSON output for pipelines',
        ],
    },
];

//  Color maps 

const BG: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    violet: 'bg-violet-500/10 text-violet-400',
};

const BORDER: Record<string, string> = {
    indigo: 'border-indigo-500/20 hover:border-indigo-500/50',
    cyan: 'border-cyan-500/20 hover:border-cyan-500/50',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/50',
    amber: 'border-amber-500/20 hover:border-amber-500/50',
    rose: 'border-rose-500/20 hover:border-rose-500/50',
    violet: 'border-violet-500/20 hover:border-violet-500/50',
};

const DOT: Record<string, string> = {
    indigo: 'bg-indigo-400',
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    violet: 'bg-violet-400',
};

//  Cards

const FeatureCard: React.FC<{ feature: typeof FEATURES[0]; index: number }> = ({ feature, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.05 }}
        className={`group flex flex-col gap-4 p-6 rounded-2xl border bg-gray-900/50 backdrop-blur-sm transition-all duration-300 ${BORDER[feature.color]}`}
    >
        {/* Icon + title */}
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl flex-shrink-0 ${BG[feature.color]}`}>
                {feature.icon}
            </div>
            <div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${BG[feature.color].split(' ')[1]} mb-1 inline-block`}>
                    {feature.category}
                </span>
                <h3 className="text-base font-semibold text-white leading-snug">{feature.title}</h3>
            </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>

        {/* Bullets */}
        <ul className="flex flex-col gap-1.5 mt-auto">
            {feature.bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT[feature.color]}`} />
                    {b}
                </li>
            ))}
        </ul>
    </motion.div>
);


export const FeaturesPage: React.FC = () => {
    const [active, setActive] = useState('All');

    const filtered = active === 'All'
        ? FEATURES
        : FEATURES.filter(f => f.category === active);

    return (
        <LandingLayout>
            {/* Hero */}
            <section className="py-12 text-center relative">
                <div className="max-w-3xl mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Everything in one platform
                        </span>
                        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                            Features built for<br />
                            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                                real DevOps workflows
                            </span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-xl mx-auto">
                            From your first Git push to production at scale — DevOpsEase covers every step of the pipeline.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Filter Tabs */}
            <section className="mb-6 sticky top-12 z-40 bg-gray-900/80 backdrop-blur-md py-3 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto scrollbar-hide">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActive(cat)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${active === cat
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:text-white hover:border-gray-500'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </section>

            {/* Grid */}
            <section className="max-w-7xl mx-auto px-4 pb-24">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((feature, i) => (
                        <FeatureCard key={feature.title} feature={feature} index={i} />
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-20 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-gray-900 to-cyan-500/10 p-12 text-center"
                >
                    <h2 className="text-3xl font-bold text-white mb-3">Ready to simplify your DevOps?</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                        Start for free. No credit card required. Upgrade as your infrastructure grows.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            to="/login?tab=register"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
                        >
                            Start for Free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/docs"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 hover:-translate-y-0.5 transition-all"
                        >
                            Read the Docs <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            </section>
        </LandingLayout>
    );
};

export default FeaturesPage;
