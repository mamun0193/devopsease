import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../components/LandingLayout';
import {
    Check, X, ChevronDown, ArrowRight,
    Zap, Shield, Layers, Terminal, Activity, Lock,
    GitBranch, Container, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

//  Plan data (mirrors server/src/config/plans.js) 

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: '/mo',
        tagline: 'Perfect for getting started',
        color: 'gray',
        highlight: false,
        badge: null,
        resources: { containers: 2, cpu: '1 core', ram: '512 MB', storage: '1 GB', storageType: 'Ephemeral' },
        rateLimits: { create: '5/hr', exec: '10/min', destructive: '5/min' },
        features: [
            'Basic CI/CD pipelines',
            'Docker builds & deployments',
            'Image build engine (inline Dockerfile)',
            'Container log streaming',
            'Resource quota monitoring',
            'Community support',
        ],
        cta: { label: 'Get Started Free', to: '/login?tab=register', variant: 'outline' },
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 199,
        period: '/mo',
        tagline: 'For serious developers',
        color: 'indigo',
        highlight: true,
        badge: 'Most Popular',
        resources: { containers: 10, cpu: '4 cores', ram: '4 GB', storage: '10 GB', storageType: 'Persistent' },
        rateLimits: { create: '20/hr', exec: '60/min', destructive: '20/min' },
        features: [
            'Everything in Free',
            'Advanced CI/CD pipelines',
            'Kubernetes deployments',
            'Secrets management (AES-encrypted)',
            '7-day log retention',
            'Public tunnel support',
            'Priority support',
        ],
        cta: { label: 'Start Pro', to: '/login?tab=register', variant: 'primary' },
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 399,
        period: '/mo',
        tagline: 'For teams and scale',
        color: 'cyan',
        highlight: false,
        badge: null,
        resources: { containers: 20, cpu: '8 cores', ram: '16 GB', storage: '25 GB', storageType: 'Persistent' },
        rateLimits: { create: '50/hr', exec: '300/min', destructive: '100/min' },
        features: [
            'Everything in Pro',
            'Multi-cluster Kubernetes',
            'Full observability (pods, logs, events)',
            '30-day log retention',
            'Kubernetes YAML generation',
            'Dedicated support',
            'Audit logs',
        ],
        cta: { label: 'Start Premium', to: '/login?tab=register', variant: 'outline-cyan' },
    },
];

// Comparison table rows 

const TABLE_SECTIONS = [
    {
        title: 'Resources',
        rows: [
            { label: 'Containers', free: '2', pro: '10', premium: '20' },
            { label: 'CPU', free: '1 core', pro: '4 cores', premium: '8 cores' },
            { label: 'RAM', free: '512 MB', pro: '4 GB', premium: '16 GB' },
            { label: 'Storage', free: '1 GB', pro: '10 GB', premium: '25 GB' },
            { label: 'Storage type', free: 'Ephemeral', pro: 'Persistent', premium: 'Persistent' },
        ],
    },
    {
        title: 'CI/CD & Docker',
        rows: [
            { label: 'CI/CD pipelines', free: true, pro: true, premium: true },
            { label: 'Docker builds (inline Dockerfile)', free: true, pro: true, premium: true },
            { label: 'Image registry', free: true, pro: true, premium: true },
            { label: 'Advanced pipeline stages', free: false, pro: true, premium: true },
            { label: 'Public tunnels', free: false, pro: true, premium: true },
            { label: 'Build intelligence (failure analysis)', free: true, pro: true, premium: true },
        ],
    },
    {
        title: 'Kubernetes',
        rows: [
            { label: 'Kubernetes deployments', free: false, pro: true, premium: true },
            { label: 'Namespace management', free: false, pro: true, premium: true },
            { label: 'Replica scaling', free: false, pro: true, premium: true },
            { label: 'Multi-cluster support', free: false, pro: false, premium: true },
            { label: 'YAML generation', free: false, pro: false, premium: true },
            { label: 'Full observability dashboard', free: false, pro: false, premium: true },
        ],
    },
    {
        title: 'Security & Access',
        rows: [
            { label: 'Secrets management (AES-encrypted)', free: false, pro: true, premium: true },
            { label: 'RBAC roles (operator / admin)', free: true, pro: true, premium: true },
            { label: 'JWT dual-token auth', free: true, pro: true, premium: true },
            { label: 'Audit logs', free: false, pro: false, premium: true },
        ],
    },
    {
        title: 'Observability & Support',
        rows: [
            { label: 'Container log streaming', free: true, pro: true, premium: true },
            { label: 'Log retention', free: 'None', pro: '7 days', premium: '30 days' },
            { label: 'Resource usage monitoring', free: true, pro: true, premium: true },
            { label: 'Alert thresholds', free: true, pro: true, premium: true },
            { label: 'Support', free: 'Community', pro: 'Priority', premium: 'Dedicated' },
        ],
    },
    {
        title: 'Rate Limits',
        rows: [
            { label: 'Container creates', free: '5/hr', pro: '20/hr', premium: '50/hr' },
            { label: 'Exec commands', free: '10/min', pro: '60/min', premium: '300/min' },
            { label: 'Destructive actions', free: '5/min', pro: '20/min', premium: '100/min' },
        ],
    },
];

