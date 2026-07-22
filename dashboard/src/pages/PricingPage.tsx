import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../components/LandingLayout';
import {
  Check, X, ChevronDown, ArrowRight,
  Zap, Layers, Activity, Container, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Plan data (mirrors server/src/config/plans.js) ─────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/mo',
    tagline: 'Ideal for side projects & individual testing',
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
    tagline: 'For production workloads & serious developers',
    highlight: true,
    badge: 'Most Popular',
    resources: { containers: 10, cpu: '4 cores', ram: '4 GB', storage: '10 GB', storageType: 'Persistent' },
    rateLimits: { create: '20/hr', exec: '60/min', destructive: '20/min' },
    features: [
      'Everything in Free',
      'Advanced CI/CD pipelines',
      'Kubernetes deployments',
      'Secrets management (AES-encrypted)',
      'Preview environments',
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
    tagline: 'For scaling teams requiring full AI & autonomy',
    highlight: false,
    badge: null,
    resources: { containers: 20, cpu: '8 cores', ram: '16 GB', storage: '25 GB', storageType: 'Persistent' },
    rateLimits: { create: '50/hr', exec: '300/min', destructive: '100/min' },
    features: [
      'Everything in Pro',
      'Multi-cluster Kubernetes',
      'Full observability + Autopilot',
      'AI Copilot access',
      'Developer API + webhooks',
      '30-day log retention',
      'Kubernetes YAML generation',
      'Dedicated support',
    ],
    cta: { label: 'Start Premium', to: '/login?tab=register', variant: 'outline' },
  },
];

// ─── Comparison table rows ───────────────────────────────────────────────────

const TABLE_SECTIONS = [
  {
    title: 'Resources & Limits',
    rows: [
      { label: 'Containers', free: '2', pro: '10', premium: '20' },
      { label: 'CPU Cores', free: '1 core', pro: '4 cores', premium: '8 cores' },
      { label: 'RAM', free: '512 MB', pro: '4 GB', premium: '16 GB' },
      { label: 'Storage', free: '1 GB', pro: '10 GB', premium: '25 GB' },
      { label: 'Storage type', free: 'Ephemeral', pro: 'Persistent', premium: 'Persistent' },
      { label: 'Preview Environments', free: '1', pro: '5', premium: '15' },
    ],
  },
  {
    title: 'CI/CD & Docker Engine',
    rows: [
      { label: 'CI/CD pipelines', free: true, pro: true, premium: true },
      { label: 'Docker builds (inline Dockerfile)', free: true, pro: true, premium: true },
      { label: 'Image registry integration', free: true, pro: true, premium: true },
      { label: 'Advanced pipeline stages', free: false, pro: true, premium: true },
      { label: 'Public tunnels', free: false, pro: true, premium: true },
      { label: 'Build intelligence & failure analysis', free: true, pro: true, premium: true },
    ],
  },
  {
    title: 'Kubernetes Orchestration',
    rows: [
      { label: 'Kubernetes deployments', free: false, pro: true, premium: true },
      { label: 'Namespace management', free: false, pro: true, premium: true },
      { label: 'Replica scaling', free: false, pro: true, premium: true },
      { label: 'Multi-cluster support', free: false, pro: false, premium: true },
      { label: 'YAML generator', free: false, pro: false, premium: true },
    ],
  },
  {
    title: 'AI & Automation',
    rows: [
      { label: 'AI DevOps Copilot', free: false, pro: false, premium: true },
      { label: 'Autopilot (autonomous scaling & healing)', free: false, pro: false, premium: true },
      { label: 'Platform Event Bus', free: true, pro: true, premium: true },
    ],
  },
  {
    title: 'Security & Access Control',
    rows: [
      { label: 'Secrets management (AES-256-GCM)', free: false, pro: true, premium: true },
      { label: 'RBAC roles (Operator / Admin)', free: true, pro: true, premium: true },
      { label: 'Custom Domains & TLS', free: false, pro: true, premium: true },
      { label: 'Audit logs & Security Center', free: false, pro: false, premium: true },
    ],
  },
  {
    title: 'Observability & Support',
    rows: [
      { label: 'Container log streaming', free: true, pro: true, premium: true },
      { label: 'Log retention', free: 'None', pro: '7 days', premium: '30 days' },
      { label: 'Resource usage monitoring', free: true, pro: true, premium: true },
      { label: 'Alert notifications & webhooks', free: true, pro: true, premium: true },
      { label: 'Support tier', free: 'Community', pro: 'Priority', premium: 'Dedicated' },
    ],
  },
  {
    title: 'Rate Limits',
    rows: [
      { label: 'Container creates', free: '5/hr', pro: '20/hr', premium: '50/hr' },
      { label: 'Exec commands', free: '10/min', pro: '60/min', premium: '300/min' },
      { label: 'Destructive actions', free: '5/min', pro: '20/min', premium: '100/min' },
      { label: 'Platform API requests', free: '60/min', pro: '300/min', premium: '1000/min' },
    ],
  },
];

