import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LandingLayout } from '../components/LandingLayout';
import { NAV_GROUPS } from './docsData';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

/* ── helpers ─────────────────────────────── */
const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = 'bash' }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-dds-border bg-dds-surface">
      <div className="flex items-center justify-between px-4 py-2 border-b border-dds-border bg-dds-elevated">
        <span className="text-xs text-dds-text-muted font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-dds-text-muted hover:text-dds-white transition-colors">
          {copied ? <Check size={13} className="text-dds-green" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed"><code className="text-dds-primary font-mono">{code}</code></pre>
    </div>
  );
};

const Note: React.FC<{ type?: 'info' | 'warn' | 'tip'; children: React.ReactNode }> = ({ type = 'info', children }) => {
  const styles = { info: 'border-dds-blue/40 bg-dds-blue/5 text-dds-blue', warn: 'border-dds-orange/40 bg-dds-orange/5 text-dds-orange', tip: 'border-dds-green/40 bg-dds-green/5 text-dds-green' };
  const labels = { info: '📘 Note', warn: '⚠️ Warning', tip: '✅ Tip' };
  return <div className={`my-4 p-4 rounded-xl border text-sm leading-relaxed ${styles[type]}`}><strong className="block mb-1">{labels[type]}</strong>{children}</div>;
};