// FAQs
const FAQS = [
    {
        q: 'Can I start for free with no credit card?',
        a: 'Yes. The Free plan is genuinely free, forever. No credit card required to sign up or deploy your first container.',
    },
    {
        q: 'What does "ephemeral" storage mean on the Free plan?',
        a: 'Ephemeral storage is tied to the container lifecycle — data is lost when the container stops. The Pro and Premium plans include persistent volumes that survive restarts.',
    },
    {
        q: 'Can I upgrade or downgrade at any time?',
        a: 'Yes. You can upgrade immediately and downgrade at the end of your billing cycle. Resource limits adjust to your new plan automatically.',
    },
    {
        q: 'What happens if I hit a rate limit?',
        a: 'API requests that exceed your plan\'s rate limit return a 429 response. Limits reset on a rolling window (per minute or per hour depending on the action).',
    },
    {
        q: 'Is Kubernetes available on the Free plan?',
        a: 'No. Kubernetes deployments, namespace management, and cluster scaling are available from the Pro plan upward.',
    },
    {
        q: 'How does the CLI work with my plan?',
        a: 'The devopsease CLI (80+ commands) is available on all plans. Your plan\'s resource limits and rate limits apply equally whether you use the CLI or the dashboard.',
    },
];

//  Cell renderer 

const Cell: React.FC<{ value: string | boolean }> = ({ value }) => {
    if (value === true) return <Check className="w-4 h-4 text-indigo-400 mx-auto" />;
    if (value === false) return <X className="w-4 h-4 text-gray-700 mx-auto" />;
    return <span className="text-gray-300 text-sm">{value}</span>;
};

//  PlanCard 

const cardBorder: Record<string, string> = {
    gray: 'border-gray-800 hover:border-gray-700',
    indigo: 'border-indigo-500/50 shadow-2xl shadow-indigo-500/10',
    cyan: 'border-cyan-500/30 hover:border-cyan-500/50',
};

const ctaClass: Record<string, string> = {
    outline: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30',
    'outline-cyan': 'bg-gray-800 hover:bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
};

// FAQ Item

