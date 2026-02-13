import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Box, Activity, Terminal, FileText, Check } from 'lucide-react';
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
                            Docker Management, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                                Simplified.
                            </span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Stop wrestling with the CLI. Manage, monitor, and scale your containers from a beautiful, real-time dashboard designed for developers.
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

                        {/* Dashboard Preview (Mockup) */}
                        <motion.div variants={itemVariants} className="mt-20 relative mx-auto max-w-5xl">
                            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl -z-10 rounded-full" />
                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl rotate-x-12 perspective-1000">
                                <div className="bg-gray-950 rounded-xl overflow-hidden aspect-[16/9] relative grid place-items-center border border-gray-800/50 group">
                                    <img
                                        src="/image.png"
                                        alt="DevOpsEase Dashboard"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/20 via-transparent to-transparent pointer-events-none" />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-12 bg-gray-950/50 border-y border-gray-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-4">Everything you need</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Powerful features that make container orchestration feel like magic.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FeatureCard
                            icon={<Box className="w-6 h-6 text-indigo-400" />}
                            title="Visual Management"
                            description="Start, stop, and restart containers with one click. No more docker ps."
                            features={['One-click actions', 'Status filtering', 'Group by stack']}
                        />
                        <FeatureCard
                            icon={<Activity className="w-6 h-6 text-emerald-400" />}
                            title="Real-time Metrics"
                            description="Live CPU, Memory, and Network stats for every running container."
                            features={['Live CPU/Mem graphs', 'Network tracking', 'Resource alerts']}
                        />
                        <FeatureCard
                            icon={<FileText className="w-6 h-6 text-amber-400" />}
                            title="Instant Logs"
                            description="View live streams of container logs to debug issues instantly."
                            features={['Live streaming', 'Search & Filter', 'Download history']}
                        />
                        <FeatureCard
                            icon={<Terminal className="w-6 h-6 text-cyan-400" />}
                            title="Exec Console"
                            description="Direct terminal access to your containers from the browser."
                            features={['Full TTY support', 'Secure connection', 'Multiple sessions']}
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
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
                            description="Perfect for hobbyists"
                            features={['Max 2 Containers', 'Basic Rate Limits', 'Community Support']}
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
                            features={['Max 10 Containers', 'Higher Rate Limits', 'Priority Support', '7-Day Log Retention']}
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
                            price="₹299"
                            description="Power users & teams"
                            features={['Max 20 Containers', 'Highest Rate Limits', 'Dedicated Support', '30-Day Log Retention']}
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

// Sub-components for cleaner code
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

        <div className="mt-6 pt-6 border-t border-gray-800">
            <Link to="/docs" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors group">
                Learn more
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
        </div>
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
    <div className={`p-6 rounded-3xl border flex flex-col relative ${highlight ? 'bg-gray-900 border-indigo-500/50 shadow-2xl shadow-indigo-500/10' : 'bg-gray-950/50 border-gray-800'}`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Most Popular
            </div>
        )}
        <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-1">{title}</h3>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{price}</span>
                <span className="text-gray-500 text-sm">/mo</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>

        <ul className="space-y-3 mb-6 flex-grow">
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