// ─── FAQs ────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Can I start for free with no credit card?',
    a: 'Yes. The Free plan is genuinely free, forever. No credit card required to sign up or deploy your first container.',
  },
  {
    q: 'What does "ephemeral" storage mean on the Free plan?',
    a: 'Ephemeral storage is tied to the container lifecycle — data is cleared when the container is deleted. Pro and Premium plans include persistent volumes that survive container restarts.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Yes. You can upgrade immediately and downgrade at the end of your billing cycle. Resource limits adjust to your new plan automatically.',
  },
  {
    q: 'What happens if I hit a rate limit?',
    a: 'API requests that exceed your plan\'s rate limit return a 429 response with a Retry-After header. Limits reset on a rolling window.',
  },
  {
    q: 'Is Kubernetes available on the Free plan?',
    a: 'No. Kubernetes deployments, namespace management, and cluster scaling are available from the Pro plan upward.',
  },
  {
    q: 'How does the CLI work with my plan?',
    a: 'The devopsease CLI binary is available on all plans. Your plan\'s resource limits and rate limits apply equally whether you use the CLI or the dashboard.',
  },
];

// ─── Cell Renderer ───────────────────────────────────────────────────────────

const Cell: React.FC<{ value: string | boolean }> = ({ value }) => {
  if (value === true) return <Check className="w-4.5 h-4.5 text-dds-primary mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-dds-text-muted/40 mx-auto" />;
  return <span className="text-dds-text-secondary text-sm font-medium">{value}</span>;
};

// ─── FAQ Item ────────────────────────────────────────────────────────────────