const FaqItem: React.FC<{ q: string; a: string; index: number }> = ({ q, a, index }) => {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="border border-gray-800 rounded-xl overflow-hidden"
        >
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-200 hover:text-white hover:bg-gray-800/50 transition-colors"
            >
                {q}
                <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
                            {a}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Page 

export const PricingPage: React.FC = () => (
    <LandingLayout>

        {/* Hero */}
        <section className="py-12 text-center">
            <div className="max-w-2xl mx-auto ">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-5">
                        <Zap className="w-3.5 h-3.5" />
                        Simple, transparent pricing
                    </span>
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                        Start free<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                            Scale with confidence
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-lg mx-auto">
                        Real containers on every plan. No sandboxes, no hidden limits. Upgrade as your infrastructure grows.
                    </p>
                </motion.div>
            </div>
        </section>

        {/* Plan cards */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map((plan, i) => (
                    <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className={`relative flex flex-col rounded-2xl border p-6 bg-gray-900/60 ${cardBorder[plan.color]}`}
                    >
                        {/* Badge */}
                        {plan.badge && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {plan.badge}
                            </div>
                        )}

                        {/* Name + price */}
                        <div className="mb-5">
                            <h2 className="text-base font-semibold text-gray-400 mb-1">{plan.name}</h2>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                                <span className="text-gray-500 text-sm">{plan.period}</span>
                            </div>
                            <p className="text-gray-500 text-sm">{plan.tagline}</p>
                        </div>

                        {/* Resource chips */}
                        <div className="grid grid-cols-2 gap-2 mb-5">
                            {[
                                { icon: <Container className="w-3.5 h-3.5" />, label: `${plan.resources.containers} containers` },
                                { icon: <Activity className="w-3.5 h-3.5" />, label: plan.resources.cpu },
                                { icon: <BarChart2 className="w-3.5 h-3.5" />, label: plan.resources.ram },
                                { icon: <Layers className="w-3.5 h-3.5" />, label: `${plan.resources.storage} ${plan.resources.storageType === 'Persistent' ? '· persistent' : '· ephemeral'}` },
                            ].map((r, j) => (
                                <div key={j} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/70 rounded-lg text-xs text-gray-300">
                                    <span className="text-gray-500">{r.icon}</span>
                                    {r.label}
                                </div>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-800 mb-5" />

                        {/* Included features only */}
                        <ul className="flex flex-col gap-2 mb-4 flex-grow">
                            {plan.features.map((f, j) => (
                                <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                                    <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Link
                            to={plan.cta.to}
                            className={`mt-2 w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:-translate-y-0.5 ${ctaClass[plan.cta.variant]}`}
                        >
                            {plan.cta.label}
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* Feature comparison table */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-2">Full plan comparison</h2>
                <p className="text-gray-500 text-sm">Every feature, side by side</p>
            </motion.div>

            <div className="rounded-2xl border border-gray-800 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-4 bg-gray-900/80 border-b border-gray-800 px-5 py-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Feature</div>
                    {PLANS.map(p => (
                        <div key={p.id} className={`text-center text-xs font-bold uppercase tracking-widest ${p.highlight ? 'text-indigo-400' : 'text-gray-400'}`}>
                            {p.name}
                        </div>
                    ))}
                </div>

                {TABLE_SECTIONS.map((section) => (
                    <div key={section.title}>
                        {/* Section heading */}
                        <div className="grid grid-cols-4 px-5 py-2 bg-gray-950/60 border-b border-gray-800/50">
                            <div className="col-span-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">{section.title}</div>
                        </div>
                        {section.rows.map((row, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-4 px-5 py-3 border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                            >
                                <div className="text-sm text-gray-400">{row.label}</div>
                                <div className="text-center"><Cell value={row.free} /></div>
                                <div className="text-center"><Cell value={row.pro} /></div>
                                <div className="text-center"><Cell value={row.premium} /></div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 pb-20">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-10">
                <h2 className="text-2xl font-bold text-white mb-2">Frequently asked questions</h2>
                <p className="text-gray-500 text-sm">Still have questions? Reach out via GitHub Discussions.</p>
            </motion.div>
            <div className="flex flex-col gap-2">
                {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} index={i} />)}
            </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-gray-900 to-cyan-500/10 p-12 text-center"
            >
                <h2 className="text-3xl font-bold text-white mb-3">
                    Start with 2 containers.<br />
                    <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Scale to 20.</span>
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm">
                    Free plan is real — not a trial, not a sandbox. Upgrade only when you need more.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        to="/login?tab=register"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all"
                    >
                        Get Started Free <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                        to="/features"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700 hover:-translate-y-0.5 transition-all"
                    >
                        See All Features
                    </Link>
                </div>
            </motion.div>
        </section>

    </LandingLayout>
);

export default PricingPage;
