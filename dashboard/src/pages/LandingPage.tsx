import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Box, Activity, Terminal, FileText, Check, GitBranch, Hammer, Rocket, BarChart2 } from 'lucide-react';
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
        icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
        step: '01',
        title: 'Connect your Git repository',
        description: 'Link any GitHub or Git repo in seconds. No complex webhooks to configure.',
    },
    {
        icon: <Hammer className="w-5 h-5 text-emerald-400" />,
        step: '02',
        title: 'Push your code',
        description: 'A simple git push triggers your pipeline automatically. No manual steps.',
    },
    {
        icon: <Box className="w-5 h-5 text-amber-400" />,
        step: '03',
        title: 'DevOpsEase builds your app',
        description: 'Your pipeline runs: install dependencies, run tests, build the Docker image.',
    },
    {
        icon: <Rocket className="w-5 h-5 text-cyan-400" />,
        step: '04',
        title: 'Deploy with Docker or Kubernetes',
        description: 'Ship to a container locally or scale across Kubernetes clusters, your choice.',
    },
    {
        icon: <BarChart2 className="w-5 h-5 text-purple-400" />,
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
                // Add a small delay to ensure rendering is complete
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
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            v1.0 is now live
                        </motion.div>

                        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
                            From Code to Production{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                                Simplified.
                            </span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
                            DevOpsEase automates your entire workflow from Git push to deployment. Build, test, deploy, and monitor applications using CI/CD, Docker, Kubernetes, and a powerful CLI.
                        </motion.p>

                        <motion.p variants={itemVariants} className="text-base text-gray-500 mb-10">
                            No complex setup. No DevOps headache.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <Link
                                    to="/login?tab=register"
                                    className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
                                >
                                    Start for Free
                                </Link>
                            )}
                            <a
                                href="https://github.com/mamun0193/devopsease"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl font-semibold transition-all border border-gray-700 hover:border-gray-600"
                            >
                                View on GitHub
                            </a>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="about" className="py-16 bg-gray-950/50 border-y border-gray-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-white mb-4">How DevOpsEase Works</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Five simple steps from your first commit to a running, monitored application.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {HOW_IT_WORKS_STEPS.map((s, i) => (
                        <div key={i} className="relative flex flex-col items-start p-7 bg-gray-900 border border-gray-800 rounded-2xl hover:border-gray-700 transition-colors min-h-[170px]">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                        {s.icon}
                                    </div>
                                    <span className="text-xs font-bold text-gray-600 tracking-widest">{s.step}</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-100 mb-3">{s.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{s.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            to="/about"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all"
                        >
                            Know More
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-12 bg-gray-950/50 border-b border-gray-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-4">Everything You Need for Modern DevOps</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            From code push to production,every DevOps tool you need, in one place.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FeatureCard
                            icon={<Box className="w-6 h-6 text-indigo-400" />}
                            title="CI/CD Pipelines"
                            description="Automate build, test, and deployment with simple pipeline configs."
                            features={['Git integration', 'Auto build & deploy', 'Pipeline-based workflows']}
                        />
                        <FeatureCard
                            icon={<Activity className="w-6 h-6 text-emerald-400" />}
                            title="Docker + Kubernetes"
                            description="Run containers locally or scale with Kubernetes clusters."
                            features={['Cluster & namespace control', 'Scaling (replicas)', 'Service & ingress support']}
                        />
                        <FeatureCard
                            icon={<FileText className="w-6 h-6 text-amber-400" />}
                            title="Observability"
                            description="Track logs, monitor pods, and debug issues instantly."
                            features={['Logs & status tracking', 'Health monitoring', 'Debug instantly']}
                        />
                        <FeatureCard
                            icon={<Terminal className="w-6 h-6 text-cyan-400" />}
                            title="CLI + Dashboard"
                            description="Control everything from terminal or UI... Your choice."
                            features={['Simple commands', 'Full control from terminal', 'Beginner-friendly UI']}
                        />
                    </div>

                    <div className="text-center mt-10">
                        <Link
                            to="/features"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all"
                        >
                            Explore Features
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            </section>
            <section id="pricing" className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-4">Simple, transparent pricing</h2>
                        <p className="text-gray-400">Start for free, upgrade as you grow.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                                        className="w-full py-3 rounded-xl font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 transition-all text-center"
                                    >
                                        Star on GitHub
                                    </a>
                                    <Link
                                        to="/login?tab=register"
                                        className="w-full py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-center hover:-translate-y-0.5"
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
                                    className="w-full py-3 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-center block"
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
                                <button className="w-full py-3 rounded-xl font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 transition-all">
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
    <div className="p-6 bg-gray-950/50 border border-gray-800 rounded-3xl hover:bg-gray-900 transition-colors h-full flex flex-col">
        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-100 mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>

        <ul className="space-y-2 mt-auto">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
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
    <div className={`p-4 rounded-3xl border flex flex-col relative ${highlight ? 'bg-gray-900 border-indigog-500/50 shadow-2xl shadow-indigo-500/10' : 'bg-gray-950/50 border-gray-800'}`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Most Popular
            </div>
        )}
        <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-300 mb-1">{title}</h3>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{price}</span>
                <span className="text-gray-500 text-sm">/mo</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>

        <ul className="space-y-2 mb-4 flex-grow">
            {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
                    <div className={`p-1 rounded-full ${highlight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-800 text-gray-400'}`}>
                        <Check className="w-3 h-3" />
                    </div>
                    {feature}
                </li>
            ))}
        </ul>

        {footer}
    </div>
);