const FaqItem: React.FC<{ q: string; a: string; index: number }> = ({ q, a, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-dds-border rounded-xl overflow-hidden bg-dds-surface/60"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-semibold text-dds-white hover:bg-dds-elevated transition-colors"
      >
        {q}
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-dds-text-muted transition-transform duration-200 ${open ? 'rotate-180 text-dds-primary' : ''}`} />
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
            <p className="px-6 pb-5 text-sm text-dds-text-secondary leading-relaxed border-t border-dds-border/60 pt-3">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Page ────────────────────────────────────────────────────────────────────

export const PricingPage: React.FC = () => (
  <LandingLayout>

    {/* ── Split Hero (identical layout to About & Features pages) ──────────── */}
    <section className="py-20 border-b border-dds-border/50">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left — headline */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>

            <h1 className="text-4xl md:text-5xl font-bold text-dds-white leading-tight">
              Start free.<br />
              <span className="text-transparent md:text-4xl bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">
                Scale with confidence.
              </span>
            </h1>
          </motion.div>

          {/* Right — description */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
            <p className="text-dds-text-secondary text-md leading-relaxed mb-8">
              Real containers on every plan. No sandboxes, no artificial trial limits. Start for free and upgrade as your infrastructure scales.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/login?tab=register" className="btn-primary px-6 py-3 text-sm">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/features" className="btn-secondary px-6 py-3 text-sm">
                Explore Features
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>

    {/* ── Plan Cards ────────────────────────────────────────────────────────── */}
    <section className="py-20 border-b border-dds-border/50">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className={`p-7 sm:p-8 rounded-2xl border flex flex-col justify-between relative transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-dds-elevated to-dds-surface border-2 border-dds-primary/60 shadow-2xl shadow-dds-primary/15'
                  : 'bg-dds-surface/90 border-dds-border hover:border-dds-border/80'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-dds-primary via-purple-500 to-dds-blue text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-dds-white mb-2">{plan.name}</h2>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-4xl font-extrabold text-dds-white tracking-tight">₹{plan.price}</span>
                    <span className="text-dds-text-muted text-sm font-medium">{plan.period}</span>
                  </div>
                  <p className="text-dds-text-muted text-xs leading-relaxed">{plan.tagline}</p>
                </div>

                {/* Resource Chips */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {[
                    { icon: <Container className="w-3.5 h-3.5" />, label: `${plan.resources.containers} containers` },
                    { icon: <Activity className="w-3.5 h-3.5" />, label: plan.resources.cpu },
                    { icon: <BarChart2 className="w-3.5 h-3.5" />, label: plan.resources.ram },
                    { icon: <Layers className="w-3.5 h-3.5" />, label: `${plan.resources.storage} · ${plan.resources.storageType.toLowerCase()}` },
                  ].map((r, j) => (
                    <div key={j} className="flex items-center gap-1.5 px-2.5 py-2 bg-dds-elevated/70 border border-dds-border/50 rounded-lg text-xs text-dds-text-secondary font-medium">
                      <span className="text-dds-primary">{r.icon}</span>
                      {r.label}
                    </div>
                  ))}
                </div>

                <div className="w-full h-px bg-dds-border/60 mb-6" />

                {/* Feature List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-dds-text-secondary text-sm font-medium">
                      <div className={`p-1 rounded-md flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-dds-primary/20 text-dds-primary' : 'bg-dds-elevated text-dds-primary/90 border border-dds-border'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <Link
                to={plan.cta.to}
                className={`w-full py-3.5 text-sm font-semibold rounded-lg text-center transition-all ${
                  plan.highlight
                    ? 'btn-primary shadow-lg shadow-dds-primary/20'
                    : 'btn-secondary hover:border-dds-primary/40'
                }`}
              >
                {plan.cta.label}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Feature Comparison Table ─────────────────────────────────────────── */}
    <section className="py-20 border-b border-dds-border/50">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dds-white mb-3">Full feature comparison</h2>
          <p className="text-dds-text-secondary text-base">Every capability and resource limit, side by side</p>
        </motion.div>

        <div className="rounded-2xl border border-dds-border overflow-hidden bg-dds-surface/40 shadow-xl">
          {/* Table Header */}
          <div className="grid grid-cols-4 bg-dds-elevated border-b border-dds-border px-6 py-4">
            <div className="text-xs font-bold text-dds-text-muted uppercase tracking-widest">Capability</div>
            {PLANS.map(p => (
              <div key={p.id} className={`text-center text-xs font-extrabold uppercase tracking-widest ${p.highlight ? 'text-dds-primary' : 'text-dds-white'}`}>
                {p.name}
              </div>
            ))}
          </div>

          {/* Table Sections */}
          {TABLE_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="grid grid-cols-4 px-6 py-2.5 bg-dds-surface/90 border-b border-dds-border/50">
                <div className="col-span-4 text-[11px] font-bold text-dds-primary uppercase tracking-widest">{section.title}</div>
              </div>
              {section.rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 px-6 py-3.5 border-b border-dds-border/40 hover:bg-dds-surface/80 transition-colors items-center"
                >
                  <div className="text-sm text-dds-text-secondary font-medium">{row.label}</div>
                  <div className="text-center"><Cell value={row.free} /></div>
                  <div className="text-center"><Cell value={row.pro} /></div>
                  <div className="text-center"><Cell value={row.premium} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── FAQ Section ──────────────────────────────────────────────────────── */}
    <section className="py-20 border-b border-dds-border/50">
      <div className="max-w-4xl mx-auto px-8 lg:px-12">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dds-white mb-3">Frequently asked questions</h2>
          <p className="text-dds-text-secondary text-base">Everything you need to know about plans, limits, and billing</p>
        </motion.div>
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} index={i} />)}
        </div>
      </div>
    </section>

    {/* ── Bottom CTA ───────────────────────────────────────────────────────── */}
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-dds-primary/30 bg-gradient-to-br from-dds-primary/10 via-dds-surface to-purple-500/10 p-12 text-center shadow-2xl"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-dds-white mb-4 tracking-tight">
            Start with 2 containers.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">Scale to 20.</span>
          </h2>
          <p className="text-dds-text-secondary mb-8 max-w-lg mx-auto text-base leading-relaxed">
            The Free plan is real — not a trial, not a sandbox. Upgrade only when you need more compute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login?tab=register"
              className="btn-primary px-8 py-3.5 text-sm font-semibold rounded-lg shadow-lg shadow-dds-primary/20"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/features"
              className="btn-secondary px-8 py-3.5 text-sm font-semibold rounded-lg"
            >
              See All Features
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

  </LandingLayout>
);

export default PricingPage;
