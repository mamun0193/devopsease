import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Terminal, FileText, Check, GitBranch, Hammer, Rocket, BarChart2, TerminalSquare } from 'lucide-react';
import { LandingLayout } from '../components/LandingLayout';
import { useAuth } from '../context/AuthContext';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5 }
    }
};

const HOW_IT_WORKS_STEPS = [
    {
        icon: <GitBranch className="w-5 h-5 text-dds-primary" />,
        step: '01',
        title: 'Connect your Git repository',
        description: 'Link any GitHub or Git repo in seconds. No complex webhooks to configure.',
    },
    {
        icon: <Hammer className="w-5 h-5 text-dds-green" />,
        step: '02',
        title: 'Push your code',
        description: 'A simple git push triggers your pipeline automatically. No manual steps.',
    },
    {
        icon: <TerminalSquare className="w-5 h-5 text-dds-orange" />,
        step: '03',
        title: 'DevOpsEase builds your app',
        description: 'Your pipeline runs: install dependencies, run tests, build the Docker image.',
    },
    {
        icon: <Rocket className="w-5 h-5 text-dds-blue" />,
        step: '04',
        title: 'Deploy with Docker or Kubernetes',
        description: 'Ship to a container locally or scale across Kubernetes clusters, your choice.',
    },
    {
        icon: <BarChart2 className="w-5 h-5 text-dds-primary" />,
        step: '05',
        title: 'Monitor from dashboard or CLI',
        description: 'Track pod status, stream live logs, and debug issues from one unified view.',
    },
];

