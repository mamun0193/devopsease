import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  Check, GitBranch, Hammer, Rocket, BarChart2, TerminalSquare,
  Activity, Shield, Sparkles, Globe, Zap, ChevronRight
} from 'lucide-react';
import { LandingLayout } from '../components/LandingLayout';
import { useAuth } from '../context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// ─── Data ────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  { icon: GitBranch, color: 'text-dds-primary', step: '01', title: 'Connect your Git repository', description: 'Link any GitHub or Git repo in seconds. Webhook triggers are configured automatically.' },
  { icon: Hammer, color: 'text-dds-green', step: '02', title: 'Push your code', description: 'A git push triggers the pipeline. Build intelligence detects what changed and reuses layers.' },
  { icon: TerminalSquare, color: 'text-dds-orange', step: '03', title: 'Build & cache intelligently', description: 'Immutable build manifests, Dockerfile AST analysis, and layer-level caching drastically cut build times.' },
  { icon: Rocket, color: 'text-dds-blue', step: '04', title: 'Deploy to Docker or Kubernetes', description: 'Ship containers locally or scale across Kubernetes clusters — with rollback built in.' },
  { icon: BarChart2, color: 'text-dds-primary', step: '05', title: 'Observe, scale & heal autonomously', description: 'Real-time metrics, Autopilot, and AI Copilot keep your platform healthy without manual ops.' },
];

const FEATURES = [
  {
    icon: GitBranch,
    color: 'text-dds-primary',
    title: 'CI/CD Pipelines',
    description: 'Git push triggers your pipeline automatically. Build, test, and deploy without manual steps.',
    link: '/features',
  },
  {
    icon: Hammer,
    color: 'text-dds-green',
    title: 'Intelligent Builds',
    description: 'Layer-level cache analysis and immutable build manifests cut build times and explain every decision.',
    link: '/features',
  },
  {
    icon: Rocket,
    color: 'text-dds-blue',
    title: 'Deployments & Rollbacks',
    description: 'Docker and Kubernetes deployments with replica scaling and one-click rollback to any prior build.',
    link: '/features',
  },
  {
    icon: Globe,
    color: 'text-dds-orange',
    title: 'Custom Domains & TLS',
    description: 'Map any domain to your app with automatic DNS verification and zero-touch TLS certificates.',
    link: '/features',
  },
  {
    icon: Activity,
    color: 'text-dds-green',
    title: 'Releases & Traffic',
    description: 'Canary, Blue/Green, and A/B rollouts with real-time traffic shifting and explainability logs.',
    link: '/features',
  },
  {
    icon: BarChart2,
    color: 'text-dds-blue',
    title: 'Observability',
    description: 'Multi-dimensional health scoring, live event streaming, and Prometheus-compatible metrics.',
    link: '/features',
  },
  {
    icon: Zap,
    color: 'text-dds-orange',
    title: 'Autopilot',
    description: 'Autonomous scaling, traffic management, and self-healing — safely bounded with cooldown guards.',
    link: '/features',
  },
  {
    icon: Sparkles,
    color: 'text-dds-primary',
    title: 'AI Copilot',
    description: 'Context-aware AI powered by real build and deployment data. Failure analysis, architecture review, and chat.',
    link: '/features',
  },
  {
    icon: Shield,
    color: 'text-dds-red',
    title: 'Security & Backups',
    description: 'Full audit trail, encrypted secrets, staged restores, and HMAC-signed webhook delivery.',
    link: '/features',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [location]);

  return (
    <LandingLayout>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-14 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>

            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-dds-primary/10 border border-dds-primary/20 text-dds-primary text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-dds-primary animate-pulse" />
              V 1.0 Live Now
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-dds-white mb-6">
              From Code to Production{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">
                Simplified.
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-dds-text-secondary max-w-2xl mx-auto mb-4 leading-relaxed">
              DevOpsEase is a full-stack PaaS that automates every stage of your deployment lifecycle — CI/CD, Docker, Kubernetes, traffic management, observability, and AI-driven operations — all from a single platform.
            </motion.p>

            <motion.p variants={itemVariants} className="text-base text-dds-text-muted mb-10">
              No glue code. No DevOps headache. Just push and ship.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary px-8 py-3 text-base">
                  Go to Dashboard
                </Link>
              ) : (
                <Link to="/login?tab=register" className="btn-primary px-8 py-3 text-base">
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

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="about" className="py-16 bg-dds-surface/30 border-y border-dds-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dds-white mb-4">How DevOpsEase Works</h2>
            <p className="text-dds-text-secondary max-w-xl mx-auto">
              Five steps from first commit to a self-healing, observable production system.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card card-interactive flex flex-col items-start p-6 min-h-[170px]">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 bg-dds-elevated rounded-[6px] flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <span className="text-xs font-bold text-dds-text-muted tracking-widest">{s.step}</span>
                  </div>
                  <h3 className="text-sm font-bold text-dds-white mb-2">{s.title}</h3>
                  <p className="text-dds-text-secondary text-sm leading-relaxed">{s.description}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <Link to="/about" className="btn-primary w-30 py-3 text-sm font-semibold">
              Know more
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────────────── */}
      <section id="features" className="py-16 border-b border-dds-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-dds-white mb-4">Everything You Need for Modern DevOps</h2>
            <p className="text-dds-text-secondary max-w-2xl mx-auto">
              From code push to production — every stage covered, in one platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Link key={i} to={f.link} className="card card-interactive flex items-start gap-4 p-6 group">
                  <div className="w-9 h-9 bg-dds-elevated rounded-[6px] flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-dds-white mb-1 flex items-center gap-1">
                      {f.title}
                      <ChevronRight className="w-3.5 h-3.5 text-dds-text-muted opacity-0 group-hover:opacity-100 transition-opacity -mr-1" />
                    </h3>
                    <p className="text-dds-text-muted text-sm leading-relaxed">{f.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <Link to="/features" className="btn-primary w-50 py-3 text-sm font-semibold text-center">
              Explore all features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
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
                  <Link to="/login?tab=register" className="btn-primary w-full justify-center py-2.5">
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
              highlight
              features={[
                '10 containers · 4 CPU cores',
                '4 GB RAM · 10 GB storage (persistent)',
                'Advanced CI/CD pipelines',
                'Kubernetes deployments',
                'Secrets management',
                'Preview environments',
                '7-day log retention',
                'Priority support',
              ]}
              footer={
                <Link to="/login?tab=register" className="btn-primary w-full justify-center py-2.5">
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
                'Full observability + Autopilot',
                'AI Copilot access',
                'Developer API + webhooks',
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

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-16 border-t border-dds-border/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-dds-white mb-4">
            Ready to ship faster?
          </h2>
          <p className="text-dds-text-secondary mb-8 text-lg leading-relaxed">
            Join DevOpsEase and go from code to production — with CI/CD, smart builds, autonomous scaling, and an AI Copilot watching your back.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary px-8 py-3 text-base">
                Open Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/login?tab=register" className="btn-primary px-8 py-3 text-base">
                Start for Free <ChevronRight className="w-4 h-4" />
              </Link>
            )}
            <Link to="/docs" className="btn-secondary px-8 py-3 text-base">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

    </LandingLayout>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PricingCard: React.FC<{
  title: string;
  price: string;
  features: string[];
  description: string;
  isPopular?: boolean;
  footer: React.ReactNode;
  highlight?: boolean;
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