const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="text-2xl font-bold text-dds-white mt-14 mb-4 scroll-mt-28 flex items-center gap-3">
    <span className="w-1 h-6 rounded-full bg-gradient-to-b from-dds-primary to-dds-blue flex-shrink-0" />
    {children}
  </h2>
);
const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 className="text-base font-semibold text-dds-white mt-6 mb-2">{children}</h3>;
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-dds-text-secondary leading-relaxed mb-3 text-sm">{children}</p>;
const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-dds-text-secondary text-sm mb-1.5">
    <span className="text-dds-primary mt-0.5 flex-shrink-0">▸</span>{children}
  </li>
);
const Table: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto my-4 rounded-xl border border-dds-border">
    <table className="w-full text-sm">
      <thead className="bg-dds-elevated border-b border-dds-border">
        <tr>{headers.map(h => <th key={h} className="px-4 py-2.5 text-left text-dds-text-muted font-semibold text-xs">{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-dds-border/50 hover:bg-dds-surface/60 transition-colors">{r.map((c, j) => <td key={j} className="px-4 py-2.5 text-dds-text-secondary text-xs">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

/* ── page ─────────────────────────────────── */
export const DocsPage: React.FC = () => {
  const [active, setActive] = useState('introduction');

  const onScroll = useCallback(() => {
    const targets = document.querySelectorAll('h2[id], section[id]');
    const scrollPosition = window.scrollY + 160;
    let current = 'introduction';
    targets.forEach(s => {
      if ((s as HTMLElement).offsetTop <= scrollPosition) {
        current = s.id;
      }
    });
    setActive(current);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <LandingLayout>
      <div className="max-w-7xl mx-auto px-8 lg:px-12 xl:px-24 py-12">
        <div className="flex gap-10">

          {/* ── Sidebar ── */}
          <motion.aside
            className="hidden lg:block w-64 flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <p className="text-xs font-bold tracking-widest text-dds-text-muted uppercase mb-4">Platform Docs</p>
              <div className="space-y-5">
                {NAV_GROUPS.map(g => (
                  <div key={g.group}>
                    <p className="text-xs font-bold text-dds-text-muted uppercase tracking-widest mb-2">{g.group}</p>
                    <ul className="space-y-0.5">
                      {g.items.map(item => (
                        <li key={item.id}>
                          <button onClick={() => scrollTo(item.id)}
                            className={`w-full text-left text-sm py-1 pl-3 rounded-lg border-l-2 transition-all ${active === item.id ? 'border-dds-primary text-dds-primary bg-dds-primary/5 font-medium' : 'border-transparent text-dds-text-muted hover:text-dds-white hover:border-dds-border'}`}>
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {/* Developer callout */}
              <div className="mt-6 p-3 rounded-xl border border-dds-primary/20 bg-dds-primary/5">
                <p className="text-dds-primary text-xs font-semibold mb-1">🛠️ Self-Hosting?</p>
                <p className="text-dds-text-muted text-xs mb-2">Setup guides, contribution docs, blog & community.</p>
                <Link to="/developers" className="flex items-center gap-1 text-xs text-dds-primary hover:text-dds-white transition-colors font-medium">
                  Developers Hub <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          </motion.aside>

          {/* ── Content ── */}
          <motion.main
            className="flex-1 min-w-0"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >

            {/* ─── INTRODUCTION ─── */}
            <section id="introduction" className="scroll-mt-28 mb-2">
              <motion.h1
                className="text-4xl font-bold mb-4 bg-gradient-to-r from-dds-primary via-purple-400 to-dds-blue bg-clip-text text-transparent"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                DevOpsEase Documentation
              </motion.h1>
              <P><strong className="text-white">DevOpsEase</strong> is a full-scale DevOps platform that gives you a single unified dashboard and CLI to manage your entire infrastructure — Docker containers, image builds, CI/CD pipelines, Kubernetes clusters, secrets, registries, and real-time observability.</P>
              <P>This documentation covers everything you need to use the DevOpsEase platform. No installation required — just sign in and start building.</P>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {[
                  { icon: '🐳', title: 'Container Management', desc: 'Full Docker lifecycle with AI-powered failure intelligence, real-time logs, exec terminal, and health monitoring.' },
                  { icon: '⚙️', title: 'CI/CD Pipelines', desc: 'Define pipelines in YAML, trigger on GitHub push, stream live build logs, and deploy automatically.' },
                  { icon: '☸️', title: 'Kubernetes', desc: 'Connect clusters, manage namespaces and pods, generate YAML manifests, and view live cluster dashboards.' },
                  { icon: '🔍', title: 'Real-time Observability', desc: 'WebSocket metrics, structured log parsing, health monitoring, and instant alert notifications.' },
                  { icon: '🔐', title: 'Security First', desc: 'AES-256-GCM encrypted secrets, OAuth login, JWT sessions, RBAC, and full audit logs.' },
                  { icon: '💻', title: 'Powerful CLI', desc: '25 command modules, 80+ sub-commands. Manage your entire platform from the terminal with the `dse` binary.' },
                ].map(f => (
                  <motion.div key={f.title} variants={fadeUp} className="p-4 rounded-xl border border-dds-border bg-dds-surface hover:border-dds-primary/40 transition-colors">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <div className="font-semibold text-dds-white text-sm mb-1">{f.title}</div>
                    <div className="text-dds-text-muted text-xs leading-relaxed">{f.desc}</div>
                  </motion.div>
                ))}
              </motion.div>
              <Note type="tip">New to DevOpsEase? Follow the sections in order — <button onClick={() => scrollTo('first-login')} className="underline text-emerald-400">Sign Up & Login</button> then <button onClick={() => scrollTo('overview')} className="underline text-emerald-400">System Overview</button> to get oriented in under 5 minutes.</Note>
            </section>

            {/* ─── SIGN UP & LOGIN ─── */}
            <H2 id="first-login">Sign Up & Login</H2>
            <P>Visit the DevOpsEase platform URL. You'll be greeted with the login page — no installation or setup needed. DevOpsEase supports three authentication methods:</P>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
              {[
                { icon: '🐙', name: 'GitHub OAuth', desc: 'Click "Continue with GitHub". Authorize DevOpsEase. You\'ll be logged in instantly with your GitHub identity.' },
                { icon: '🔵', name: 'Google OAuth', desc: 'Click "Continue with Google". Works with any Google Workspace or personal account.' },
                { icon: '✉️', name: 'Email & Password', desc: 'Register with an email and password. Toggle between Login and Register on the same form.' },
              ].map(m => (
                <div key={m.name} className="p-4 rounded-xl border border-dds-border bg-dds-surface">
                  <div className="text-xl mb-1">{m.icon}</div>
                  <div className="text-dds-white font-semibold text-sm mb-1">{m.name}</div>
                  <div className="text-dds-text-muted text-xs leading-relaxed">{m.desc}</div>
                </div>
              ))}
            </div>
            <H3>Session Security</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Access token</strong> — short-lived JWT (30 min), auto-refreshed silently in the background</Li>
              <Li><strong className="text-dds-white">Refresh token</strong> — 7-day session, rotated on every use. Replay attacks kill the entire session immediately.</Li>
              <Li>Cross-tab safe — only one refresh request fires even with multiple browser tabs open</Li>
              <Li>Brute-force protected — 10 attempts/15 min per IP, progressive delays, 15-min lockout after 20 failures</Li>
            </ul>
            <Table
              headers={['Role', 'What you can do']}
              rows={[
                ['admin', 'Full platform access — all resources, audit logs, observability dashboard'],
                ['operator', 'Full control over your own resources — containers, builds, pipelines, clusters, secrets'],
              ]}
            />
            <Note type="tip">Your avatar in the top-right header opens a dropdown showing your name, email, plan badge (Free / Pro), and a logout button.</Note>

            {/* ─── SYSTEM OVERVIEW ─── */}
            <H2 id="overview">System Overview</H2>
            <P>The <strong className="text-dds-white">Home</strong> dashboard is your mission control — a real-time view of every resource in your DevOpsEase account. Each card shows live counts and status breakdowns.</P>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              {['🐳 Containers','🔨 Builds','🚀 Deployments','☸️ Clusters','📦 Pods','🖼️ Images','📁 Repositories','🗂️ Projects','🌐 Networks','💾 Volumes'].map(r => (
                <div key={r} className="flex items-center gap-2 p-3 rounded-lg border border-dds-border bg-dds-surface text-dds-text-secondary text-sm">{r}</div>
              ))}
            </div>
            <ul className="mb-4">
              <Li>Click any card to navigate directly to that resource's management page</Li>
              <Li>The deployment status pill in the header shows live health from anywhere in the app</Li>
              <Li>The alert bell badge shows your unresolved alert count in real time</Li>
            </ul>

            {/* ─── NAVIGATION ─── */}
            <H2 id="navigation">Navigation</H2>
            <H3>Header</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Left</strong> — DevOpsEase logo</Li>
              <Li><strong className="text-dds-white">Center</strong> — real-time deployment status pill</Li>
              <Li><strong className="text-dds-white">Right</strong> — alert bell (with unresolved count badge) + user avatar dropdown</Li>
            </ul>
            <H3>ResourceNav Bar</H3>
            <P>The sticky tab bar below the header is present on every dashboard page:</P>
            <CodeBlock lang="text" code={`← Back to Site | Home  Containers  Builds  Images  Deployments
                   Repositories  Clusters  Pods  Pipelines
                   Projects  Networks  Volumes  Registry  Docs`} />
            <ul className="mb-4">
              <Li>The <strong className="text-dds-white">← Back to Site</strong> button (blue-purple gradient) returns you to the public landing page</Li>
              <Li>Active tab highlighted with a blue underline — scrolls horizontally on mobile</Li>
            </ul>

            {/* ─── ALERTS ─── */}
            <H2 id="alerts">Alerts & Notifications</H2>
            <P>DevOpsEase automatically generates and delivers real-time alerts when something goes wrong — no manual polling required.</P>
            <Table
              headers={['Alert Type', 'Severity', 'Triggered When']}
              rows={[
                ['CRASH',           'CRITICAL', 'Container exits unexpectedly (non-zero exit code)'],
                ['CRASH_LOOP',      'CRITICAL', 'Container restarts 5+ times — crash loop detected'],
                ['OOM',             'CRITICAL', 'Out-of-memory kill event (exit code 137)'],
                ['HIGH_CPU',        'WARNING / CRITICAL', 'CPU ≥ 80% / 95% of plan quota'],
                ['HIGH_MEMORY',     'WARNING / CRITICAL', 'Memory ≥ 80% / 95% of plan quota'],
                ['QUOTA_WARNING',   'WARNING',  'Container count ≥ 80% of plan limit'],
                ['HEALTH_DEGRADED', 'WARNING',  'Container transitions to DEGRADED state'],
                ['HEALTH_UNHEALTHY','CRITICAL', 'Container transitions to UNHEALTHY state'],
              ]}
            />
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Real-time</strong> — delivered via WebSocket with auto-reconnect</Li>
              <Li><strong className="text-dds-white">Deduplication</strong> — same type on same container suppressed within 5 minutes</Li>
              <Li><strong className="text-dds-white">Auto-cleanup</strong> — resolved alerts deleted after 7 days</Li>
              <Li><strong className="text-dds-white">Bell badge</strong> — shows unresolved count (capped at 99+); click to open slide-out panel</Li>
              <Li><strong className="text-dds-white">Toasts</strong> — CRITICAL → red, WARNING → amber, INFO → blue</Li>
            </ul>
            <Note type="tip">Visit the <strong>Alerts</strong> page for full history with severity filters (CRITICAL / WARNING / INFO), resolved/unresolved toggle, and pagination.</Note>

            {/* ─── 9. CONTAINERS ─── */}
            <H2 id="containers-intro">Managing Containers</H2>
            <P>The <strong className="text-dds-white">Containers</strong> page lists every Docker container on your account — running, stopped, paused, and exited. Each card shows the container name, image, status, and real-time CPU/memory usage.</P>
            <ul className="mb-4">
              <Li>Filter by status: <strong className="text-dds-white">All</strong>, <strong className="text-dds-white">Running</strong>, <strong className="text-dds-white">Stopped</strong>, <strong className="text-dds-white">Paused</strong></Li>
              <Li>Click any container card to open its detail view with Logs, Stats, Exec, Health, and Intelligence tabs</Li>
              <Li><strong className="text-dds-white">Create Container</strong> — modal with image selector, ports, env vars, restart policy, and resource limits</Li>
              <Li><strong className="text-dds-white">Remove All</strong> — force-removes every container you own (with confirmation)</Li>
            </ul>
            <Table
              headers={['Create Field', 'Required', 'Example']}
              rows={[
                ['Image', '✅ Yes', 'nginx:latest  or  my-app:v2 (from your builds)'],
                ['Container Name', '❌ Optional', 'my-nginx — DNS-label format'],
                ['Port Mappings', '❌ Optional', '8080:80 — host:container'],
                ['Environment Variables', '❌ Optional', 'NODE_ENV=production'],
                ['Restart Policy', '❌ Optional', 'no / always / unless-stopped / on-failure'],
                ['CPU / Memory Limit', '❌ Optional', '0.5 cores / 256 MB — Docker HostConfig hard caps'],
              ]}
            />

            {/* ─── 10. LIFECYCLE ─── */}
            <H2 id="container-lifecycle">Lifecycle Controls</H2>
            <Table
              headers={['Action', 'What it does']}
              rows={[
                ['Start',   'Starts an exited or stopped container'],
                ['Stop',    'Graceful stop — SIGTERM then SIGKILL after 10s'],
                ['Restart', 'Stop then start in one atomic operation'],
                ['Pause',   'Freezes all processes via cgroups — container still exists'],
                ['Unpause', 'Resumes a paused container instantly'],
                ['Remove',  'Force-removes the container (running or stopped) — permanent'],
              ]}
            />
            <ul className="mb-4">
              <Li>Every action is written to the <strong className="text-dds-white">Action History</strong> timeline in the container detail view</Li>
              <Li>Any active exec session is automatically terminated when a container is stopped, restarted, or removed</Li>
              <Li>The UI polls until Docker confirms the state transition — no stale "Running" states after a stop command</Li>
            </ul>
            <Note type="warn">Remove is permanent. The container's writable layer is deleted. Always use named volumes for persistent data.</Note>

            {/* ─── 11. LOGS ─── */}
            <H2 id="container-logs">Logs & Monitoring</H2>
            <P>Open any container → <strong className="text-dds-white">Logs</strong> tab. DevOpsEase streams and parses stdout/stderr with structured intelligence:</P>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Log level detection</strong> — lines auto-classified as INFO, WARN, ERROR, DEBUG with colour coding</Li>
              <Li><strong className="text-dds-white">Timestamps</strong> — toggle Docker timestamps on/off</Li>
              <Li><strong className="text-dds-white">Live streaming</strong> — auto-scrolls as the container produces output</Li>
              <Li><strong className="text-dds-white">Search/filter</strong> — filter lines by keyword instantly</Li>
              <Li><strong className="text-dds-white">Log stats</strong> — total lines, error count, warn count</Li>
              <Li><strong className="text-dds-white">Download</strong> — export the current buffer as a <code className="text-dds-primary">.txt</code> file</Li>
            </ul>
            <P>The <strong className="text-dds-white">Stats</strong> tab shows real-time CPU % and Memory MB streamed via WebSocket, with live animated graphs and usage shown as <code className="text-dds-primary">used / limit</code>.</P>

            {/* ─── 12. EXEC ─── */}
            <H2 id="container-exec">Exec Terminal</H2>
            <P>Open any running container → <strong className="text-dds-white">Exec</strong> tab. A full interactive terminal runs in your browser via WebSocket and XTerm.js — no SSH or local Docker CLI needed.</P>
            <CodeBlock lang="bash" code={`# What runs behind the scenes:
docker exec -it <container-id> /bin/bash
# Falls back to /bin/sh if bash is unavailable`} />
            <ul className="mb-4">
              <Li>Fully interactive — arrow keys, tab completion, Ctrl+C, auto window resize</Li>
              <Li>Idle timeout: sessions auto-terminate after <strong className="text-dds-white">5 minutes</strong> of inactivity</Li>
              <Li>Countdown badge turns amber (&lt;60s) then red (&lt;30s) before timeout</Li>
              <Li>Click <strong className="text-dds-white">⏻ Terminate</strong> in the terminal header to end the session manually</Li>
              <Li>Reconnect overlay appears after any termination — start a fresh session in one click</Li>
            </ul>

            {/* ─── 13. HEALTH ─── */}
            <H2 id="container-health">Health & Auto-Recovery</H2>
            <P>DevOpsEase monitors containers <strong className="text-dds-white">event-by-event</strong> using Docker's event stream. When Docker fires an <code className="text-dds-primary">oom</code>, <code className="text-dds-primary">health_status</code>, or <code className="text-dds-primary">restart</code> event, the platform instantly classifies the health state.</P>
            <Table
              headers={['State', 'Meaning', 'Color']}
              rows={[
                ['HEALTHY',   'Running normally, no issues detected',                        '🟢 Green'],
                ['DEGRADED',  'Instability detected — watch closely',                        '🟡 Amber'],
                ['UNHEALTHY', 'Active problem — OOM, crash loop, or HEALTHCHECK failed',     '🔴 Red'],
              ]}
            />
            <P>When a <code className="text-dds-primary">CRASH_LOOP</code> is detected and the container has a restart policy (<code className="text-dds-primary">always</code>, <code className="text-dds-primary">unless-stopped</code>, or <code className="text-dds-primary">on-failure</code>), DevOpsEase automatically attempts recovery — with a <strong className="text-dds-white">5-minute cooldown</strong> to prevent restart storms. Health history keeps the last 20 state changes for 30 days.</P>
            <Note type="tip">Set restart policy to <strong>On Failure</strong> with max retries 3 when creating containers for production workloads.</Note>

            {/* ─── 14. FAILURE INTELLIGENCE ─── */}
            <H2 id="failure-intelligence">Failure Intelligence</H2>
            <P>The Failure Intelligence engine turns raw Docker signals (exit codes, log patterns, restart counts) into <strong className="text-dds-white">human-readable diagnoses</strong>. Open any container → <strong className="text-dds-white">Intelligence</strong> card — it updates automatically on every state change.</P>
            <Table
              headers={['Classification', 'Confidence']}
              rows={[
                ['HEALTHY — running normally',                        'High'],
                ['GRACEFUL_STOP — intentional stop (exit 0/137/143)','High'],
                ['CRASH_LOOP — 3+ restarts, non-zero exits',         'High'],
                ['OOM_KILLED — exit 137 + OOM log patterns',         'High'],
                ['PORT_CONFLICT — "address already in use" in logs', 'Medium–High'],
                ['CONFIG_ERROR — "no such file / invalid config"',   'Medium–High'],
                ['RESOURCE_EXHAUSTION — disk full, killed signal',   'High'],
                ['UNKNOWN — no matching pattern (fallback)',          'Low'],
              ]}
            />
            <P>The card shows: classification badge, confidence bar (Low/Medium/High), evidence lines, and suggested actions — all from deterministic pattern matching, no ML or external calls.</P>

            {/* ─── 15. RESOURCE LIMITS ─── */}
            <H2 id="resource-limits">Resource Limits & Quota</H2>
            <P>Every user account is assigned a <strong className="text-dds-white">plan</strong> that governs compute, storage, and API rate limits. The default plan is <code className="text-dds-primary">free</code>.</P>

            <H3>Compute Quotas</H3>
            <Table
              headers={['Resource', 'Free', 'Pro ($199)', 'Premium ($399)']}
              rows={[
                ['Max Containers',     '2',      '10',     '20'],
                ['CPU (total cores)',   '1',      '4',      '8'],
                ['Memory (total)',      '512 MB', '4 GB',   '16 GB'],
                ['Storage',            '1 GB',   '10 GB',  '25 GB'],
                ['Storage type',       'Ephemeral', 'Persistent', 'Persistent'],
                ['Preview Environments', '1',    '5',      '15'],
              ]}
            />

            <H3>Rate Limits</H3>
            <Table
              headers={['Action', 'Free', 'Pro', 'Premium']}
              rows={[
                ['Container create',    '5/hour',    '20/hour',   '50/hour'],
                ['Exec sessions',       '10/min',    '60/min',    '300/min'],
                ['Destructive actions',  '5/min',    '20/min',    '100/min'],
                ['Platform API',        '60/min',    '300/min',   '1000/min'],
              ]}
            />

            <H3>Preview Environment Limits</H3>
            <Table
              headers={['Resource', 'Free', 'Pro', 'Premium']}
              rows={[
                ['Max previews',   '1',    '5',    '15'],
                ['CPU per preview', '0.5 cores', '1 core', '2 cores'],
                ['Memory per preview', '256 MB', '512 MB', '1 GB'],
              ]}
            />

            <ul className="mb-4">
              <Li>Quota is based on <strong className="text-dds-white">actual runtime usage</strong> (measured every 10s from Docker stats), not reserved limits</Li>
              <Li>The live quota panel on the dashboard shows containers, CPU, and memory as progress bars — amber at 75%, red at 90%</Li>
              <Li>Container creation is blocked at the plan limit with a clear error message</Li>
              <Li>Rate limiting is <strong className="text-dds-white">fail-closed</strong> — if Redis is down, operations are blocked rather than allowed open</Li>
              <Li>Destructive actions (stop, remove, restart) have their own separate rate limit</Li>
            </ul>
            <Note type="tip">Check your current usage on the Resource Quota bar at the top of the Builds and Containers pages — it updates every 20 seconds.</Note>
            <Note type="warn">Storage quota accumulates from built image sizes. Delete unused images from the Images page to reclaim space.</Note>

            {/* ─── 16. TUNNELS ─── */}
            <H2 id="tunnels">Public Tunnels</H2>
            <P>Expose a running container's port to the internet via a <strong className="text-dds-white">temporary HTTPS URL</strong> — ideal for sharing previews, demos, or testing webhooks without deploying to production.</P>
            <CodeBlock lang="text" code={`Container port:  3000
Duration:        1 hour
→ Public URL:    https://abc123.ngrok.io`} />
            <Table
              headers={['Setting', 'Options']}
              rows={[
                ['Duration', '15 min / 30 min / 1 hr / 2 hr / 4 hr / 6 hr'],
                ['Quota',    'Maximum 3 active tunnels per user'],
              ]}
            />
            <ul className="mb-4">
              <Li>Live countdown timer on every tunnel — you always know how much time remains</Li>
              <Li>Tunnels <strong className="text-dds-white">auto-revoke</strong> on expiry — no cleanup needed</Li>
              <Li>Manually close any tunnel at any time from the Tunnels dashboard</Li>
            </ul>
            <Note type="warn">Tunnel URLs are publicly accessible. Never expose databases or internal APIs without application-level authentication.</Note>

            {/* ─── 17. IMAGE BUILD ENGINE ─── */}
            <H2 id="builds-intro">Image Build Engine</H2>
            <P>DevOpsEase has a built-in Docker image build engine — write a Dockerfile directly in the browser, hit <strong className="text-dds-white">Build Image</strong>, and watch the output stream live. No local Docker CLI, no CI runner needed.</P>
            <H3>How It Works</H3>
            <CodeBlock lang="text" code={`1. Write or paste your Dockerfile in the editor
2. Give the image a tag  (e.g. my-app:v1.0)
3. Click Build Image — a build job is queued
4. Live build output streams to your browser via WebSocket
5. On success the image appears in Images → ready to run`} />
            <H3>Build Form Fields</H3>
            <Table
              headers={['Field', 'Required', 'Details']}
              rows={[
                ['Image Tag',   '✅ Yes', 'e.g. my-app:v1.0  —  max 128 characters, Docker tag format'],
                ['Dockerfile',  '✅ Yes', 'Full Dockerfile content — pasted or typed in the Monaco-style textarea'],
              ]}
            />
            <H3>Live Build Output</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">WebSocket streaming</strong> — every build log line appears in real time with line numbers</Li>
              <Li><strong className="text-dds-white">Colour-coded lines</strong> — ERROR/FATAL lines highlighted red, WARN lines amber</Li>
              <Li><strong className="text-dds-white">Connection indicator</strong> — Live (green) / Reconnecting (amber) / Connecting (grey)</Li>
              <Li><strong className="text-dds-white">Auto-scroll</strong> — log viewer follows output as lines arrive</Li>
              <Li>On completion the viewer switches to showing the persisted <code className="text-dds-primary">logSummary</code> from the database</Li>
            </ul>
            <H3>Build Status Flow</H3>
            <Table
              headers={['Status', 'Meaning']}
              rows={[
                ['PENDING',  'Job queued — waiting for the build worker'],
                ['RUNNING',  'Docker build in progress — logs streaming'],
                ['SUCCESS',  'Image built — size, layer count, and image ID recorded'],
                ['FAILED',   'Build error — failure analysis panel shown automatically'],
                ['TIMEOUT',  'Build exceeded 15-minute limit — treated as failure'],
              ]}
            />
            <H3>Resource Quota</H3>
            <P>The <strong className="text-dds-white">Resource Quota</strong> bar at the top of the Builds page shows your live infrastructure usage — containers, CPU cores, and memory — updated every 20 seconds. Builds run inside the same quota envelope as containers.</P>
            <ul className="mb-4">
              <Li>Container creation is blocked when the container quota is at 100%</Li>
              <Li>CPU and memory bars turn amber at 75%, red at 90% — a visual warning before builds start competing for resources</Li>
              <Li>Total build count is shown in the top-right of the quota bar for quick reference</Li>
            </ul>
            <Note type="tip">Keep Dockerfiles minimal — start with a small base image (<code className="text-emerald-300">alpine</code>, <code className="text-emerald-300">node:alpine</code>, <code className="text-emerald-300">python:slim</code>) to reduce build time and image size.</Note>
            <Note type="warn">The 15-minute build timeout is a hard limit. Multi-stage builds and large dependency installs may need to be split or pre-cached in the base image.</Note>

            {/* ─── 18. BUILD INTELLIGENCE ─── */}
            <H2 id="build-intel">Build Intelligence</H2>
            <P>When a build fails, DevOpsEase automatically analyses the captured log output and classifies the failure into one of <strong className="text-dds-white">7 failure types</strong> — no manual log-grepping needed. The result appears as a <strong className="text-dds-white">Failure Intelligence</strong> panel directly on the Build Detail page.</P>

            <H3>The 7 Failure Types</H3>
            <Table
              headers={['Type', 'What triggers it', 'Accent']}
              rows={[
                ['BUILD_SYNTAX_ERROR',        'Dockerfile instruction error — invalid RUN, COPY, FROM, etc.', '🔴 Red'],
                ['BUILD_BASE_IMAGE_MISSING',  '"manifest unknown" or "pull access denied" — base image not found or private', '🔴 Red'],
                ['BUILD_PERMISSION_DENIED',   'COPY/ADD denied, chmod failures, bind-mount permission errors', '🟡 Amber'],
                ['BUILD_RESOURCE_EXHAUSTION', '"no space left on device", memory kill during build, OOM in RUN step', '🟠 Orange'],
                ['BUILD_DISK_SPACE',          'Disk quota exceeded on the build host — distinct from resource exhaustion', '🟠 Orange'],
                ['BUILD_TIMEOUT',             'Build exceeded the 15-minute hard limit', '🟠 Orange'],
                ['BUILD_UNKNOWN',             'No pattern matched — generic fallback, confidence is always Low', '⚫ Grey'],
              ]}
            />

            <H3>Confidence Score</H3>
            <P>Every classification comes with a <strong className="text-dds-white">confidence percentage</strong> (0–100%) derived from how many log signals matched the expected pattern for that failure type:</P>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">≥ 90%</strong> — displayed in <span className="text-emerald-400">green</span>; pattern match is unambiguous</Li>
              <Li><strong className="text-dds-white">60–89%</strong> — displayed in <span className="text-yellow-400">amber</span>; likely correct but some signals were absent</Li>
              <Li><strong className="text-dds-white">&lt; 60%</strong> — displayed in <span className="text-slate-400">grey</span>; low evidence, treat as a hint not a diagnosis</Li>
            </ul>

            <H3>Failing Stage</H3>
            <P>Where available, the panel also shows the <strong className="text-dds-white">Failing Stage</strong> — the exact Dockerfile instruction that caused the build to stop (e.g. <code className="text-dds-primary">RUN npm install</code> or <code className="text-dds-primary">COPY . /app</code>). This is extracted directly from the Docker build log output.</P>

            <H3>Evidence Lines</H3>
            <P>The raw log lines that triggered the classification are shown in a scrollable <strong className="text-dds-white">Evidence</strong> box — so you can verify the diagnosis and trace it back to the exact output.</P>

            <Note type="tip">For <code className="text-emerald-300">BUILD_BASE_IMAGE_MISSING</code> errors — check the image name spelling and confirm it's public on Docker Hub, or connect your Docker Hub account in Registry if it's a private image.</Note>
            <Note type="info">Build Intelligence is purely deterministic — no ML, no external API calls. Classification runs entirely on the backend against the captured <code className="text-blue-300">logSummary</code> using regex pattern sets.</Note>

            {/* ─── 19. IMAGE GOVERNANCE ─── */}
            <H2 id="images">Image Governance</H2>
            <P>The <strong className="text-dds-white">Images</strong> page gives you a full inventory of every Docker image on your account with storage accounting, usage classification, and one-click cleanup — so you're never blindsided by disk space creep.</P>

            <H3>Image Status Classification</H3>
            <P>Every image is automatically classified into one of three states, updated whenever containers start, stop, or are removed:</P>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['ACTIVE',   'Currently used by at least one running or stopped container', '🟢 Green'],
                ['UNUSED',   'Exists on disk but no container references it — safe to delete', '🟡 Amber'],
                ['DANGLING', '<none>:<none> — untagged layer from a failed or superseded build', '🔴 Red'],
              ]}
            />

            <H3>Storage Summary</H3>
            <P>Five summary cards at the top of the Images page give you an instant storage snapshot:</P>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Total Storage</strong> — combined size of all images on disk</Li>
              <Li><strong className="text-dds-white">Build Cache</strong> — space used by Docker's layer cache from previous builds</Li>
              <Li><strong className="text-dds-white">Active</strong> — count of images currently in use</Li>
              <Li><strong className="text-dds-white">Unused</strong> — count of images with no container reference</Li>
              <Li><strong className="text-dds-white">Dangling</strong> — count of untagged intermediate layers</Li>
            </ul>

            <H3>Safe Clean Storage</H3>
            <P>Click <strong className="text-dds-white">Safe Clean Storage</strong> to open the prune modal. It runs a <strong className="text-dds-white">preview scan first</strong> — showing you exactly which images will be removed and how much space will be reclaimed — before anything is deleted.</P>
            <CodeBlock lang="text" code={`Preview scan → lists UNUSED + DANGLING images
  ↓
Shows:  3 images can be removed · 1.4 GB reclaimable
  ↓
Confirm Clean → images deleted → Images list refreshed`} />
            <ul className="mb-4">
              <Li>Only UNUSED and DANGLING images are targeted — ACTIVE images are never touched</Li>
              <Li>Partial failures are reported per-image (e.g. image locked by a stopped container)</Li>
              <Li>Storage summary cards refresh automatically after a successful prune</Li>
            </ul>

            <H3>Clean Build Cache</H3>
            <P>The <strong className="text-dds-white">Clean Cache</strong> button clears Docker's build layer cache — separate from image deletion. The modal shows the current cache size before you confirm. This is safe to run at any time; Docker will rebuild layers on the next build as needed.</P>

            <H3>Filtering by Status</H3>
            <P>Use the filter tabs in the header — <strong className="text-dds-white">All / Active / Unused / Dangling</strong> — to focus on exactly the images you want to inspect or clean up. Counts update live.</P>

            <H3>Push to Docker Hub</H3>
            <P>Each row in the image table has a <strong className="text-dds-white">Push</strong> button. This sends the image to your connected Docker Hub account under a repository tag you specify. The button is disabled until Docker Hub is connected — see <button onClick={() => {}} className="underline text-dds-primary">Docker Hub Registry</button> below.</P>

            <Note type="tip">Run <strong>Safe Clean Storage</strong> regularly to keep your storage quota healthy. Dangling images accumulate quickly during active development.</Note>
            <Note type="warn">Deleting an UNUSED image is permanent. If you need the image again you will have to rebuild it or re-pull it from Docker Hub.</Note>

            {/* ─── 20. DOCKER HUB REGISTRY ─── */}
            <H2 id="registry">Docker Hub Registry</H2>
            <P>The <strong className="text-dds-white">Registry</strong> page is your Docker Hub integration hub — connect your account once and unlock pulling public/private images, pushing your built images, and searching Docker Hub directly from the dashboard.</P>

            <H3>Connecting Your Account</H3>
            <P>Enter your Docker Hub <strong className="text-dds-white">username</strong> and <strong className="text-dds-white">password or access token</strong> and click <strong className="text-dds-white">Connect Docker Hub</strong>. Your credentials are encrypted immediately with <strong className="text-dds-white">AES-256-GCM</strong> before being written to the database — the plaintext password is never stored.</P>
            <ul className="mb-4">
              <Li>A <strong className="text-dds-white">violet AES-256-GCM</strong> badge is shown next to the password field as a reminder that credentials are encrypted at rest</Li>
              <Li>Once connected, a green <strong className="text-dds-white">Connected</strong> badge and your Docker Hub username are shown in the card header</Li>
              <Li>Click <strong className="text-dds-white">Disconnect</strong> at any time to wipe the stored credentials — requires confirmation</Li>
            </ul>

            <H3>Rate Limits</H3>
            <P>Docker Hub enforces pull rate limits based on whether you are authenticated:</P>
            <Table
              headers={['Auth State', 'Pull Limit', 'Reset Window']}
              rows={[
                ['Not connected (anonymous)', '100 pulls', 'per 6 hours per IP address'],
                ['Connected (authenticated)',  '200 pulls', 'per 6 hours per Docker Hub account'],
                ['Push',                       'Unlimited', 'No rate limit on push operations'],
              ]}
            />
            <ul className="mb-4">
              <Li>The <strong className="text-dds-white">amber warning banner</strong> on the connect form reminds you of the anonymous limit before you log in</Li>
              <Li>After connecting, a <strong className="text-dds-white">green rate-limit info row</strong> confirms your authenticated allowance</Li>
              <Li>Hitting the pull limit returns a <code className="text-dds-primary">429 Too Many Requests</code> error — wait for the window to reset or connect an account</Li>
            </ul>

            <H3>Pulling Images</H3>
            <P>Use the <strong className="text-dds-white">Pull Image</strong> card to pull any image from Docker Hub directly onto your DevOpsEase host. Type the image name (with optional tag) and hit Pull:</P>
            <CodeBlock lang="bash" code={`nginx:latest
redis:7-alpine
my-org/my-private-image:v2.1`} />
            <ul className="mb-4">
              <Li>Pulled images appear immediately in the <strong className="text-dds-white">Images</strong> page with source tagged as <code className="text-dds-primary">REGISTRY</code></Li>
              <Li>Pull count is tracked per-image — visible on the Image Detail page</Li>
              <Li>Private images require a connected and authenticated Docker Hub account</Li>
            </ul>

            <H3>Searching Docker Hub</H3>
            <P>The <strong className="text-dds-white">Explore Docker Hub</strong> search panel lets you find images without leaving the dashboard. Type at least 2 characters — results appear automatically with a 400ms debounce.</P>
            <ul className="mb-4">
              <Li>Each result shows: image name, description, star count, pull count, and an <strong className="text-dds-white">Official</strong> badge for Docker-verified images</Li>
              <Li>Click <strong className="text-dds-white">Pull</strong> on any result to pull it instantly</Li>
              <Li>The <strong className="text-dds-white">Popular Images</strong> grid (nginx, redis, postgres, mongo, node, python…) is shown when the search is empty — click any tile to pull</Li>
            </ul>
            <H3>Pushing Images</H3>
            <P>From the <strong className="text-dds-white">Images</strong> page, hit <strong className="text-dds-white">Push</strong> on any image row to open the Push modal. Enter the target repository tag (e.g. <code className="text-dds-primary">my-org/my-app:v1.0</code>) and confirm. The push runs server-side and reports the final pushed tag on success.</P>
            <Note type="tip">Use Docker Hub <strong>access tokens</strong> instead of your account password — they are revocable and can be scoped to read-only or read/write as needed.</Note>
            <Note type="warn">Pushing to a repository you don't own will fail with a 403. Make sure the repository name matches your Docker Hub username or organisation namespace.</Note>
            {/* ─── 21. LINKING REPOSITORIES ─── */}
            <H2 id="repositories">Linking Repositories</H2>
            <P>The <strong className="text-dds-white">Repositories</strong> page connects your GitHub repositories to DevOpsEase so that every <code className="text-dds-primary">git push</code> automatically triggers your full CI/CD pipeline — build, test, and deploy — with zero manual intervention.</P>

            <H3>Linking a Repository</H3>
            <P>Click <strong className="text-dds-white">Link Repository</strong>, paste the full GitHub HTTPS URL, and choose the branch to track:</P>
            <CodeBlock lang="bash" code={`# Both formats work:
https://github.com/your-org/my-app
https://github.com/your-username/my-service`} />
            <Table
              headers={['Field', 'Required', 'Detail']}
              rows={[
                ['Repository URL', '✅ Yes', 'Full GitHub HTTPS URL — SSH URLs are not supported'],
                ['Branch',         '❌ Optional', 'Defaults to main — only pushes to this branch trigger runs'],
              ]}
            />
            <ul className="mb-4">
              <Li>Both <strong className="text-dds-white">public and private</strong> repositories are supported — private repos require a GitHub OAuth login or fine-grained access token</Li>
              <Li>On every pipeline run, the repo is cloned with <strong className="text-dds-white">shallow clone</strong> (<code className="text-dds-primary">--depth 1</code>) on the tracked branch — fast and bandwidth-efficient</Li>
              <Li>Each linked repo card shows its <strong className="text-dds-white">last commit hash, branch, pipeline status, and sync time</strong></Li>
            </ul>

            <H3>Webhook Auto-Setup</H3>
            <P>DevOpsEase automatically registers a <strong className="text-dds-white">GitHub webhook</strong> on the repository the moment it's linked — no manual configuration in GitHub settings required.</P>
            <Table
              headers={['Webhook Event', 'What it triggers', 'Verified?']}
              rows={[
                ['push',         'Pipeline run — build → test → deploy on the tracked branch', '✅ HMAC-SHA256'],
                ['pull_request', 'Reserved — not used yet',                                    '✅ HMAC-SHA256'],
              ]}
            />
            <ul className="mb-4">
              <Li>Webhook payloads are verified with <strong className="text-dds-white">HMAC-SHA256 signatures</strong> — forged or replayed requests are rejected automatically</Li>
              <Li>Pushes to <em>non-tracked</em> branches are silently ignored — no false pipeline triggers</Li>
              <Li>The full webhook delivery log is visible in GitHub → your repo → Settings → Webhooks</Li>
            </ul>

            <H3>Managing Linked Repos</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Repo name and URL</strong> — shown on the card; click to open on GitHub</Li>
              <Li><strong className="text-dds-white">Pipeline status</strong> — last run result (SUCCESS / FAILED / RUNNING) shown inline</Li>
              <Li><strong className="text-dds-white">Unlink</strong> — removes the repo record <em>and</em> deletes the GitHub webhook in one action; existing pipeline run history is preserved</Li>
            </ul>
            <Note type="tip">Use a <strong>fine-grained GitHub Personal Access Token</strong> (repo scope only) for private repos — it can be revoked independently without affecting your GitHub password.</Note>
            <Note type="warn">Unlinking a repository removes the GitHub webhook and stops all future pipeline triggers. To re-enable, simply link the repository again.</Note>

            {/* ─── 22. DEFINING PIPELINES ─── */}
            <H2 id="pipeline-def">Defining Pipelines</H2>
            <P>Pipelines are defined in a <strong className="text-dds-white">YAML file</strong> committed to your repository root. DevOpsEase reads and validates it when you link the repo, and re-parses it on every webhook push — always running the latest committed version.</P>

            <H3>Pipeline YAML Schema</H3>
            <CodeBlock lang="yaml" code={`name: my-app-pipeline
version: "1.0"

steps:
  - name: build
    type: build
    dockerfile: Dockerfile
    tag: my-app:latest

  - name: test
    type: test
    command: npm test

  - name: deploy
    type: deploy
    image: my-app:latest
    environment: production`} />

            <H3>Top-Level Fields</H3>
            <Table
              headers={['Field', 'Required', 'Detail']}
              rows={[
                ['name',    '✅ Yes', 'Display name shown in the Pipelines UI'],
                ['version', '✅ Yes', 'Schema version — currently "1.0"'],
                ['steps',   '✅ Yes', 'Ordered array of step definitions — minimum 1 step required'],
              ]}
            />

            <H3>Step Types</H3>
            <Table
              headers={['type', 'What it does', 'Required step fields']}
              rows={[
                ['build',  'Builds a Docker image from a Dockerfile in the cloned repo',      'dockerfile, tag'],
                ['test',   'Runs a shell command in the build context — exit code 0 = pass',  'command'],
                ['deploy', 'Deploys the built image as a Docker container or K8s workload',   'image, environment'],
              ]}
            />
            <ul className="mb-4">
              <Li>Steps execute <strong className="text-dds-white">top to bottom</strong> — the order in YAML is the execution order</Li>
              <Li>A failed step <strong className="text-dds-white">stops the pipeline immediately</strong> (fail-fast) — remaining steps are marked SKIPPED</Li>
              <Li>The <code className="text-dds-primary">environment</code> field on deploy steps accepts <code className="text-dds-primary">dev</code>, <code className="text-dds-primary">staging</code>, or <code className="text-dds-primary">production</code></Li>
            </ul>
            <Note type="tip">Name your file <code className="text-emerald-300">devopsease.yml</code> and commit it to the <strong>repository root</strong> — subdirectory paths are not scanned.</Note>
            <Note type="warn">YAML syntax errors and missing required fields are caught at parse time — no steps are run until the file is valid.</Note>

            {/* ─── 23. PIPELINE EXECUTION ─── */}
            <H2 id="pipeline-exec">Pipeline Execution</H2>
            <P>Every pipeline run is a first-class record — tracked from the moment a webhook fires to final completion, with live logs, per-step timing, and a full status trail persisted to the database.</P>

            <H3>How a Run Starts</H3>
            <CodeBlock lang="text" code={`git push → GitHub webhook → HMAC-SHA256 verified
  ↓
DevOpsEase queues a pipeline run (status: PENDING)
  ↓
Steps execute sequentially: build → test → deploy
  ↓
Run record saved with status, timing, and full log output`} />

            <H3>Run Status</H3>
            <Table
              headers={['Status', 'Meaning']}
              rows={[
                ['PENDING',  'Queued — waiting for the previous run to finish or resources to free'],
                ['RUNNING',  'Actively executing — one or more steps in progress'],
                ['SUCCESS',  'All steps completed with exit code 0'],
                ['FAILED',   'A step failed — pipeline aborted, remaining steps skipped'],
              ]}
            />

            <H3>Live Execution Logs</H3>
            <ul className="mb-4">
              <Li>Each step streams output in <strong className="text-dds-white">real time</strong> via WebSocket — visible on the Pipeline Run detail page as it happens</Li>
              <Li>Logs are colour-coded: <strong className="text-dds-white">ERROR</strong> (red), <strong className="text-dds-white">WARN</strong> (amber), <strong className="text-dds-white">INFO</strong> (slate)</Li>
              <Li>On completion, logs are <strong className="text-dds-white">persisted to the database</strong> — accessible any time after the run finishes</Li>
            </ul>

            <H3>Execution Guarantees</H3>
            <Table
              headers={['Behaviour', 'Detail']}
              rows={[
                ['Sequential',  'Steps run one at a time — no parallelism within a single pipeline'],
                ['Fail-fast',   'Any step failure aborts the run — remaining steps are marked SKIPPED'],
                ['Timeout',     'Each step times out after 15 minutes — same hard limit as image builds'],
                ['Concurrency', 'Only one run per pipeline is active at a time — new pushes queue behind it'],
              ]}
            />
            <Note type="tip">Every pipeline run records the triggering <strong>commit hash and branch</strong> — visible on the run detail page, making it easy to trace a deploy back to the exact code change.</Note>
            <Note type="warn">If a push arrives while a run is active, it queues — it does not cancel the in-progress run. Back-to-back pushes will run sequentially, not in parallel.</Note>

            {/* ─── 24. DEPLOYMENTS ─── */}
            <H2 id="deployments">Deployments</H2>
            <P>The <strong className="text-dds-white">Deployments</strong> page is the live record of every service DevOpsEase has deployed — from pipeline <code className="text-dds-primary">deploy</code> steps, to manual triggers, to Kubernetes rollouts — each with status, environment, linked container, and full metadata.</P>

            <H3>Deployment Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['running',   'Container or pod is live and serving traffic',            '🟢 Green'],
                ['deploying', 'Deploy step is in progress — container is starting up',   '🔵 Blue'],
                ['failed',    'Container exited or pod failed to schedule',              '🔴 Red'],
                ['stopped',   'Deployment was manually stopped',                         '⚫ Grey'],
              ]}
            />

            <H3>What Each Deployment Records</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Environment</strong> — <code className="text-dds-primary">dev</code>, <code className="text-dds-primary">staging</code>, or <code className="text-dds-primary">production</code> — set by the pipeline YAML deploy step</Li>
              <Li><strong className="text-dds-white">Image tag</strong> — the exact Docker image used for this deployment</Li>
              <Li><strong className="text-dds-white">Commit hash & branch</strong> — the Git commit that triggered this deploy, for full traceability</Li>
              <Li><strong className="text-dds-white">Container / Pod link</strong> — click to jump directly to the running container or Kubernetes pod</Li>
            </ul>

            <H3>Actions</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Stop</strong> — gracefully stops the running container (SIGTERM → SIGKILL after 10s) or scales the K8s deployment to 0 replicas</Li>
              <Li><strong className="text-dds-white">Remove</strong> — permanently deletes the deployment record and its associated container</Li>
              <Li><strong className="text-dds-white">Rollback</strong> — re-deploys using a previous deployment's image tag; see the next section</Li>
            </ul>
            <Note type="tip">Filter the Deployments list by <strong>environment</strong> (dev / staging / production) to instantly see what's running in each stage.</Note>
            <Note type="warn">Remove permanently deletes both the deployment record and the container. The container's writable layer is gone — use named volumes for any data you need to keep.</Note>

            {/* ─── 25. ROLLBACK & HISTORY ─── */}
            <H2 id="rollback">Rollback & History</H2>
            <P>Every deployment is stored permanently — giving you a full audit trail and the ability to re-deploy any previous version in one click, without touching your source code or pipeline.</P>

            <H3>How Rollback Works</H3>
            <CodeBlock lang="text" code={`Select any previous deployment → click Rollback
  ↓
DevOpsEase stops the current running deployment
  ↓
Re-deploys using the selected deployment's exact image tag
  ↓
New deployment record created — rollback reason logged`} />
            <ul className="mb-4">
              <Li>Rollback creates a <strong className="text-dds-white">new deployment record</strong> — history is never mutated or overwritten</Li>
              <Li>An optional <strong className="text-dds-white">rollback reason</strong> can be provided — stored in the deployment metadata for audit purposes</Li>
              <Li>The target image must still be available locally — if it was pruned via Safe Clean Storage, the rollback will fail</Li>
            </ul>

            <H3>Deployment History</H3>
            <ul className="mb-4">
              <Li>All deployments listed in <strong className="text-dds-white">reverse-chronological order</strong> with full metadata</Li>
              <Li>Each entry shows: <strong className="text-dds-white">environment, image tag, commit hash, branch, created time, and final status</strong></Li>
              <Li>Click any deployment to view its full <strong className="text-dds-white">log output</strong> from the deploy step</Li>
              <Li>History is <strong className="text-dds-white">never automatically deleted</strong> — you control retention</Li>
            </ul>
            <Note type="tip">Before pruning images, check Deployments history — <strong>tag and preserve</strong> any image you might need to roll back to later.</Note>
            <Note type="warn">If a rollback target image has been deleted via Safe Clean Storage, the rollback will fail with an image-not-found error. Re-build or re-pull the image first.</Note>

            {/* ─── 26. DOCKER COMPOSE PROJECTS ─── */}
            <H2 id="projects">Docker Compose Projects</H2>
            <P>The <strong className="text-dds-white">Projects</strong> page lets you define, deploy, and manage multi-service applications from a single Docker Compose YAML — all containers, networks, and volumes created and managed as one atomic unit.</P>

            <H3>Creating a Project</H3>
            <P>Click <strong className="text-dds-white">New Project</strong>, enter a project name, and paste your Compose YAML. DevOpsEase validates the file before creating anything:</P>
            <CodeBlock lang="yaml" code={`version: "3.8"
services:
  web:
    image: nginx:latest
    ports:
      - "8080:80"
    depends_on:
      - api

  api:
    image: my-app:v1.0
    environment:
      - DATABASE_URL=mongodb://db:27017/myapp
    depends_on:
      - db

  db:
    image: mongo:6
    volumes:
      - db-data:/data/db

volumes:
  db-data:`} />
            <ul className="mb-4">
              <Li><strong className="text-dds-white">YAML validation</strong> — the Compose file is parsed and validated before any containers are created; errors are shown inline with the failing line</Li>
              <Li>All containers, networks, and volumes are <strong className="text-dds-white">namespaced</strong> with the project name — e.g. <code className="text-dds-primary">myapp-web-1</code>, <code className="text-dds-primary">myapp-db-1</code></Li>
              <Li>Services start in <strong className="text-dds-white">dependency order</strong> — <code className="text-dds-primary">depends_on</code> is respected; upstream services start first</Li>
            </ul>

            <H3>Project Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['CREATED', 'Project defined but no containers started yet',                  '🔵 Blue'],
                ['RUNNING', 'All services are up and containers are live',                    '🟢 Green'],
                ['STOPPED', 'All containers have been stopped — Compose definition preserved', '⚫ Grey'],
                ['FAILED',  'One or more services failed to start',                           '🔴 Red'],
              ]}
            />

            <H3>Network Isolation</H3>
            <P>Each project automatically gets a <strong className="text-dds-white">dedicated Docker network</strong> — services within the project reach each other by service name (e.g. <code className="text-dds-primary">http://api:3000</code>), and are fully isolated from containers in other projects or standalone deployments.</P>

            <H3>Lifecycle Controls</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Start</strong> — brings all stopped containers back up, recreating any that were removed</Li>
              <Li><strong className="text-dds-white">Stop</strong> — gracefully stops all running containers in the project; Compose definition is preserved</Li>
              <Li><strong className="text-dds-white">Delete</strong> — stops and removes all containers and the shared project network; named volumes are <em>not</em> deleted automatically</Li>
            </ul>

            <H3>Viewing Services</H3>
            <P>Expand any project card to see all its services — each listed with container name, image, and current status. Click a service to jump to its container detail page for logs, stats, and exec terminal.</P>

            <Note type="tip">Use project namespacing to run multiple environments side by side — e.g. <code className="text-emerald-300">myapp-dev</code> and <code className="text-emerald-300">myapp-staging</code> as separate projects on the same host with no port conflicts.</Note>
            <Note type="warn">Deleting a project removes all its containers and the shared network, but <strong>named volumes are preserved</strong>. Remove them from the Volumes page if no longer needed.</Note>

            {/* ─── 27. NETWORKS ─── */}
            <H2 id="networks">Networks</H2>
            <P>The <strong className="text-dds-white">Networks</strong> page lists every user-scoped Docker network on your account — with live usage tracking, safe-delete enforcement, and automatic reconciliation against the Docker daemon.</P>

            <H3>Creating a Network</H3>
            <ul className="mb-4">
              <Li>Click <strong className="text-dds-white">Create Network</strong> and enter a name — DevOpsEase creates a standard <code className="text-dds-primary">bridge</code> network scoped to your account</Li>
              <Li>Network names must be unique per host — duplicates are rejected at the Docker level</Li>
              <Li>User-created networks can be manually assigned when launching containers via the Create Container modal</Li>
            </ul>

            <H3>Network Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['ACTIVE', 'At least one container is currently connected to this network', '🟢 Green'],
                ['UNUSED', 'No containers connected — safe to remove without side effects',  '🟡 Amber'],
              ]}
            />

            <H3>Safe Delete</H3>
            <ul className="mb-4">
              <Li>Removing an <strong className="text-dds-white">UNUSED</strong> network is instant and non-destructive — no containers are affected</Li>
              <Li>Attempting to remove an <strong className="text-dds-white">ACTIVE</strong> network is blocked — you must disconnect or stop all connected containers first</Li>
              <Li>Networks created by a <strong className="text-dds-white">Project</strong> are labelled with the project name — delete them via the Projects page, not here</Li>
            </ul>

            <H3>Reconciliation</H3>
            <P>DevOpsEase periodically <strong className="text-dds-white">reconciles</strong> the network list with the Docker daemon — stale records from containers removed externally are cleaned up automatically. A manual reconcile button is available on the Networks page.</P>
            <Note type="tip">Create a shared network once and attach multiple containers to it — they can communicate by container name without exposing any ports to the host.</Note>
            <Note type="warn">Default Docker networks (<code className="text-dds-primary">bridge</code>, <code className="text-dds-primary">host</code>, <code className="text-dds-primary">none</code>) are not listed — only user-created networks are shown and managed.</Note>

            {/* ─── 28. VOLUMES ─── */}
            <H2 id="volumes">Volumes</H2>
            <P>The <strong className="text-dds-white">Volumes</strong> page manages named Docker volumes — persistent storage that survives container restarts and removals. DevOpsEase tracks size, container attachment, and project ownership for every volume.</P>

            <H3>Creating a Volume</H3>
            <ul className="mb-4">
              <Li>Click <strong className="text-dds-white">Create Volume</strong> and enter a name — DevOpsEase creates a named Docker volume scoped to your account</Li>
              <Li>Only <strong className="text-dds-white">named volumes</strong> are tracked — anonymous volumes (no name at create time) are not managed or shown</Li>
              <Li>Mount volumes to containers via the <strong className="text-dds-white">Create Container</strong> modal using the volume name</Li>
            </ul>

            <H3>Volume Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['ACTIVE',         'Currently mounted by one or more running containers',           '🟢 Green'],
                ['UNUSED',         'Not mounted by any container — safe to delete',                 '🟡 Amber'],
                ['PENDING_DELETE',  'Marked for deletion — will be removed on the next reconcile',  '🔴 Red'],
              ]}
            />

            <H3>Storage Accounting</H3>
            <ul className="mb-4">
              <Li>Each volume card shows its <strong className="text-dds-white">size in MB</strong> and the list of <strong className="text-dds-white">attached container IDs</strong></Li>
              <Li>Volumes created by a <strong className="text-dds-white">Project</strong> are labelled with the project name — delete them via the Projects page to avoid orphans</Li>
              <Li>Total volume storage is tracked toward your <strong className="text-dds-white">storage quota</strong> — shown in the quota bar at the top of the page</Li>
            </ul>

            <H3>Safe Prune</H3>
            <P>Click <strong className="text-dds-white">Prune Unused Volumes</strong> to open the prune modal. A preview scan runs first — showing exactly which volumes will be removed and the total space reclaimed — before anything is deleted.</P>
            <CodeBlock lang="text" code={`Preview scan → lists UNUSED volumes with sizes
  ↓
Shows:  4 volumes · 2.1 GB reclaimable
  ↓
Confirm Prune → volumes deleted → list refreshed`} />
            <Note type="tip">Run volume prune after deleting stale projects to reclaim disk space from leftover database and cache volumes.</Note>
            <Note type="warn">Volume deletion is <strong>permanent and irreversible</strong>. Any data stored in the volume — databases, file uploads, caches — is gone. Always back up important data before pruning.</Note>

            {/* ─── 29. SECRETS ─── */}
            <H2 id="secrets">Secrets</H2>
            <P>The <strong className="text-dds-white">Secrets</strong> page is a secure, environment-scoped key-value store for sensitive configuration — API keys, database passwords, tokens, and any value you don't want hardcoded in a Dockerfile or Compose file.</P>

            <H3>Encryption at Rest</H3>
            <P>Every secret value is encrypted with <strong className="text-dds-white">AES-256-GCM</strong> before being written to the database — the plaintext value is never stored or logged.</P>
            <Table
              headers={['Property', 'Value']}
              rows={[
                ['Algorithm',     'AES-256-GCM'],
                ['Key source',    'ENCRYPTION_KEY env var — 64 hex chars (32 bytes)'],
                ['Stored format', 'iv:authTag:ciphertext — all hex-encoded'],
                ['Auth tag',      '16 bytes — prevents ciphertext tampering (authenticated encryption)'],
              ]}
            />
            <ul className="mb-4">
              <Li>Secret <strong className="text-dds-white">values are never returned</strong> by the API after creation — the UI always shows <code className="text-dds-primary">****</code></Li>
              <Li>Secret <strong className="text-dds-white">names</strong> follow env-var format — validated against <code className="text-dds-primary">^[A-Za-z_][A-Za-z0-9_]*$</code></Li>
              <Li>Max value length before encryption: <strong className="text-dds-white">8192 characters</strong></Li>
            </ul>

            <H3>Environment Scoping</H3>
            <Table
              headers={['Scope', 'Meaning']}
              rows={[
                ['development', 'Injected into containers and pipelines in dev environments only'],
                ['staging',     'Injected into staging deployments only'],
                ['production',  'Injected into production deployments only — kept separate from dev/staging'],
              ]}
            />

            <H3>Docker Container Injection</H3>
            <P>Secrets are injected as <strong className="text-dds-white">environment variables</strong> at container start time — passed directly as Docker <code className="text-dds-primary">-e KEY=VALUE</code> args, never touching <code className="text-dds-primary">process.env</code> or the host environment:</P>
            <CodeBlock lang="bash" code={`# DevOpsEase decrypts and injects at container start:
docker run -e DATABASE_PASSWORD=<decrypted> -e API_KEY=<decrypted> my-image`} />

            <H3>Kubernetes secretKeyRef</H3>
            <P>For Kubernetes YAML generation, secrets are referenced via <strong className="text-dds-white">secretKeyRef</strong> pointing to a K8s Secret named <code className="text-dds-primary">devopsease-managed-{'<environment>'}</code> — plaintext values never appear in any manifest:</P>
            <CodeBlock lang="yaml" code={`env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: devopsease-managed-production
        key: DATABASE_PASSWORD`} />
            <Note type="tip">Use environment-scoped secrets to keep production credentials completely separate from dev — a pipeline deploying to production will only resolve production-scoped secrets.</Note>
            <Note type="warn">Never change or lose your <code className="text-dds-primary">ENCRYPTION_KEY</code>. All secrets, Docker Hub credentials, and kubeconfigs are encrypted with it — changing it makes all encrypted data permanently unreadable.</Note>


            {/* ─── 30. CONNECTING CLUSTERS ─── */}
            <H2 id="clusters">Connecting Clusters</H2>
            <P>The <strong className="text-dds-white">Clusters</strong> page connects your existing Kubernetes clusters to DevOpsEase — EKS, GKE, AKS, kubeadm, k3s, and kind are all supported. Paste a kubeconfig and you're ready to manage pods, namespaces, deployments, and generate YAML from the dashboard.</P>

            <H3>Adding a Cluster</H3>
            <P>Click <strong className="text-dds-white">Connect Cluster</strong> and fill in the two fields:</P>
            <Table
              headers={['Field', 'Required', 'Detail']}
              rows={[
                ['Cluster Name', '✅ Yes', 'A display label for this cluster — shown in all K8s page selectors'],
                ['kubeconfig',   '✅ Yes', 'Full kubeconfig YAML — paste the contents of your ~/.kube/config or a service account kubeconfig'],
              ]}
            />
            <ul className="mb-4">
              <Li>DevOpsEase immediately tests the connection after saving — the cluster shows <strong className="text-dds-white">connected</strong> or <strong className="text-dds-white">failed</strong> within seconds</Li>
              <Li>All K8s distributions are supported — any cluster reachable via a valid kubeconfig works</Li>
              <Li>You can connect <strong className="text-dds-white">unlimited clusters</strong> — a cluster selector dropdown appears on every Kubernetes page</Li>
            </ul>

            <H3>Credential Security</H3>
            <P>The kubeconfig is encrypted with <strong className="text-dds-white">AES-256-GCM</strong> before being written to the database — the same encryption used for secrets and Docker Hub credentials.</P>
            <ul className="mb-4">
              <Li>The plaintext kubeconfig is <strong className="text-dds-white">never logged or returned</strong> by the API — only the cluster name and connection status are exposed</Li>
              <Li>On each API call, the kubeconfig is decrypted <strong className="text-dds-white">in memory only</strong> and discarded immediately after the K8s API response</Li>
              <Li>Startup fails immediately if <code className="text-dds-primary">ENCRYPTION_KEY</code> is missing — stored kubeconfigs are never accessible without it</Li>
            </ul>

            <H3>Connection Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['connected', 'API server reachable and credentials valid',                  '🟢 Green'],
                ['failed',    'Connection test failed — API server unreachable or 401/403',  '🔴 Red'],
              ]}
            />

            <H3>Removing a Cluster</H3>
            <ul className="mb-4">
              <Li>Click <strong className="text-dds-white">Disconnect</strong> on any cluster card — requires confirmation</Li>
              <Li>Removing deletes the encrypted kubeconfig from the database only — <strong className="text-dds-white">the actual cluster is completely unaffected</strong></Li>
              <Li>All namespace, pod, and dashboard data for that cluster is cleared from the UI</Li>
            </ul>
            <Note type="tip">Use a <strong>dedicated service account</strong> with minimal RBAC permissions rather than a cluster-admin kubeconfig — principle of least privilege applies here too.</Note>
            <Note type="warn">If your cluster's API server IP or certificate changes, you must reconnect — the stored kubeconfig will fail the connection test until updated.</Note>

            {/* ─── 31. NAMESPACES ─── */}
            <H2 id="namespaces">Namespaces</H2>
            <P>The <strong className="text-dds-white">Namespaces</strong> panel lets you list, create, and delete Kubernetes namespaces from the dashboard — and set the active namespace used by all other K8s pages and CLI commands.</P>

            <H3>Listing Namespaces</H3>
            <ul className="mb-4">
              <Li>Select a cluster from the dropdown — namespaces load from the live Kubernetes API</Li>
              <Li>The list shows all namespaces in the cluster, including system namespaces (<code className="text-dds-primary">kube-system</code>, <code className="text-dds-primary">kube-public</code>)</Li>
              <Li>The currently active namespace is <strong className="text-dds-white">highlighted</strong> — used as the default for pods, dashboard, and YAML generator</Li>
            </ul>

            <H3>Creating a Namespace</H3>
            <ul className="mb-4">
              <Li>Enter a name and click <strong className="text-dds-white">Create</strong> — DevOpsEase POSTs to the Kubernetes API and refreshes the list</Li>
              <Li>Names must be <strong className="text-dds-white">lowercase DNS-label format</strong> — letters, numbers, and hyphens only; max 63 characters</Li>
              <Li>Duplicate names are rejected by the Kubernetes API with a clear error</Li>
            </ul>

            <H3>Deleting a Namespace</H3>
            <ul className="mb-4">
              <Li>Click <strong className="text-dds-white">Delete</strong> on any namespace — a confirmation prompt shows before anything is sent to the cluster</Li>
              <Li>Deletion is <strong className="text-dds-white">permanent and cascading</strong> — all pods, deployments, services, and configmaps in the namespace are removed</Li>
              <Li>System namespaces can be deleted via the API but doing so will break your cluster — DevOpsEase warns but does not block</Li>
            </ul>
            <Note type="tip">Use one namespace per environment — <code className="text-emerald-300">dev</code>, <code className="text-emerald-300">staging</code>, <code className="text-emerald-300">production</code> — to isolate workloads on a shared cluster.</Note>
            <Note type="warn">Deleting a namespace removes every Kubernetes resource inside it. There is no undo — back up any important workloads or persistent volume claims first.</Note>

            {/* ─── 32. POD MANAGEMENT ─── */}
            <H2 id="pods">Pod Management</H2>
            <P>The <strong className="text-dds-white">Pods</strong> page gives you full observability into running Kubernetes workloads — list all pods in a namespace, monitor their health, inspect restart counts, and retrieve logs without leaving the dashboard.</P>

            <H3>Pod List</H3>
            <ul className="mb-4">
              <Li>Select a cluster and namespace — pods load from the live Kubernetes API and <strong className="text-dds-white">auto-refresh every 30 seconds</strong></Li>
              <Li>Summary cards at the top show counts for <strong className="text-dds-white">Total, Running, Pending, Failed, and Succeeded</strong></Li>
              <Li>Status filter pills let you instantly focus on a specific phase — click <strong className="text-dds-white">Failed</strong> to see only broken pods</Li>
            </ul>

            <H3>Pod Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['Running',   'All containers in the pod are live and ready',           '🟢 Green'],
                ['Pending',   'Pod scheduled but containers not yet started',           '🟡 Amber'],
                ['Failed',    'One or more containers exited with a non-zero code',     '🔴 Red'],
                ['Succeeded', 'All containers completed successfully (batch/job pods)', '🔵 Blue'],
              ]}
            />

            <H3>Pod Logs</H3>
            <ul className="mb-4">
              <Li>Click any pod to open its <strong className="text-dds-white">log viewer</strong> — a terminal-style pane with syntax-highlighted output (errors red, warnings amber)</Li>
              <Li>Tail options: <strong className="text-dds-white">50 / 100 / 500 / 1000</strong> lines — use 50 for quick debug, 1000 for crash analysis</Li>
              <Li>For <strong className="text-dds-white">multi-container pods</strong>, a container selector lets you switch between containers within the same pod</Li>
              <Li>Manual refresh button — logs are not streamed live, click to reload the latest output</Li>
            </ul>

            <H3>Pod Describe</H3>
            <ul className="mb-4">
              <Li>Shows full pod metadata: name, namespace, node, IP, labels, and creation timestamp</Li>
              <Li>Container table: image, readiness, restart count, and current state for each container</Li>
              <Li>Restart count shown in <strong className="text-dds-white">amber</strong> when greater than 0 — a quick visual signal of instability</Li>
            </ul>
            <Note type="tip">Use tail=50 for a quick sanity check on a live pod, and tail=1000 when diagnosing a recent crash or startup failure.</Note>
            <Note type="warn">Pod logs are not persisted by DevOpsEase — they are fetched live from the Kubernetes API. Once a pod is removed, its logs are gone unless you've forwarded them to an external system.</Note>

            {/* ─── 33. CLUSTER DASHBOARD ─── */}
            <H2 id="k8s-dashboard">Cluster Dashboard</H2>
            <P>The <strong className="text-dds-white">Kubernetes Dashboard</strong> aggregates pods, deployments, and services from a live cluster into one screen — with a 10-second auto-refresh, namespace switching, and colour-coded health indicators.</P>

            <H3>Controls</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Cluster selector</strong> — dropdown of all connected clusters; auto-selects the first on load</Li>
              <Li><strong className="text-dds-white">Namespace selector</strong> — populated from live namespaces; resets to default when the cluster changes</Li>
              <Li><strong className="text-dds-white">Manual refresh</strong> button — forces an immediate data reload outside the 10s cycle</Li>
              <Li>A <strong className="text-dds-white">pulsing live indicator</strong> shows the auto-refresh is active; an error banner appears on API failure</Li>
            </ul>

            <H3>Summary Cards</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Total Pods</strong> — count of all pods in the selected namespace</Li>
              <Li><strong className="text-dds-white">Deployments</strong> — count of all deployments</Li>
              <Li><strong className="text-dds-white">Services</strong> — count of all services</Li>
            </ul>

            <H3>Pods Table</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Name</strong> (monospace) · <strong className="text-dds-white">Status badge</strong> (Running=green, Pending=amber, Failed=red, Succeeded=blue)</Li>
              <Li><strong className="text-dds-white">Restarts</strong> — shown in amber if greater than 0, a quick instability signal</Li>
              <Li><strong className="text-dds-white">Age</strong> — human-readable relative time (e.g. <code className="text-dds-primary">5m ago</code>, <code className="text-dds-primary">2d ago</code>)</Li>
            </ul>

            <H3>Deployments Table</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Name</strong> · <strong className="text-dds-white">Replicas</strong> shown as <code className="text-dds-primary">available/desired</code> — green if fully available, amber if degraded</Li>
              <Li><strong className="text-dds-white">Age</strong> — relative time since the deployment was created</Li>
            </ul>

            <H3>Services Table</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Name</strong> · <strong className="text-dds-white">Type badge</strong> — ClusterIP, NodePort, or LoadBalancer</Li>
              <Li><strong className="text-dds-white">Port mappings</strong> shown as <code className="text-dds-primary">port→targetPort/PROTOCOL</code> (e.g. <code className="text-dds-primary">80→3000/TCP</code>)</Li>
            </ul>
            <Note type="tip">The dashboard fetches pods, deployments, and services in <strong>parallel</strong> — load time equals the slowest of the three calls, not their sum.</Note>
            <Note type="warn">Data is live — a failing deployment turns red immediately on the next 10-second refresh. If the cluster becomes unreachable, an error banner replaces the tables.</Note>

            {/* ─── 34. YAML GENERATOR ─── */}
            <H2 id="k8s-yaml">YAML Generator</H2>
            <P>The <strong className="text-dds-white">YAML Generator</strong> produces production-ready Kubernetes manifests — Deployment, Service, and Ingress — from a guided form. No manual YAML editing or kubectl knowledge required to generate a valid manifest.</P>

            <H3>Deployment Manifest</H3>
            <Table
              headers={['Field', 'Required', 'Detail']}
              rows={[
                ['Name',          '✅ Yes', 'Lowercase DNS-label — used for deployment name, selector, and pod labels'],
                ['Image',         '✅ Yes', 'Docker image tag — e.g. my-app:v1.0 or nginx:latest'],
                ['Replicas',      '❌ Optional', 'Number of pod replicas — defaults to 1'],
                ['Namespace',     '❌ Optional', 'Target namespace — defaults to default'],
                ['Container Port','❌ Optional', 'Port the container listens on — defaults to 3000'],
                ['Env Vars',      '❌ Optional', 'Key-value pairs — injected as plain env or secretKeyRef entries'],
              ]}
            />
            <CodeBlock lang="yaml" code={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:v1.0
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: devopsease-managed-production
                  key: DATABASE_PASSWORD`} />

            <H3>Service Manifest</H3>
            <ul className="mb-4">
              <Li>Type selector: <strong className="text-dds-white">ClusterIP</strong> (internal only), <strong className="text-dds-white">NodePort</strong> (host port exposure), or <strong className="text-dds-white">LoadBalancer</strong> (cloud LB provisioning)</Li>
              <Li>Port and targetPort fields map host traffic to the container port defined in the Deployment</Li>
              <Li>Selector automatically uses <code className="text-dds-primary">app: {'<name>'}</code> to match pods from the generated Deployment</Li>
            </ul>

            <H3>Ingress Manifest</H3>
            <ul className="mb-4">
              <Li>Hostname field — e.g. <code className="text-dds-primary">api.myapp.com</code> — routed to the generated Service</Li>
              <Li>Path prefix — defaults to <code className="text-dds-primary">/</code>, can be scoped to a subpath</Li>
              <Li>TLS toggle — adds a <code className="text-dds-primary">tls:</code> block with a secret name for your certificate</Li>
            </ul>

            <H3>Secret Injection</H3>
            <P>If you have secrets stored in the Secrets page for the selected environment, the generator automatically adds <strong className="text-dds-white">secretKeyRef</strong> entries to the deployment's env block — pointing to a Kubernetes Secret named <code className="text-dds-primary">devopsease-managed-{'<environment>'}</code>. Plaintext values never appear in any generated YAML.</P>
            <Note type="tip">Copy the generated YAML and apply it with <code className="text-emerald-300">kubectl apply -f manifest.yaml</code> — or pipe it directly: <code className="text-emerald-300">echo "$YAML" | kubectl apply -f -</code>.</Note>
            <Note type="warn">Generated YAML is for reference and manual apply only — DevOpsEase does not automatically apply it to the cluster. Review all manifests before running kubectl apply in production.</Note>

            {/* ─── 35. CLI INSTALLATION & SETUP ─── */}
            <H2 id="cli-install">CLI — Installation & Setup</H2>
            <P>The <strong className="text-dds-white">DevOpsEase CLI</strong> (<code className="text-dds-primary">devopsease</code> / <code className="text-dds-primary">dse</code>) is a single binary that puts your entire platform — containers, pipelines, Kubernetes, secrets, tunnels — on the command line. 25 command modules, 80+ sub-commands, built for scripting and DX.</P>

            <H3>Installing</H3>
            <CodeBlock lang="bash" code={`npm install -g devopsease-cli

# Verify installation:
dse --version          # 1.0.0
devopsease --version   # same binary, full name`} />

            <H3>Short Aliases</H3>
            <Table
              headers={['Alias', 'Expands to', 'Purpose']}
              rows={[
                ['dse',   'devopsease', 'Short form for every command'],
                ['dse s', 'dse status', 'Quick cluster overview — pods, deployments, services'],
                ['dse p', 'dse pod list', 'List pods in active namespace'],
                ['dse d', 'dse deploy list', 'List all deployments'],
              ]}
            />

            <H3>Config File</H3>
            <P>All CLI state is persisted to <code className="text-dds-primary">~/.devopsease/config.json</code> — created automatically on first login:</P>
            <Table
              headers={['Field', 'Default', 'Set by']}
              rows={[
                ['token',             '—',                       'dse login'],
                ['refreshToken',      '—',                       'dse login'],
                ['baseUrl',           'http://localhost:3497',   'dse config set-url <url>'],
                ['currentProject',    '—',                       'dse config set-project <id>'],
                ['currentCluster',    '—',                       'dse cluster use <id>'],
                ['currentNamespace',  'default',                 'dse ns use <name>'],
              ]}
            />

            <H3>First-Time Setup</H3>
            <CodeBlock lang="bash" code={`# 1. Point CLI at your DevOpsEase server:
dse config set-url https://your-devopsease-server.com

# 2. Login — interactive email + password prompt:
dse login

# 3. Verify everything is connected:
dse doctor`} />
            <Note type="tip">Run <code className="text-emerald-300">dse doctor</code> after setup — it runs 7 live health checks (config loaded → API reachable → token valid → cluster selected → namespace set) and tells you exactly what to fix.</Note>
            <Note type="warn">Never commit <code className="text-dds-primary">~/.devopsease/config.json</code> — it contains your access and refresh tokens. Add it to your global <code className="text-dds-primary">.gitignore</code>.</Note>

            {/* ─── 36. AUTH COMMANDS ─── */}
            <H2 id="cli-auth">Auth Commands</H2>
            <P><code className="text-dds-primary">login</code>, <code className="text-dds-primary">logout</code>, <code className="text-dds-primary">whoami</code>, <code className="text-dds-primary">doctor</code>, and <code className="text-dds-primary">config</code> — manage your session, verify connectivity, and control CLI configuration.</P>

            <H3>Session Commands</H3>
            <Table
              headers={['Command', 'Description']}
              rows={[
                ['dse login',           'Interactive email + password → stores access_token and refresh_token to config'],
                ['dse logout',          'Clears stored tokens from config — does not invalidate the server session'],
                ['dse whoami',          'Fetches /auth/me and displays name, email, role, and plan'],
                ['dse doctor',          'Runs 7 sequential health checks and prints ✔ / ✖ per item'],
                ['dse config show',     'Displays all config fields — tokens are always masked as ****'],
                ['dse config set-url',  'Updates the API base URL — e.g. https://devopsease.mycompany.com'],
                ['dse config set-project', 'Sets the active project / repository ID'],
                ['dse config reset',    'Deletes the config file and restores all defaults'],
              ]}
            />

            <H3>dse doctor — Health Checks</H3>
            <P>Runs seven checks in sequence — each prints <code className="text-dds-primary">✔</code> or <code className="text-dds-primary">✖</code> with a remediation hint on failure:</P>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">1.</strong> Configuration file loaded</Li>
              <Li><strong className="text-dds-white">2.</strong> API server reachable (<code className="text-dds-primary">/health</code>)</Li>
              <Li><strong className="text-dds-white">3.</strong> Authentication token present in config</Li>
              <Li><strong className="text-dds-white">4.</strong> Token valid — live call to <code className="text-dds-primary">/auth/me</code></Li>
              <Li><strong className="text-dds-white">5.</strong> Cluster selected in config</Li>
              <Li><strong className="text-dds-white">6.</strong> Namespace set in config</Li>
              <Li><strong className="text-dds-white">7.</strong> Namespace exists in the selected cluster (live K8s API call)</Li>
            </ul>
            <Note type="tip">Every auth error surfaces a specific remediation hint — <code className="text-emerald-300">dse login</code>, <code className="text-emerald-300">dse config set-url</code>, or <code className="text-emerald-300">dse cluster use</code> — so you're never left guessing.</Note>
            <Note type="warn"><code className="text-dds-primary">dse config reset</code> wipes all stored tokens. You will need to run <code className="text-dds-primary">dse login</code> again before any authenticated commands will work.</Note>

            {/* ─── 37. CONTAINER COMMANDS ─── */}
            <H2 id="cli-containers">Container Commands</H2>
            <P>Full Docker container lifecycle from the terminal — list, start, stop, restart, remove, exec into, and stream logs for any container managed by DevOpsEase.</P>

            <H3>Container Subcommands</H3>
            <Table
              headers={['Command', 'Description']}
              rows={[
                ['dse container list',          'List all containers with name, image, status, and created time'],
                ['dse container start <id>',    'Start a stopped container'],
                ['dse container stop <id>',     'Gracefully stop a running container — confirm prompt required'],
                ['dse container restart <id>',  'Restart a container'],
                ['dse container remove <id>',   'Remove a container permanently — confirm prompt required'],
                ['dse container logs <id>',     'Fetch container logs — supports --tail <n> and --follow'],
                ['dse container inspect <id>',  'Full container detail — image, env, mounts, network, resource limits'],
                ['dse container exec <id>',     'Run an interactive command inside a running container'],
              ]}
            />

            <H3>Log Streaming</H3>
            <CodeBlock lang="bash" code={`# Tail last 100 lines:
dse container logs <id> --tail 100

# Stream live (polls every 3s):
dse container logs <id> --follow

# Cross-resource log viewer by app name:
dse logs my-app --tail 200 --follow`} />

            <H3>dse logs — Cross-Resource Viewer</H3>
            <P><code className="text-dds-primary">dse logs {'<app>'}</code> finds the matching container or pod by app name across both Docker and Kubernetes — useful when you don't know the exact container ID or pod name.</P>
            <Note type="tip">Use <code className="text-emerald-300">dse container list --json | jq '.[] | select(.status=="running")'</code> to script filtered container queries.</Note>
            <Note type="warn">Destructive commands (<code className="text-dds-primary">stop</code>, <code className="text-dds-primary">remove</code>) always prompt for confirmation. Use <code className="text-dds-primary">--force</code> to skip the prompt in automation scripts.</Note>

            {/* ─── 38. KUBERNETES COMMANDS ─── */}
            <H2 id="cli-k8s">Kubernetes Commands</H2>
            <P>Manage clusters, namespaces, pods, deployments, services, and ingress — and get a live cluster overview with <code className="text-dds-primary">dse status</code> — all without leaving the terminal.</P>

            <H3>Command Groups</H3>
            <Table
              headers={['Group', 'Key commands']}
              rows={[
                ['dse cluster',   'list · connect · use <id> · disconnect <id>'],
                ['dse ns',        'list · create <name> · delete <name>'],
                ['dse pod',       'list · logs <name> · describe <name>'],
                ['dse k8s',       'deploy list/create/delete · generate-yaml · service list · ingress list'],
                ['dse scale',     'scale <app> -r <replicas>'],
                ['dse status (s)','Cluster overview — pods + deployments + services in one table'],
              ]}
            />

            <H3>Cluster & Namespace Management</H3>
            <CodeBlock lang="bash" code={`# List connected clusters:
dse cluster list

# Switch active cluster:
dse cluster use <cluster-id>

# List namespaces in active cluster:
dse ns list

# Create and set a new namespace:
dse ns create staging`} />

            <H3>Pod Commands</H3>
            <CodeBlock lang="bash" code={`# List all pods in active namespace:
dse pod list                           # or: dse p

# Tail pod logs (last 200 lines, follow):
dse pod logs my-app-xyz --tail 200 --follow

# Multi-container pod — select container:
dse pod logs my-app-xyz --container sidecar

# Full pod describe:
dse pod describe my-app-xyz`} />

            <H3>--namespace Flag</H3>
            <P>All K8s commands accept <code className="text-dds-primary">--namespace {'<ns>'}</code> to override the persisted active namespace without changing the config — useful for one-off cross-namespace operations.</P>
            <Note type="tip">Run <code className="text-emerald-300">dse s</code> every morning for an instant cluster health snapshot — pods, deployments, and services in three colour-coded tables.</Note>
            <Note type="warn"><code className="text-dds-primary">dse ns delete</code> removes all Kubernetes resources inside the namespace. There is no undo — the Kubernetes API processes the deletion immediately.</Note>

            {/* ─── 39. PIPELINE COMMANDS ─── */}
            <H2 id="cli-pipelines">Pipeline Commands</H2>
            <P>Link repositories, create and run pipelines, trigger deployments, and roll back — the full CI/CD lifecycle managed entirely from the terminal.</P>

            <H3>Command Groups</H3>
            <Table
              headers={['Group', 'Key commands']}
              rows={[
                ['dse repo',      'list · link · unlink <id>'],
                ['dse pipeline',  'list · create (interactive) · run <id> · status <id> · delete <id>'],
                ['dse build',     'list · trigger (repo selector) · logs <id>'],
                ['dse deploy',    'list · trigger (repo + env selector) · rollback <id>'],
                ['dse init',      'Detects project type and scaffolds a devopsease.yml interactively'],
              ]}
            />

            <H3>dse init — Project Scaffold</H3>
            <P><code className="text-dds-primary">dse init</code> scans the working directory for signature files and detects the project type automatically:</P>
            <Table
              headers={['Detected type', 'Signature files']}
              rows={[
                ['Node.js', 'package.json'],
                ['Python',  'requirements.txt · Pipfile · pyproject.toml · setup.py'],
                ['Go',      'go.mod'],
                ['Java',    'pom.xml · build.gradle · build.gradle.kts'],
                ['Rust',    'Cargo.toml'],
                ['Docker',  'Dockerfile'],
              ]}
            />
            <P>After detection, interactive prompts ask for repository, pipeline name, and step selection — then POSTs to <code className="text-dds-primary">/api/pipelines</code> and prints next-step instructions.</P>

            <H3>Pipeline Execution</H3>
            <CodeBlock lang="bash" code={`# Run a pipeline manually:
dse pipeline run <pipeline-id>

# Watch execution status:
dse pipeline status <pipeline-id>

# Stream build logs:
dse build logs <build-id>

# Rollback a deployment (confirm prompt):
dse deploy rollback <deployment-id>`} />
            <Note type="tip"><code className="text-emerald-300">dse init</code> scaffolds a complete <code className="text-emerald-300">devopsease.yml</code> in under 30 seconds — run it in any project root to get started without writing YAML manually.</Note>
            <Note type="warn"><code className="text-dds-primary">dse deploy rollback</code> re-deploys from the target image tag. If that image was pruned from the registry, the rollback will fail with an image-not-found error.</Note>

            {/* ─── 40. ADVANCED COMMANDS ─── */}
            <H2 id="cli-advanced">Advanced Commands</H2>
            <P>Secrets, tunnels, registry, image and volume management — plus the <code className="text-dds-primary">--json</code> flag that makes every read command scriptable and pipeable to <code className="text-dds-primary">jq</code>.</P>

            <H3>Command Groups</H3>
            <Table
              headers={['Group', 'Key commands']}
              rows={[
                ['dse secrets',   'list · add (interactive) · update <id> · delete <id>'],
                ['dse tunnel',    'list · create (service + duration) · delete <id>'],
                ['dse registry',  'list · add (interactive: URL, username, password) · remove <id>'],
                ['dse image',     'list · pull <name> · remove <name>'],
                ['dse network',   'list · create <name> · remove <name>'],
                ['dse volume',    'list · create <name> · remove <name>'],
                ['dse project',   'list · create · use <id> · delete <id>'],
              ]}
            />

            <H3>dse secrets — Always Masked</H3>
            <ul className="mb-4">
              <Li><code className="text-dds-primary">dse secrets list</code> — shows name, environment, and created time — values are always <strong className="text-dds-white">****</strong> in all output</Li>
              <Li><code className="text-dds-primary">dse secrets add</code> — interactive prompts for name, value, and environment (<code className="text-dds-primary">development</code> / <code className="text-dds-primary">staging</code> / <code className="text-dds-primary">production</code>)</Li>
              <Li>You cannot retrieve a secret value after creation — only <strong className="text-dds-white">overwrite</strong> it with <code className="text-dds-primary">dse secrets update</code></Li>
            </ul>

            <H3>--json Flag & Scripting</H3>
            <P>Every read command supports <code className="text-dds-primary">--json</code> — outputs raw JSON to stdout for piping and automation:</P>
            <CodeBlock lang="bash" code={`# List only running containers:
dse container list --json | jq '.[] | select(.status=="running")'

# Get pod names in a namespace:
dse pod list --json | jq '.[].name'

# Find failed deployments:
dse deploy list --json | jq '.[] | select(.status=="failed") | .id'

# Check if a secret exists:
dse secrets list --json | jq '.[] | select(.name=="DATABASE_PASSWORD")'`} />

            <H3>Spinner & Output System</H3>
            <ul className="mb-4">
              <Li>Every network call is wrapped in an <strong className="text-dds-white">ora spinner</strong> — no bare console output during async operations</Li>
              <Li>Tables rendered with <strong className="text-dds-white">cli-table3</strong> unicode box-drawing — consistent across all list commands</Li>
              <Li>Relative timestamps everywhere — <code className="text-dds-primary">5m ago</code>, <code className="text-dds-primary">2h ago</code>, <code className="text-dds-primary">3d ago</code> — via <code className="text-dds-primary">formatDate()</code></Li>
              <Li>Status strings colour-coded: green=running/success, cyan=pending, red=failed, yellow=stopped</Li>
            </ul>
            <Note type="tip">Combine <code className="text-emerald-300">--json</code> with <code className="text-emerald-300">jq</code> in shell scripts to build automation workflows around any DevOpsEase resource — containers, pods, pipelines, secrets, tunnels.</Note>
            <Note type="warn">The <code className="text-dds-primary">dse registry add</code> command stores credentials encrypted via the server's <code className="text-dds-primary">ENCRYPTION_KEY</code>. If the key changes, registry credentials become unreadable and must be re-added.</Note>

            {/* ─── 41. TROUBLESHOOTING ─── */}
            <H2 id="troubleshooting">Troubleshooting</H2>
            <P>Quick reference for the most common issues — symptom, likely cause, and the exact fix. Run <code className="text-dds-primary">dse doctor</code> first — it catches 90% of connectivity and auth issues automatically.</P>

            <H3>Auth & Session Issues</H3>
            <Table
              headers={['Symptom', 'Cause', 'Fix']}
              rows={[
                ['401 Unauthorized on every request',    'Access token expired',                        'Run dse login — or click Login in the dashboard'],
                ['CORS error in browser console',        'CORS_ORIGIN env var does not match your URL', 'Set CORS_ORIGIN=https://your-frontend-url in server .env and restart'],
                ['Session lost after server restart',    'JWT_SECRET changed or not set',               'Ensure JWT_SECRET is set and stable across restarts in .env'],
                ['"No token found" on CLI command',      'Not logged in or config was reset',           'Run dse login or dse config show to inspect stored tokens'],
              ]}
            />

            <H3>Docker & Container Issues</H3>
            <Table
              headers={['Symptom', 'Cause', 'Fix']}
              rows={[
                ['Container fails to start — "daemon not running"', 'Docker daemon stopped',              'Run: sudo systemctl start docker (Linux) or start Docker Desktop'],
                ['Permission denied on /var/run/docker.sock',       'Server user not in docker group',    'Run: sudo usermod -aG docker $USER then re-login'],
                ['Port already in use',                             'Host port conflict',                  'Change the host port mapping in the Create Container modal'],
                ['Container exits immediately',                     'App crash on startup — see logs',    'Open container logs in the dashboard or: dse container logs <id>'],
              ]}
            />

            <H3>Build & Image Issues</H3>
            <Table
              headers={['Symptom', 'Cause', 'Fix']}
              rows={[
                ['Build times out after 15 minutes',    'Dockerfile has heavy layer — no cache hit',    'Split into smaller stages; use multi-stage builds to reduce context size'],
                ['Build quota exceeded',                'Hit the max concurrent build limit',           'Wait for running builds to finish or delete unused images to free space'],
                ['"Duplicate tag" error on build',      'Tag already exists in local image store',      'Use versioned tags like my-app:v1.2 instead of my-app:latest'],
                ['Image pull fails — rate limited',     'Docker Hub anonymous pull limit reached',      'Add a Docker Hub registry credential in Settings → Registries'],
              ]}
            />

            <H3>Pipeline & CI/CD Issues</H3>
            <Table
              headers={['Symptom', 'Cause', 'Fix']}
              rows={[
                ['Webhook not firing on push',          'GitHub webhook delivery failed or URL wrong',  'Check GitHub → your repo → Settings → Webhooks → Recent Deliveries'],
                ['YAML parse error on pipeline link',   'devopsease.yml has a syntax error',            'Validate YAML at yaml.org/spec — check indentation and required fields'],
                ['Pipeline stuck in PENDING forever',   'Previous run is still active',                 'Check Pipelines page for a stuck RUNNING run and cancel it'],
                ['Deploy step fails — image not found', 'Build step did not produce the expected tag',  'Check build logs — ensure the tag in deploy.image matches build.tag'],
              ]}
            />

            <H3>Kubernetes Issues</H3>
            <Table
              headers={['Symptom', 'Cause', 'Fix']}
              rows={[
                ['Cluster shows "failed" status',         'API server unreachable or kubeconfig expired', 'Reconnect the cluster with a fresh kubeconfig from the Clusters page'],
                ['Namespace not found error',             'Active namespace was deleted externally',      'Run dse ns list and set a valid namespace with dse cluster use'],
                ['Pod in CrashLoopBackOff',               'App crashes on startup — restart loop',        'Open pod logs in the Pods page or: dse pod logs <name> --tail 500'],
                ['kubectl apply fails on generated YAML', 'API version mismatch for your cluster',       'Check apiVersion — older clusters may need apps/v1beta instead of apps/v1'],
              ]}
            />
            <Note type="tip">Run <code className="text-emerald-300">dse doctor</code> first — it checks config, token validity, API connectivity, cluster selection, and namespace existence in one command.</Note>
            <Note type="warn">If you change <code className="text-dds-primary">ENCRYPTION_KEY</code> on the server, all stored secrets, Docker Hub credentials, and kubeconfigs become permanently unreadable. Never change it on a running instance with data.</Note>

            {/* ─── 42. FAQ ─── */}
            <H2 id="faq">FAQ</H2>
            <P>Answers to the most common questions about DevOpsEase — from self-hosting and pricing to Kubernetes support and contributing.</P>

            <H3>Is DevOpsEase free to self-host?</H3>
            <P>Yes — completely. DevOpsEase is open source and free to self-host. You run it on your own server, your own infrastructure, and there are no usage limits, seat limits, or call-home requirements. See the Installation section to get started in under 10 minutes.</P>

            <H3>Does it work with my existing Docker containers?</H3>
            <P>Yes. DevOpsEase talks to the Docker daemon directly via the socket (<code className="text-dds-primary">/var/run/docker.sock</code>). Any container already running on the host — whether started by docker run, Docker Compose, or another tool — is visible in the Containers page immediately after linking.</P>

            <H3>Can multiple users share one DevOpsEase instance?</H3>
            <P>Yes. DevOpsEase has a full <strong className="text-dds-white">multi-user auth system</strong> — each user has their own account, and resources (containers, pipelines, secrets, tunnels) are user-scoped. An admin role controls platform-wide settings. Sign-up can be open or invite-only depending on your configuration.</P>

            <H3>What happens to my running containers if the DevOpsEase server restarts?</H3>
            <P>Nothing — Docker containers run independently of the DevOpsEase server process. If the server goes down and comes back up, the containers are still running and DevOpsEase re-discovers them on startup via the Docker daemon. Pipeline runs and builds in progress at the time of restart will need to be re-triggered.</P>

            <H3>What Kubernetes distributions are supported?</H3>
            <P>Any distribution accessible via a standard <strong className="text-dds-white">kubeconfig</strong> — including EKS (AWS), GKE (Google Cloud), AKS (Azure), kubeadm, k3s, k0s, RKE2, and kind for local development. If <code className="text-dds-primary">kubectl</code> works with your kubeconfig, DevOpsEase will too.</P>

            <H3>Can I use DevOpsEase without Kubernetes?</H3>
            <P>Yes — Kubernetes is entirely optional. The full Docker container management, CI/CD pipeline, build engine, secrets, tunnels, and CLI features work with just a Docker daemon. Kubernetes features simply won't be available if no cluster is connected.</P>

            <H3>How do I back up my DevOpsEase data?</H3>
            <P>All platform data lives in <strong className="text-dds-white">MongoDB</strong>. Use <code className="text-dds-primary">mongodump</code> for a consistent snapshot, or configure continuous backups with your MongoDB provider. Also back up your <code className="text-dds-primary">.env</code> file — specifically the <code className="text-dds-primary">ENCRYPTION_KEY</code> — as losing it makes all encrypted secrets and kubeconfigs unreadable.</P>

            <H3>How do I update DevOpsEase to a new version?</H3>
            <CodeBlock lang="bash" code={`# Pull latest changes:
git pull origin main

# Rebuild the dashboard:
cd dashboard && npm install && npm run build

# Restart the server:
cd ../server && npm install && pm2 restart devopsease`} />

            <H3>Is there a hosted / cloud version?</H3>
            <P>Not currently — DevOpsEase is a self-hosted platform. A managed cloud version is on the roadmap. Until then, it takes under 10 minutes to self-host on any VPS with Docker and Node.js installed.</P>

            <H3>How do I contribute or request a feature?</H3>
            <P>Open an issue or pull request on <strong className="text-dds-white">GitHub</strong>. Bug reports should include your OS, Docker version, Node.js version, and the error message. Feature requests should describe the use case and expected behaviour. Good first issues are labelled in the repository.</P>
            <Note type="tip">The fastest way to get help is to open a GitHub Discussion — the community and maintainers are active and typically respond within 24 hours.</Note>
            <Note type="warn">Before opening a bug report, run <code className="text-dds-primary">dse doctor</code> and include its output — it immediately rules out the most common configuration and connectivity issues.</Note>

            {/* ─── CUSTOM DOMAINS & TLS ─── */}
            <H2 id="domains">Custom Domains & TLS</H2>
            <P>Map any fully-qualified domain name to your deployed application. DevOpsEase handles DNS ownership verification, certificate provisioning, and automatic renewal — zero manual TLS configuration required.</P>

            <H3>Adding a Domain</H3>
            <ul className="mb-4">
              <Li>Enter the FQDN (e.g. <code className="text-dds-primary">api.myapp.com</code>) and select the application to bind it to</Li>
              <Li>DevOpsEase generates a unique <strong className="text-dds-white">DNS TXT challenge</strong> token — add this record at your DNS provider</Li>
              <Li>Click <strong className="text-dds-white">Verify</strong> — DevOpsEase resolves the TXT record and confirms ownership</Li>
            </ul>

            <H3>Domain Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Icon']}
              rows={[
                ['PENDING_VERIFICATION', 'TXT record not yet confirmed',       '🔵 ShieldAlert'],
                ['VERIFIED',             'Ownership confirmed — TLS provisioning starts', '🟢 ShieldCheck'],
                ['ACTIVE',               'Certificate issued and routing live',            '🟢 ShieldCheck'],
                ['FAILED',               'Verification or certificate issuance failed',    '🔴 ShieldAlert'],
              ]}
            />

            <H3>Certificate Lifecycle</H3>
            <ul className="mb-4">
              <Li>Certificates are provisioned via <strong className="text-dds-white">Let's Encrypt</strong> automatically after domain verification</Li>
              <Li>Renewal runs automatically before expiry — no manual intervention</Li>
              <Li>Each domain has an <strong className="text-dds-white">event timeline</strong> showing every status change with actor, trigger, and reason</Li>
            </ul>

            <H3>Ownership Security</H3>
            <P>Domain records are <strong className="text-dds-white">user-scoped</strong> — each domain is bound to the user who added it. DNS TXT verification prevents domain hijacking: you cannot bind a domain you don't control.</P>
            <Note type="tip">Use a CNAME record pointing to your DevOpsEase host for seamless routing. The TXT record is only needed for the initial verification step.</Note>
            <Note type="warn">Removing a domain deletes the TLS certificate and stops routing immediately. Re-adding requires a fresh verification cycle.</Note>

            {/* ─── AI DEVOPS COPILOT ─── */}
            <H2 id="copilot">AI DevOps Copilot</H2>
            <P>The AI Copilot is a context-aware assistant that consumes real structured metadata from your build engine, resilience subsystem, and observability platform — then provides actionable recommendations specific to your infrastructure.</P>

            <H3>Knowledge Engine</H3>
            <P>Before answering, the Copilot builds a <strong className="text-dds-white">KnowledgeContext</strong> from live platform data:</P>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">RepositorySummary</strong> — linked repos, branches, last commit, pipeline status</Li>
              <Li><strong className="text-dds-white">PlatformHealthSummary</strong> — aggregated health scores from the observability platform</Li>
              <Li><strong className="text-dds-white">DeploymentSummary</strong> — recent deployments, rollback history, environment states</Li>
            </ul>

            <H3>Intent Router</H3>
            <P>Your message is classified by the <strong className="text-dds-white">IntentRouter</strong> and dispatched to the appropriate skill:</P>
            <Table
              headers={['Skill', 'Triggered When', 'Example']}
              rows={[
                ['FailureAnalysis',     'Build or container failures detected',    '"Why did my build fail?"'],
                ['ArchitectureReview',  'Questions about infrastructure or setup', '"Should I use a multi-stage Dockerfile?"'],
                ['GeneralChat',         'General DevOps questions',                '"How do I set up a CI/CD pipeline?"'],
              ]}
            />

            <H3>Response Delivery</H3>
            <ul className="mb-4">
              <Li>Responses are streamed in real time via <strong className="text-dds-white">Server-Sent Events (SSE)</strong> — tokens appear as they're generated</Li>
              <Li>Every response records <code className="text-dds-primary">skillInvoked</code>, <code className="text-dds-primary">confidence</code>, and <code className="text-dds-primary">knowledgeObjectsUsed</code> for full transparency</Li>
              <Li>Structured <strong className="text-dds-white">CopilotRecommendations</strong> are rendered as actionable cards in the UI</Li>
            </ul>

            <H3>Security</H3>
            <P>Secrets, tokens, and credentials are <strong className="text-dds-white">aggressively redacted</strong> before any prompt is constructed. No sensitive data leaves your platform. The AI provider (Gemini 2.5 Flash) is swappable via a <code className="text-dds-primary">BaseProvider</code> interface.</P>
            <Note type="tip">Ask the Copilot about failed builds or unhealthy containers — it pulls in the exact failure intelligence and health data to give specific, actionable advice rather than generic DevOps guidance.</Note>

            {/* ─── AUTOPILOT ─── */}
            <H2 id="autopilot">Autonomous Operations (Autopilot)</H2>
            <P>Autopilot separates <strong className="text-dds-white">Decision</strong> from <strong className="text-dds-white">Execution</strong>. Three domain-specific engines produce pure Decision objects, which are then applied by the Execution Layer with cooldown guards to prevent flapping.</P>

            <H3>Engines</H3>
            <Table
              headers={['Engine', 'Responsibility', 'Strategy']}
              rows={[
                ['ScalingEngine',  'Adjusts replica count based on metrics', 'TargetTracking with min/max bounds'],
                ['TrafficEngine',  'Manages traffic splits and routing',    'Canary, Blue/Green, A/B splits'],
                ['HealingEngine',  'Detects and recovers from failures',    'Auto-restart with cooldown guards'],
              ]}
            />

            <H3>Decision Pipeline</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Observe</strong> — metrics are collected from the Platform Event Bus every 15 seconds via PlatformScheduler</Li>
              <Li><strong className="text-dds-white">Decide</strong> — each engine evaluates its metrics and produces a typed Decision object</Li>
              <Li><strong className="text-dds-white">Execute</strong> — the Execution Layer applies the decision with hysteresis and cooldown windows</Li>
              <Li><strong className="text-dds-white">Explain</strong> — every autonomous action emits an <code className="text-dds-primary">ExplainabilityRecord</code> and domain event</Li>
            </ul>

            <H3>Dashboard View</H3>
            <P>The <strong className="text-dds-white">Autopilot Page</strong> shows the full pipeline: Observed Metrics → Decision → Execution — with a timeline of every autonomous action taken, the engine that triggered it, and the explainability record.</P>
            <Note type="tip">Start with conservative scaling bounds (e.g. min=1, max=3) and widen as you gain confidence in your metrics and traffic patterns.</Note>
            <Note type="warn">Autopilot decisions are applied automatically. Review the explainability timeline regularly to ensure the engines are making sensible decisions for your workload.</Note>

            {/* ─── BACKUPS & RESILIENCE ─── */}
            <H2 id="backups">Backups & Platform Resilience</H2>
            <P>DevOpsEase produces self-describing <strong className="text-dds-white">BackupManifests</strong> that track platform version, schema version, checksum, and per-collection document counts. Restore operations are staged to prevent blind mutations.</P>

            <H3>Backup Manifest</H3>
            <Table
              headers={['Field', 'Purpose']}
              rows={[
                ['platformVersion',     'The DevOpsEase version that created the backup'],
                ['schemaVersion',       'Database schema version — compatibility check on restore'],
                ['checksum',            'SHA-256 of the backup payload — verified before and after restore'],
                ['collectionMetadata',  'Per-collection document counts — integrity validation'],
              ]}
            />

            <H3>Retention Tiers</H3>
            <Table
              headers={['Tier', 'Schedule', 'Retention']}
              rows={[
                ['Daily',   'Automated via PlatformScheduler', '7 days'],
                ['Weekly',  'Automated — keeps most recent Sunday backup', '4 weeks'],
                ['Monthly', 'Automated — keeps first-of-month backup', '6 months'],
                ['Pinned',  'Manual — never auto-deleted', 'Indefinite'],
              ]}
            />

            <H3>Staged Restore</H3>
            <P>Restore follows a 4-step pipeline to ensure safety:</P>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">Plan</strong> — select a backup manifest, review collection counts and schema compatibility</Li>
              <Li><strong className="text-dds-white">Pre-backup</strong> — the current database state is backed up automatically before any mutation</Li>
              <Li><strong className="text-dds-white">Execute</strong> — collections are restored from the selected manifest</Li>
              <Li><strong className="text-dds-white">Verify</strong> — checksum is re-verified after execution; document counts are compared</Li>
            </ul>
            <P>During restore, <strong className="text-dds-white">maintenance mode</strong> is activated — the PlatformScheduler pauses all automated tasks to prevent interference.</P>
            <Note type="tip">Pin important backups (e.g. before major migrations) to prevent automatic retention cleanup from deleting them.</Note>
            <Note type="warn">Restoring a backup overwrites the current database state. The pre-backup step provides a safety net, but always verify your backup manifest before proceeding.</Note>

            {/* ─── PUBLIC API & SDK ─── */}
            <H2 id="api">Public API & SDK</H2>
            <P>The entire DevOpsEase public API is defined by an <strong className="text-dds-white">OpenAPI 3.0 specification</strong>. Internal models are mapped to stable DTOs, ensuring long-term backward compatibility with mechanical SDK generation.</P>

            <H3>API Design</H3>
            <ul className="mb-4">
              <Li><strong className="text-dds-white">OpenAPI 3.0</strong> — single source of truth for all API contracts</Li>
              <Li><strong className="text-dds-white">Stable DTOs</strong> — internal models are never leaked to API consumers; responses are always mapped through dedicated DTO types</Li>
              <Li><strong className="text-dds-white">Versioned</strong> — breaking changes are managed through API versioning</Li>
            </ul>

            <H3>Authentication</H3>
            <Table
              headers={['Method', 'Use Case', 'Header']}
              rows={[
                ['JWT Cookie',              'Dashboard and browser sessions',    'Automatic (HttpOnly cookie)'],
                ['Personal Access Token',   'CLI and external integrations',     'Authorization: Bearer <PAT>'],
                ['Extension API Key',       'Third-party platform extensions',   'X-API-Key: <key>'],
              ]}
            />
            <P>All three methods are unified through the <code className="text-dds-primary">platformAuth</code> middleware — every endpoint accepts any valid credential type.</P>

            <H3>SDK Generation</H3>
            <P>Client SDKs can be mechanically generated from the OpenAPI spec for multiple languages:</P>
            <ul className="mb-4">
              <Li>TypeScript / JavaScript</Li>
              <Li>Python</Li>
              <Li>Go</Li>
              <Li>Java</Li>
            </ul>

            <H3>Rate Limiting</H3>
            <P>All API endpoints are protected by the same <strong className="text-dds-white">Redis-backed rate limiter</strong> used across the platform — plan-tiered limits, fail-closed on Redis outage.</P>
            <Note type="tip">Use Personal Access Tokens for CI/CD integrations and scripts — they are revocable, auditable, and don't share the session lifecycle of your browser login.</Note>
            <Note type="warn">API rate limits are enforced per-user across all credential types. Exceeding the limit returns <code className="text-dds-primary">429 Too Many Requests</code> with a <code className="text-dds-primary">Retry-After</code> header.</Note>

            {/* ── footer ── */}
            <div className="mt-20 pt-8 border-t border-dds-border flex items-center justify-between text-sm text-dds-text-muted">
              <span>DevOpsEase Docs — updated July 2026</span>
              <Link to="/developers" className="text-dds-primary hover:text-dds-white transition-colors flex items-center gap-1">
                Developers Hub <ExternalLink size={12} />
              </Link>
            </div>

          </motion.main>
        </div>
      </div>
    </LandingLayout>
  );
};