export const LandingPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (location.hash) {
            const element = document.getElementById(location.hash.replace('#', ''));
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, [location]);

    return (
        <LandingLayout>
            {/* Hero Section */}
            <section className="relative pt-14 pb-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-dds-primary/10 border border-dds-primary/20 text-dds-primary text-sm font-medium mb-8">
                            <span className="w-2 h-2 rounded-full bg-dds-primary animate-pulse" />
                            v1.0 is now live
                        </motion.div>

                        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-dds-white mb-6">
                            From Code to Production{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">
                                Simplified.
                            </span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-xl text-dds-text-secondary max-w-2xl mx-auto mb-4 leading-relaxed">
                            DevOpsEase automates your entire workflow from Git push to deployment. Build, test, deploy, and monitor applications using CI/CD, Docker, Kubernetes, and a powerful CLI.
                        </motion.p>

                        <motion.p variants={itemVariants} className="text-base text-dds-text-muted mb-10">
                            No complex setup. No DevOps headache.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className="btn-primary px-8 py-3 text-base"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <Link
                                    to="/login?tab=register"
                                    className="btn-primary px-8 py-3 text-base"
                                >
                                    Start for Free
                                </Link>
                            )}
                            <a
                                href="https://github.com/mamun0193/devopsease"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary px-8 py-3 text-base"
                            >
                                View on GitHub
                            </a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="about" className="py-16 bg-dds-surface/30 border-y border-dds-border/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-dds-white mb-4">How DevOpsEase Works</h2>
                        <p className="text-dds-text-secondary max-w-xl mx-auto">
                            Five simple steps from your first commit to a running, monitored application.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {HOW_IT_WORKS_STEPS.map((s, i) => (
                            <div key={i} className="card card-interactive flex flex-col items-start p-6 min-h-[170px]">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-9 h-9 bg-dds-elevated rounded-[6px] flex items-center justify-center flex-shrink-0">
                                        {s.icon}
                                    </div>
                                    <span className="text-xs font-bold text-dds-text-muted tracking-widest">{s.step}</span>
                                </div>
                                <h3 className="text-sm font-bold text-dds-white mb-2">{s.title}</h3>
                                <p className="text-dds-text-secondary text-sm leading-relaxed">{s.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            to="/about"
                            className="btn-primary px-6 py-2.5 text-sm"
                        >
                            Know More →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-12 bg-dds-surface/30 border-b border-dds-border/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-dds-white mb-4">Everything You Need for Modern DevOps</h2>
                        <p className="text-dds-text-secondary max-w-2xl mx-auto">
                            From code push to production, every DevOps tool you need, in one place.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FeatureCard
                            icon={<TerminalSquare className="w-6 h-6 text-dds-primary" />}
                            title="CI/CD Pipelines"
                            description="Automate build, test, and deployment with simple pipeline configs."
                            features={['Git integration', 'Auto build & deploy', 'Pipeline-based workflows']}
                        />
                        <FeatureCard
                            icon={<Activity className="w-6 h-6 text-dds-green" />}
                            title="Docker + Kubernetes"
                            description="Run containers locally or scale with Kubernetes clusters."
                            features={['Cluster & namespace control', 'Scaling (replicas)', 'Service & ingress support']}
                        />
                        <FeatureCard
                            icon={<FileText className="w-6 h-6 text-dds-orange" />}
                            title="Observability"
                            description="Track logs, monitor pods, and debug issues instantly."
                            features={['Logs & status tracking', 'Health monitoring', 'Debug instantly']}
                        />
                        <FeatureCard
                            icon={<Terminal className="w-6 h-6 text-dds-blue" />}
                            title="CLI + Dashboard"
                            description="Control everything from terminal or UI — your choice."
                            features={['Simple commands', 'Full control from terminal', 'Beginner-friendly UI']}
                        />
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            to="/features"
                            className="btn-primary px-6 py-2.5 text-sm"
                        >
                            Explore Features →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-dds-white mb-4">Simple, transparent pricing</h2>
                        <p className="text-dds-text-secondary">Start for free, upgrade as you grow.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        <PricingCard
                            title="Free"
                            price="₹0"
                            description="Perfect for getting started"
                            features={[
                                '2 containers · 1 CPU core',
                                '512 MB RAM · 1 GB storage (ephemeral)',
                                'Basic CI/CD pipelines',
                                'Docker builds & deployments',
                                'Community support',
                            ]}
                            footer={
                                <div className="flex flex-col gap-3 w-full">
                                    <a
                                        href="https://github.com/mamun0193/devopsease"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary w-full justify-center py-2.5"
                                    >
                                        Star on GitHub
                                    </a>
                                    <Link
                                        to="/login?tab=register"
                                        className="btn-primary w-full justify-center py-2.5"
                                    >
                                        Get Started
                                    </Link>
                                </div>
                            }
                        />
                        <PricingCard
                            title="Pro"
                            price="₹199"
                            isPopular
                            description="For serious developers"
                            features={[
                                '10 containers · 4 CPU cores',
                                '4 GB RAM · 10 GB storage (persistent)',
                                'Advanced CI/CD pipelines',
                                'Kubernetes deployments',
                                'Secrets management',
                                '7-day log retention',
                                'Priority support',
                            ]}
                            highlight
                            footer={
                                <Link
                                    to="/login?tab=register"
                                    className="btn-primary w-full justify-center py-2.5"
                                >
                                    Get Started
                                </Link>
                            }
                        />
                        <PricingCard
                            title="Premium"
                            price="₹399"
                            description="For teams and scale"
                            features={[
                                '20 containers · 8 CPU cores',
                                '16 GB RAM · 25 GB storage (persistent)',
                                'Multi-cluster Kubernetes',
                                'Full observability (pods, logs)',
                                '30-day log retention',
                                'Dedicated support',
                            ]}
                            footer={
                                <button className="btn-secondary w-full justify-center py-2.5">
                                    Contact Sales
                                </button>
                            }
                        />
                    </div>
                </div>
            </section>
        </LandingLayout>
    );
};

// Sub-components
const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, features: string[] }> = ({ icon, title, description, features }) => (
    <div className="card card-interactive p-6 h-full flex flex-col">
        <div className="w-10 h-10 bg-dds-elevated rounded-[6px] flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-base font-bold text-dds-white mb-2">{title}</h3>
        <p className="text-dds-text-secondary text-sm leading-relaxed mb-5">{description}</p>
        <ul className="space-y-2 mt-auto">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-dds-text-secondary text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-dds-border flex-shrink-0" />
                    {feature}
                </li>
            ))}
        </ul>
    </div>
);

const PricingCard: React.FC<{
    title: string,
    price: string,
    features: string[],
    description: string,
    isPopular?: boolean,
    footer: React.ReactNode,
    highlight?: boolean
}> = ({ title, price, features, description, isPopular, footer, highlight }) => (
    <div className={`p-5 rounded-[6px] border flex flex-col relative ${highlight ? 'bg-dds-elevated border-dds-primary/30 shadow-xl shadow-dds-primary/10' : 'bg-dds-surface border-dds-border'}`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 bg-dds-primary text-white text-xs font-bold rounded-[6px] uppercase tracking-wide">
                Most Popular
            </div>
        )}
        <div className="mb-5">
            <h3 className="text-base font-semibold text-dds-text-secondary mb-1">{title}</h3>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-dds-white">{price}</span>
                <span className="text-dds-text-muted text-sm">/mo</span>
            </div>
            <p className="text-dds-text-muted text-sm mt-1">{description}</p>
        </div>

        <ul className="space-y-2.5 mb-5 flex-grow">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-dds-text-secondary text-sm">
                    <div className={`p-0.5 rounded-[4px] flex-shrink-0 ${highlight ? 'bg-dds-primary/20 text-dds-primary' : 'bg-dds-elevated text-dds-text-muted'}`}>
                        <Check className="w-3 h-3" />
                    </div>
                    {feature}
                </li>
            ))}
        </ul>

        {footer}
    </div>
);
