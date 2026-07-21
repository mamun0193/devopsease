import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingLayout } from '../components/LandingLayout';
import {
  GitBranch, Hammer, Rocket, Activity, Globe, Eye, BarChart2,
  Zap, Sparkles, Shield, Layers, KeyRound, Terminal, Cloud,
  Puzzle, Webhook, Code2, RefreshCw, Server, Network,
  Image, FlaskConical, ArrowRight, Check, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Data ─────────────────────────────────────────────────────────────────────

type Feature = {
  id: string;
  category: string;
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
  bullets: string[];
};

const FEATURES: Feature[] = [
  // ── CI/CD ──────────────────────────────────────────────────────────────────
  {
    id: 'pipelines',
    category: 'CI/CD',
    icon: GitBranch,
    color: 'text-dds-primary',
    title: 'Git-Driven CI/CD Pipelines',
    description: 'Push to any branch and DevOpsEase triggers your pipeline automatically. Branch wildcard filters, concurrent-run guards, and stale-run recovery make every run reliable.',
    bullets: [
      'HMAC-verified GitHub webhook triggers',
      'Wildcard branch filters (feature/*, main)',
      'Concurrent-run guard via unique partial index',
      'Stale-run auto-recovery after 30 minutes',
      'Build → Test → Deploy stage ordering',
      'Real-time log streaming via WebSocket',
    ],
  },
  {
    id: 'builds',
    category: 'CI/CD',
    icon: Hammer,
    color: 'text-dds-green',
    title: 'Build Intelligence & Cache Engine',
    description: 'Every build generates an immutable BuildManifest. Dockerfile AST analysis categorizes layers and produces rolling cache keys with a human-readable reason for every cache hit or miss.',
    bullets: [
      'Immutable BuildManifest with contextHash & dependencyFingerprint',
      'Dockerfile AST layer categorization (SYSTEM / DEPENDENCY / SOURCE / RUNTIME)',
      'Layer-level rolling cache keys with explicit reasoning',
      'Package manager fingerprinting (package.json, go.mod, requirements.txt)',
      'Cache hit/miss analytics panel on BuildsPage',
      'Build Intelligence detail view on BuildDetailPage',
    ],
  },
  {
    id: 'deployments',
    category: 'CI/CD',
    icon: Rocket,
    color: 'text-dds-blue',
    title: 'Smart Deployments & Rollbacks',
    description: 'Replica reconciliation ensures desired state is always reached. Port-collision retry prevents stuck deployments. One-click rollback finds the previous stable build and reconciles it automatically.',
    bullets: [
      'Desired-state reconciliation via createReplica × desiredReplicas',
      'Port-collision retry with 3 attempts',
      'One-click rollback to any prior build',
      'Deployment ownership guards (IDOR-safe)',
      'Real-time deployment events via WebSocket broadcaster',
      'CPU, memory, and storage limits per plan',
    ],
  },
  {
    id: 'releases',
    category: 'CI/CD',
    icon: Activity,
    color: 'text-dds-green',
    title: 'Release Orchestration',
    description: 'Immutable ReleaseManifests bind application, config snapshot, build manifest, and image into a single point of truth. A 7-stage state machine governs every promotion safely.',
    bullets: [
      'Immutable release manifest (config + build + image snapshot)',
      '7-stage release state machine (Draft → Active)',
      'Canary, Blue/Green, and A/B traffic splits',
      'TrafficPolicy + RoutingTable for gateway packet forwarding',
      'Structured ExplainabilityRecord on every automated decision',
      'Release timeline and manifest inspector in the dashboard',
    ],
  },
  {
    id: 'previews',
    category: 'CI/CD',
    icon: Eye,
    color: 'text-dds-primary',
    title: 'Preview Environments',
    description: 'Spin up a fully isolated environment per branch or PR in seconds. TTL-based auto-expiry with atomic MongoDB locking ensures only one node destroys an environment.',
    bullets: [
      'Isolated per-branch / per-PR environments',
      'TTL-based auto-expiry with atomic findOneAndUpdate lock',
      'Post-deployment abort if preview destroyed mid-flight',
      '4-byte random slug prevents URL guessing',
      'IDOR-safe ownership on extend/destroy',
      'Preview events timeline in the detail page',
    ],
  },
  // ── Docker & Registry ──────────────────────────────────────────────────────
  {
    id: 'containers',
    category: 'Docker',
    icon: Server,
    color: 'text-dds-blue',
    title: 'Container Management',
    description: 'Full lifecycle control over Docker containers — start, stop, restart, pause, remove. Live CPU & memory streaming, interactive exec terminal, and log streaming directly in the dashboard.',
    bullets: [
      'Start / stop / restart / pause / remove via Dockerode',
      'Real-time container metrics streamed every ~5 s',
      'Interactive exec terminal over WebSocket (bidirectional)',
      'Structured log streaming with search and filter',
      'Container ownership model — per-user enforcement',
      'Plan-tiered limits (CPU, RAM, container count)',
    ],
  },
  {
    id: 'images',
    category: 'Docker',
    icon: Image,
    color: 'text-dds-green',
    title: 'Intelligent Image Registry',
    description: 'Images are first-class citizens with full lifecycle tracking. An ImageHistory collection records the complete lineage of every image from build to push to deploy.',
    bullets: [
      'Lifecycle states: ACTIVE, UNUSED, DANGLING',
      'Docker Hub push with background streaming logs',
      'ImageHistory: full build → push → deploy lineage',
      'Safe pruning — locks prevent deletion of running images',
      'Build cache pruning for dangling Docker build cache',
      'Interactive push modal with per-image tag selection',
    ],
  },
  {
    id: 'tunnels',
    category: 'Docker',
    icon: Network,
    color: 'text-dds-orange',
    title: 'Public Tunnels',
    description: 'Expose any running container to the internet with a secure public URL in one click. Tunnels auto-revoke when the container stops and are scoped per user.',
    bullets: [
      'One-click tunnel creation',
      'Auto-revoke on container stop',
      'Scoped per user and container',
      'Full audit trail for all tunnel sessions',
    ],
  },
  // ── Kubernetes ─────────────────────────────────────────────────────────────
  {
    id: 'kubernetes',
    category: 'Kubernetes',
    icon: Cloud,
    color: 'text-dds-blue',
    title: 'Kubernetes Orchestration',
    description: 'Connect multiple K8s clusters and manage namespaces, deployments, pods, services, and ingresses from a single dashboard. Scale replicas with one click.',
    bullets: [
      'Multi-cluster support',
      'Namespace and deployment management',
      'One-click replica scaling',
      'Service and ingress configuration',
      'Aggregated cluster overview with auto-refresh',
      'Pod shell access (exec) from the dashboard',
    ],
  },
  // ── Platform ───────────────────────────────────────────────────────────────
  {
    id: 'domains',
    category: 'Platform',
    icon: Globe,
    color: 'text-dds-orange',
    title: 'Custom Domains & TLS',
    description: 'Map any FQDN to your internal application. DNS TXT ownership verification prevents domain hijacking. Let\'s Encrypt certificates are provisioned and renewed automatically.',
    bullets: [
      'DNS TXT challenge verification (IDOR-safe ownership)',
      'Zero-touch Let\'s Encrypt certificate provisioning',
      'Automatic certificate renewal',
      'Domain health status with ShieldCheck / ShieldAlert UI',
      'Domain event timeline with actor, trigger, and reason',
      'Paginated domain registry with application binding',
    ],
  },
  // ── Observability ──────────────────────────────────────────────────────────
  {
    id: 'observability',
    category: 'Observability',
    icon: BarChart2,
    color: 'text-dds-blue',
    title: 'Runtime Observability Platform',
    description: 'A unified Platform Event Bus replaces three fragmented event systems. Multi-dimensional health scoring rolls up from Infrastructure → Gateway → Application → Platform.',
    bullets: [
      'Unified Platform Event Bus (Redis Pub/Sub)',
      'Tiered event persistence — only WARNING/ERROR/CRITICAL saved',
      'Multi-dimensional health score (4 axes, 4 layers)',
      'Prometheus-compatible metrics registry (Counter, Gauge, Histogram)',
      'Alert suppression — duplicates increment suppressedCount',
      'Live event stream and subsystem status grid in the dashboard',
    ],
  },
  {
    id: 'autopilot',
    category: 'Observability',
    icon: Zap,
    color: 'text-dds-orange',
    title: 'Autopilot — Autonomous Operations',
    description: 'Separate Decision from Execution. Scaling, Traffic, and Healing engines produce pure Decision objects applied by the Execution Layer with cooldown guards preventing flapping.',
    bullets: [
      'ScalingEngine, TrafficEngine, HealingEngine — pure Decision objects',
      'TargetTracking strategy with minReplicas / maxReplicas bounds',
      'Cooldown windows and hysteresis guards prevent flapping',
      'Redis-backed PlatformScheduler evaluation every 15 seconds',
      'Every autonomous action emits an explainabilityRecord + domain event',
      'AutopilotPage: Observed Metrics → Decision → Execution pipeline view',
    ],
  },
  // ── AI ─────────────────────────────────────────────────────────────────────
  {
    id: 'copilot',
    category: 'AI',
    icon: Sparkles,
    color: 'text-dds-primary',
    title: 'AI DevOps Copilot',
    description: 'Context-aware AI that consumes real structured metadata from your Build Engine, Resilience, and Observability subsystems. Secrets are aggressively redacted before any prompt is constructed.',
    bullets: [
      'KnowledgeEngine: RepositorySummary, PlatformHealthSummary, DeploymentSummary',
      'IntentRouter dispatches FailureAnalysis, ArchitectureReview, GeneralChat skills',
      'Gemini 2.5 Flash provider — swappable BaseProvider interface',
      'Streaming Server-Sent Events (SSE) — real-time token delivery',
      'CopilotMessage persists skillInvoked, confidence, and knowledgeObjectsUsed',
      'Structured CopilotRecommendations rendered as action cards',
    ],
  },
  // ── Security ───────────────────────────────────────────────────────────────
  {
    id: 'security',
    category: 'Security',
    icon: Shield,
    color: 'text-dds-red',
    title: 'Security Center & Audit Trail',
    description: 'The Platform Event Bus replaces fragmented SecurityLog tables. All security events are categorized with AUTH, SECRETS, INFRASTRUCTURE, RECOVERY, AUDIT, and COMPLIANCE domains.',
    bullets: [
      'Event domains: AUTH, SECRETS, INFRASTRUCTURE, RECOVERY, AUDIT, COMPLIANCE',
      'Persistent INFO logs for security domains (audit history)',
      'RBAC: operator and admin roles with per-action permission checks',
      'Brute-force protection with Redis-backed login attempt tracking',
      'JWT HttpOnly cookies + RefreshToken rotation',
      'Plan-tiered Redis rate limiter (fail-closed on Redis outage)',
    ],
  },
  {
    id: 'backups',
    category: 'Security',
    icon: RefreshCw,
    color: 'text-dds-primary',
    title: 'Platform Resilience & Backups',
    description: 'Self-describing BackupManifests track platformVersion, schemaVersion, checksum, and per-collection document counts. Restore operations are staged to prevent blind mutations.',
    bullets: [
      'Immutable BackupManifest with checksum and collectionMetadata',
      'Retention tiers: daily, weekly, monthly, pinned',
      'Staged restore: Plan → Pre-backup → Execute → Verify',
      'Maintenance mode pauses PlatformScheduler during restore',
      'Checksum re-verification after execution',
      'Automated via PlatformScheduler: backup:daily, backup:retention',
    ],
  },
  {
    id: 'secrets',
    category: 'Security',
    icon: KeyRound,
    color: 'text-dds-orange',
    title: 'Secrets & Environment Management',
    description: 'Secrets are AES-encrypted at rest and auto-injected at deploy time. Environment snapshots are pinned to release manifests, guaranteeing the exact config that was tested is what gets deployed.',
    bullets: [
      'AES-encrypted secrets — never exposed in logs',
      'Per-environment scoping',
      'Auto-injected at deploy time',
      'ConfigSnapshot pinned to every release manifest',
      'Audit log for every secret access event',
    ],
  },
  // ── Developer Platform ─────────────────────────────────────────────────────
  {
    id: 'api',
    category: 'Developer',
    icon: Code2,
    color: 'text-dds-blue',
    title: 'Public API & SDK',
    description: 'The entire public API is defined by an OpenAPI 3.0 specification. Internal models are mapped to stable DTOs ensuring long-term backward compatibility with mechanical SDK generation.',
    bullets: [
      'OpenAPI 3.0 source of truth',
      'Stable DTOs — internal models never leaked to consumers',
      'SDK generation: TypeScript, Python, Go, Java',
      'Personal Access Tokens (PAT) for API auth',
      'Unified platformAuth middleware (PAT + Extension API Keys)',
      'Rate limiting natively integrated with existing Redis limiter',
    ],
  },
  {
    id: 'extensions',
    category: 'Developer',
    icon: Puzzle,
    color: 'text-dds-green',
    title: 'Extension Architecture',
    description: 'Third-party integrations define an ExtensionManifest with versioning, requested capabilities, and JSON configuration schemas. AJV validates config before activation.',
    bullets: [
      'Capability-based permissions (repository:read, deployment:execute, …)',
      'AJV JSON schema validation before activation',
      'Lifecycle: Discover → Validate → Install → Configure → Enable',
      'Extension API Keys with scoped capabilities',
      'Extension Marketplace page in the Developer Portal',
    ],
  },
  {
    id: 'webhooks',
    category: 'Developer',
    icon: Webhook,
    color: 'text-dds-orange',
    title: 'Outgoing Webhooks',
    description: 'Subscribe to Platform Event Bus events (including wildcards) and receive HMAC-SHA256 signed payloads. Retry scheduling is backed by Redis — no volatile in-memory queues.',
    bullets: [
      'Platform Event Bus integration (wildcard subscriptions)',
      'Deterministic HMAC-SHA256 signature on raw payload',
      'Redis-backed exponential backoff retry via PlatformScheduler',
      '14-day delivery history with MongoDB TTL index',
      'Webhook management page in the Developer Portal',
    ],
  },
  {
    id: 'cli',
    category: 'Developer',
    icon: Terminal,
    color: 'text-dds-primary',
    title: 'CLI Tool',
    description: 'Full parity with the dashboard. Every action — deploy, scale, logs, rollback, pipeline triggers — is available as a CLI command with JSON output for scripting.',
    bullets: [
      'Full dashboard feature parity',
      'devopsease deploy / logs / scale / rollback',
      'JSON output for scripting and CI pipelines',
      'GitHub OAuth + PAT authentication',
    ],
  },
  {
    id: 'scheduler',
    category: 'Platform',
    icon: RefreshCw,
    color: 'text-dds-green',
    title: 'Platform Scheduler',
    description: 'Redis-backed distributed job scheduler powering all recurring platform jobs. Atomic MongoDB locking ensures only one cluster node claims each job across horizontal scale-out.',
    bullets: [
      'Autopilot evaluation every 15 seconds',
      'Build cache pruning and preview TTL expiry',
      'Backup daily + backup retention jobs',
      'Atomic MongoDB findOneAndUpdate for distributed claim',
    ],
  },
  {
    id: 'artifact-studio',
    category: 'Platform',
    icon: FlaskConical,
    color: 'text-dds-blue',
    title: 'Artifact Review Studio',
    description: 'Generated deployment artifacts open in a Monaco Editor. Immutable ArtifactBundle + ArtifactRevision tracks every manual edit. An approval workflow gates execution.',
    bullets: [
      'Monaco Editor (VS Code-style) built in to the dashboard',
      'Immutable ArtifactBundle + traceable ArtifactRevision history',
      'Pre-flight preview: services, networks, volumes before deploy',
      'Approval workflow gate before execution',
      'Dedicated validators: Docker, Compose, K8s, Pipelines, Env Vars',
      'Live WebSocket deployment log streaming on execution',
    ],
  },
];

const CATEGORIES = ['All', 'CI/CD', 'Docker', 'Kubernetes', 'Observability', 'AI', 'Security', 'Developer', 'Platform'];

// ─── Card ─────────────────────────────────────────────────────────────────────

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="card flex flex-col p-8 sm:p-10 gap-6"
    >
      <h3 className="text-xl font-bold text-dds-white tracking-tight">{feature.title}</h3>
      
      <p className="text-dds-text-secondary text-[15px] leading-relaxed flex-1">
        {feature.description}
      </p>

      {feature.bullets && feature.bullets.length > 0 && (
        <ul className="flex flex-col gap-2.5 mt-2">
          {feature.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-dds-text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-dds-border mt-1.5 flex-shrink-0" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const FeaturesPage: React.FC = () => {
  const [active, setActive] = useState('All');

  const filtered = active === 'All' ? FEATURES : FEATURES.filter(f => f.category === active);

  return (
    <LandingLayout>

      {/* ── Split Hero ─────────────────────────────────────────────────────── */}
      <section className="py-16 border-b border-dds-border/50">
        <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — headline */}
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-dds-primary/10 text-dds-primary text-xs font-semibold border border-dds-primary/20 mb-6">
                <Check className="w-3.5 h-3.5" />
                20 production-grade capabilities
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-dds-white leading-tight">
                Built for real{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">
                  DevOps workflows
                </span>
              </h1>
            </motion.div>

            {/* Right — description + CTA */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
              <p className="text-dds-text-secondary text-lg leading-relaxed mb-8">
                DevOpsEase covers every stage from your first Git push to autonomous production operations — CI/CD, intelligent builds, release orchestration, observability, self-healing Autopilot, and an AI Copilot, all production-ready out of the box.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/login?tab=register" className="btn-primary px-6 py-3 text-sm">
                  Start for Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/docs" className="btn-secondary px-6 py-3 text-sm">
                  Read the Docs
                </Link>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Sticky Filter Tabs ─────────────────────────────────────────────── */}
      <section className="sticky top-0 z-[60] bg-dds-bg/90 backdrop-blur-md border-b border-dds-border py-3">
        <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-[6px] text-sm font-medium border transition-all ${active === cat
                  ? 'bg-dds-primary text-white border-dds-primary shadow-lg shadow-dds-primary/20'
                  : 'bg-dds-surface text-dds-text-secondary border-dds-border hover:text-dds-white hover:border-dds-text-muted'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ── 2-Column Feature Grid ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24 py-16 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {filtered.map((feature, i) => (
            <FeatureCard key={feature.id} feature={feature} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-20 rounded-[6px] border border-dds-primary/20 bg-dds-elevated p-12 text-center"
        >
          <h2 className="text-3xl font-bold text-dds-white mb-3">Ready to simplify your DevOps?</h2>
          <p className="text-dds-text-secondary mb-8 max-w-lg mx-auto">
            Start for free. No credit card required. Upgrade as your infrastructure grows.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login?tab=register" className="btn-primary px-6 py-3">
              Start for Free <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/docs" className="btn-secondary px-6 py-3">
              Read the Docs
            </Link>
          </div>
        </motion.div>
      </section>

    </LandingLayout>
  );
};

export default FeaturesPage;
