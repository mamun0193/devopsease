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
    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/60">
        <span className="text-xs text-gray-500 font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed"><code className="text-indigo-300 font-mono">{code}</code></pre>
    </div>
  );
};

const Note: React.FC<{ type?: 'info' | 'warn' | 'tip'; children: React.ReactNode }> = ({ type = 'info', children }) => {
  const styles = { info: 'border-blue-500/40 bg-blue-500/5 text-blue-200', warn: 'border-amber-500/40 bg-amber-500/5 text-amber-200', tip: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-200' };
  const labels = { info: '📘 Note', warn: '⚠️ Warning', tip: '✅ Tip' };
  return <div className={`my-4 p-4 rounded-xl border text-sm leading-relaxed ${styles[type]}`}><strong className="block mb-1">{labels[type]}</strong>{children}</div>;
};

const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="text-2xl font-bold text-white mt-14 mb-4 scroll-mt-28 flex items-center gap-3">
    <span className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-400 to-cyan-400 flex-shrink-0" />
    {children}
  </h2>
);
const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 className="text-base font-semibold text-white mt-6 mb-2">{children}</h3>;
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-gray-400 leading-relaxed mb-3 text-sm">{children}</p>;
const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-gray-400 text-sm mb-1.5">
    <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>{children}
  </li>
);
const Table: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto my-4 rounded-xl border border-gray-800">
    <table className="w-full text-sm">
      <thead className="bg-gray-900/60 border-b border-gray-800">
        <tr>{headers.map(h => <th key={h} className="px-4 py-2.5 text-left text-gray-400 font-semibold text-xs">{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">{r.map((c, j) => <td key={j} className="px-4 py-2.5 text-gray-300 text-xs">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

/* ── page ─────────────────────────────────── */
export const DocsPage: React.FC = () => {
  const [active, setActive] = useState('introduction');

  const onScroll = useCallback(() => {
    const sections = document.querySelectorAll('section[id]');
    let current = 'introduction';
    sections.forEach(s => { if ((s as HTMLElement).offsetTop - 140 <= window.scrollY) current = s.id; });
    setActive(current);
  }, []);

  useEffect(() => { window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, [onScroll]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  return (
    <LandingLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-10">

          {/* ── Sidebar ── */}
          <motion.aside
            className="hidden lg:block w-64 flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <p className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-4">Platform Docs</p>
              <div className="space-y-5">
                {NAV_GROUPS.map(g => (
                  <div key={g.group}>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">{g.group}</p>
                    <ul className="space-y-0.5">
                      {g.items.map(item => (
                        <li key={item.id}>
                          <button onClick={() => scrollTo(item.id)}
                            className={`w-full text-left text-sm py-1 pl-3 rounded-lg border-l-2 transition-all ${active === item.id ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 font-medium' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'}`}>
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {/* Developer callout */}
              <div className="mt-6 p-3 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <p className="text-purple-300 text-xs font-semibold mb-1">🛠️ Self-Hosting?</p>
                <p className="text-gray-500 text-xs mb-2">Setup guides, contribution docs, blog & community.</p>
                <Link to="/developers" className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium">
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
                className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
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
                  <motion.div key={f.title} variants={fadeUp} className="p-4 rounded-xl border border-gray-800 bg-gray-900/40 hover:border-indigo-500/40 transition-colors">
                    <div className="text-2xl mb-2">{f.icon}</div>
                    <div className="font-semibold text-white text-sm mb-1">{f.title}</div>
                    <div className="text-gray-400 text-xs leading-relaxed">{f.desc}</div>
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
                <div key={m.name} className="p-4 rounded-xl border border-gray-800 bg-gray-900/30">
                  <div className="text-xl mb-1">{m.icon}</div>
                  <div className="text-white font-semibold text-sm mb-1">{m.name}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{m.desc}</div>
                </div>
              ))}
            </div>
            <H3>Session Security</H3>
            <ul className="mb-4">
              <Li><strong className="text-white">Access token</strong> — short-lived JWT (30 min), auto-refreshed silently in the background</Li>
              <Li><strong className="text-white">Refresh token</strong> — 7-day session, rotated on every use. Replay attacks kill the entire session immediately.</Li>
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
            <P>The <strong className="text-white">Home</strong> dashboard is your mission control — a real-time view of every resource in your DevOpsEase account. Each card shows live counts and status breakdowns.</P>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              {['🐳 Containers','🔨 Builds','🚀 Deployments','☸️ Clusters','📦 Pods','🖼️ Images','📁 Repositories','🗂️ Projects','🌐 Networks','💾 Volumes'].map(r => (
                <div key={r} className="flex items-center gap-2 p-3 rounded-lg border border-gray-800 bg-gray-900/30 text-gray-300 text-sm">{r}</div>
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
              <Li><strong className="text-white">Left</strong> — DevOpsEase logo</Li>
              <Li><strong className="text-white">Center</strong> — real-time deployment status pill</Li>
              <Li><strong className="text-white">Right</strong> — alert bell (with unresolved count badge) + user avatar dropdown</Li>
            </ul>
            <H3>ResourceNav Bar</H3>
            <P>The sticky tab bar below the header is present on every dashboard page:</P>
            <CodeBlock lang="text" code={`← Back to Site | Home  Containers  Builds  Images  Deployments
                   Repositories  Clusters  Pods  Pipelines
                   Projects  Networks  Volumes  Registry  Docs`} />
            <ul className="mb-4">
              <Li>The <strong className="text-white">← Back to Site</strong> button (blue-purple gradient) returns you to the public landing page</Li>
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
              <Li><strong className="text-white">Real-time</strong> — delivered via WebSocket with auto-reconnect</Li>
              <Li><strong className="text-white">Deduplication</strong> — same type on same container suppressed within 5 minutes</Li>
              <Li><strong className="text-white">Auto-cleanup</strong> — resolved alerts deleted after 7 days</Li>
              <Li><strong className="text-white">Bell badge</strong> — shows unresolved count (capped at 99+); click to open slide-out panel</Li>
              <Li><strong className="text-white">Toasts</strong> — CRITICAL → red, WARNING → amber, INFO → blue</Li>
            </ul>
            <Note type="tip">Visit the <strong>Alerts</strong> page for full history with severity filters (CRITICAL / WARNING / INFO), resolved/unresolved toggle, and pagination.</Note>

            {/* ─── 9. CONTAINERS ─── */}
            <H2 id="containers-intro">Managing Containers</H2>
            <P>The <strong className="text-white">Containers</strong> page lists every Docker container on your account — running, stopped, paused, and exited. Each card shows the container name, image, status, and real-time CPU/memory usage.</P>
            <ul className="mb-4">
              <Li>Filter by status: <strong className="text-white">All</strong>, <strong className="text-white">Running</strong>, <strong className="text-white">Stopped</strong>, <strong className="text-white">Paused</strong></Li>
              <Li>Click any container card to open its detail view with Logs, Stats, Exec, Health, and Intelligence tabs</Li>
              <Li><strong className="text-white">Create Container</strong> — modal with image selector, ports, env vars, restart policy, and resource limits</Li>
              <Li><strong className="text-white">Remove All</strong> — force-removes every container you own (with confirmation)</Li>
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
              <Li>Every action is written to the <strong className="text-white">Action History</strong> timeline in the container detail view</Li>
              <Li>Any active exec session is automatically terminated when a container is stopped, restarted, or removed</Li>
              <Li>The UI polls until Docker confirms the state transition — no stale "Running" states after a stop command</Li>
            </ul>
            <Note type="warn">Remove is permanent. The container's writable layer is deleted. Always use named volumes for persistent data.</Note>

            {/* ─── 11. LOGS ─── */}
            <H2 id="container-logs">Logs & Monitoring</H2>
            <P>Open any container → <strong className="text-white">Logs</strong> tab. DevOpsEase streams and parses stdout/stderr with structured intelligence:</P>
            <ul className="mb-4">
              <Li><strong className="text-white">Log level detection</strong> — lines auto-classified as INFO, WARN, ERROR, DEBUG with colour coding</Li>
              <Li><strong className="text-white">Timestamps</strong> — toggle Docker timestamps on/off</Li>
              <Li><strong className="text-white">Live streaming</strong> — auto-scrolls as the container produces output</Li>
              <Li><strong className="text-white">Search/filter</strong> — filter lines by keyword instantly</Li>
              <Li><strong className="text-white">Log stats</strong> — total lines, error count, warn count</Li>
              <Li><strong className="text-white">Download</strong> — export the current buffer as a <code className="text-indigo-300">.txt</code> file</Li>
            </ul>
            <P>The <strong className="text-white">Stats</strong> tab shows real-time CPU % and Memory MB streamed via WebSocket, with live animated graphs and usage shown as <code className="text-indigo-300">used / limit</code>.</P>

            {/* ─── 12. EXEC ─── */}
            <H2 id="container-exec">Exec Terminal</H2>
            <P>Open any running container → <strong className="text-white">Exec</strong> tab. A full interactive terminal runs in your browser via WebSocket and XTerm.js — no SSH or local Docker CLI needed.</P>
            <CodeBlock lang="bash" code={`# What runs behind the scenes:
docker exec -it <container-id> /bin/bash
# Falls back to /bin/sh if bash is unavailable`} />
            <ul className="mb-4">
              <Li>Fully interactive — arrow keys, tab completion, Ctrl+C, auto window resize</Li>
              <Li>Idle timeout: sessions auto-terminate after <strong className="text-white">5 minutes</strong> of inactivity</Li>
              <Li>Countdown badge turns amber (&lt;60s) then red (&lt;30s) before timeout</Li>
              <Li>Click <strong className="text-white">⏻ Terminate</strong> in the terminal header to end the session manually</Li>
              <Li>Reconnect overlay appears after any termination — start a fresh session in one click</Li>
            </ul>

            {/* ─── 13. HEALTH ─── */}
            <H2 id="container-health">Health & Auto-Recovery</H2>
            <P>DevOpsEase monitors containers <strong className="text-white">event-by-event</strong> using Docker's event stream. When Docker fires an <code className="text-indigo-300">oom</code>, <code className="text-indigo-300">health_status</code>, or <code className="text-indigo-300">restart</code> event, the platform instantly classifies the health state.</P>
            <Table
              headers={['State', 'Meaning', 'Color']}
              rows={[
                ['HEALTHY',   'Running normally, no issues detected',                        '🟢 Green'],
                ['DEGRADED',  'Instability detected — watch closely',                        '🟡 Amber'],
                ['UNHEALTHY', 'Active problem — OOM, crash loop, or HEALTHCHECK failed',     '🔴 Red'],
              ]}
            />
            <P>When a <code className="text-indigo-300">CRASH_LOOP</code> is detected and the container has a restart policy (<code className="text-indigo-300">always</code>, <code className="text-indigo-300">unless-stopped</code>, or <code className="text-indigo-300">on-failure</code>), DevOpsEase automatically attempts recovery — with a <strong className="text-white">5-minute cooldown</strong> to prevent restart storms. Health history keeps the last 20 state changes for 30 days.</P>
            <Note type="tip">Set restart policy to <strong>On Failure</strong> with max retries 3 when creating containers for production workloads.</Note>

            {/* ─── 14. FAILURE INTELLIGENCE ─── */}
            <H2 id="failure-intelligence">Failure Intelligence</H2>
            <P>The Failure Intelligence engine turns raw Docker signals (exit codes, log patterns, restart counts) into <strong className="text-white">human-readable diagnoses</strong>. Open any container → <strong className="text-white">Intelligence</strong> card — it updates automatically on every state change.</P>
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
            <Table
              headers={['Plan', 'Max Containers', 'Exec Rate', 'Storage']}
              rows={[
                ['Free',    '1',  '10/min',  '5 GB'],
                ['Pro',     '5',  '60/min',  '5 GB'],
                ['Premium', '20', '300/min', '5 GB'],
              ]}
            />
            <ul className="mb-4">
              <Li>Quota is based on <strong className="text-white">actual runtime usage</strong> (measured every 10s from Docker stats), not reserved limits</Li>
              <Li>The live quota panel on the dashboard shows containers, CPU, and memory as progress bars</Li>
              <Li>Container creation is blocked at the plan limit with a clear error message</Li>
              <Li>Exec rate limiting is <strong className="text-white">fail-closed</strong> — if the backing store is down, exec is blocked rather than open</Li>
            </ul>
            <Note type="warn">Storage quota accumulates from built image sizes. Delete unused images from the Images page to reclaim space.</Note>

            {/* ─── 16. TUNNELS ─── */}
            <H2 id="tunnels">Public Tunnels</H2>
            <P>Expose a running container's port to the internet via a <strong className="text-white">temporary HTTPS URL</strong> — ideal for sharing previews, demos, or testing webhooks without deploying to production.</P>
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
              <Li>Tunnels <strong className="text-white">auto-revoke</strong> on expiry — no cleanup needed</Li>
              <Li>Manually close any tunnel at any time from the Tunnels dashboard</Li>
            </ul>
            <Note type="warn">Tunnel URLs are publicly accessible. Never expose databases or internal APIs without application-level authentication.</Note>

            {/* ─── 17. IMAGE BUILD ENGINE ─── */}
            <H2 id="builds-intro">Image Build Engine</H2>
            <P>DevOpsEase has a built-in Docker image build engine — write a Dockerfile directly in the browser, hit <strong className="text-white">Build Image</strong>, and watch the output stream live. No local Docker CLI, no CI runner needed.</P>
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
              <Li><strong className="text-white">WebSocket streaming</strong> — every build log line appears in real time with line numbers</Li>
              <Li><strong className="text-white">Colour-coded lines</strong> — ERROR/FATAL lines highlighted red, WARN lines amber</Li>
              <Li><strong className="text-white">Connection indicator</strong> — Live (green) / Reconnecting (amber) / Connecting (grey)</Li>
              <Li><strong className="text-white">Auto-scroll</strong> — log viewer follows output as lines arrive</Li>
              <Li>On completion the viewer switches to showing the persisted <code className="text-indigo-300">logSummary</code> from the database</Li>
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
            <P>The <strong className="text-white">Resource Quota</strong> bar at the top of the Builds page shows your live infrastructure usage — containers, CPU cores, and memory — updated every 20 seconds. Builds run inside the same quota envelope as containers.</P>
            <ul className="mb-4">
              <Li>Container creation is blocked when the container quota is at 100%</Li>
              <Li>CPU and memory bars turn amber at 75%, red at 90% — a visual warning before builds start competing for resources</Li>
              <Li>Total build count is shown in the top-right of the quota bar for quick reference</Li>
            </ul>
            <Note type="tip">Keep Dockerfiles minimal — start with a small base image (<code className="text-emerald-300">alpine</code>, <code className="text-emerald-300">node:alpine</code>, <code className="text-emerald-300">python:slim</code>) to reduce build time and image size.</Note>
            <Note type="warn">The 15-minute build timeout is a hard limit. Multi-stage builds and large dependency installs may need to be split or pre-cached in the base image.</Note>

            {/* ─── 18. BUILD INTELLIGENCE ─── */}
            <H2 id="build-intel">Build Intelligence</H2>
            <P>When a build fails, DevOpsEase automatically analyses the captured log output and classifies the failure into one of <strong className="text-white">7 failure types</strong> — no manual log-grepping needed. The result appears as a <strong className="text-white">Failure Intelligence</strong> panel directly on the Build Detail page.</P>

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
            <P>Every classification comes with a <strong className="text-white">confidence percentage</strong> (0–100%) derived from how many log signals matched the expected pattern for that failure type:</P>
            <ul className="mb-4">
              <Li><strong className="text-white">≥ 90%</strong> — displayed in <span className="text-emerald-400">green</span>; pattern match is unambiguous</Li>
              <Li><strong className="text-white">60–89%</strong> — displayed in <span className="text-yellow-400">amber</span>; likely correct but some signals were absent</Li>
              <Li><strong className="text-white">&lt; 60%</strong> — displayed in <span className="text-slate-400">grey</span>; low evidence, treat as a hint not a diagnosis</Li>
            </ul>

            <H3>Failing Stage</H3>
            <P>Where available, the panel also shows the <strong className="text-white">Failing Stage</strong> — the exact Dockerfile instruction that caused the build to stop (e.g. <code className="text-indigo-300">RUN npm install</code> or <code className="text-indigo-300">COPY . /app</code>). This is extracted directly from the Docker build log output.</P>

            <H3>Evidence Lines</H3>
            <P>The raw log lines that triggered the classification are shown in a scrollable <strong className="text-white">Evidence</strong> box — so you can verify the diagnosis and trace it back to the exact output.</P>

            <Note type="tip">For <code className="text-emerald-300">BUILD_BASE_IMAGE_MISSING</code> errors — check the image name spelling and confirm it's public on Docker Hub, or connect your Docker Hub account in Registry if it's a private image.</Note>
            <Note type="info">Build Intelligence is purely deterministic — no ML, no external API calls. Classification runs entirely on the backend against the captured <code className="text-blue-300">logSummary</code> using regex pattern sets.</Note>

            {/* ─── 19. IMAGE GOVERNANCE ─── */}
            <H2 id="images">Image Governance</H2>
            <P>The <strong className="text-white">Images</strong> page gives you a full inventory of every Docker image on your account with storage accounting, usage classification, and one-click cleanup — so you're never blindsided by disk space creep.</P>

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
              <Li><strong className="text-white">Total Storage</strong> — combined size of all images on disk</Li>
              <Li><strong className="text-white">Build Cache</strong> — space used by Docker's layer cache from previous builds</Li>
              <Li><strong className="text-white">Active</strong> — count of images currently in use</Li>
              <Li><strong className="text-white">Unused</strong> — count of images with no container reference</Li>
              <Li><strong className="text-white">Dangling</strong> — count of untagged intermediate layers</Li>
            </ul>

            <H3>Safe Clean Storage</H3>
            <P>Click <strong className="text-white">Safe Clean Storage</strong> to open the prune modal. It runs a <strong className="text-white">preview scan first</strong> — showing you exactly which images will be removed and how much space will be reclaimed — before anything is deleted.</P>
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
            <P>The <strong className="text-white">Clean Cache</strong> button clears Docker's build layer cache — separate from image deletion. The modal shows the current cache size before you confirm. This is safe to run at any time; Docker will rebuild layers on the next build as needed.</P>

            <H3>Filtering by Status</H3>
            <P>Use the filter tabs in the header — <strong className="text-white">All / Active / Unused / Dangling</strong> — to focus on exactly the images you want to inspect or clean up. Counts update live.</P>

            <H3>Push to Docker Hub</H3>
            <P>Each row in the image table has a <strong className="text-white">Push</strong> button. This sends the image to your connected Docker Hub account under a repository tag you specify. The button is disabled until Docker Hub is connected — see <button onClick={() => {}} className="underline text-indigo-400">Docker Hub Registry</button> below.</P>

            <Note type="tip">Run <strong>Safe Clean Storage</strong> regularly to keep your storage quota healthy. Dangling images accumulate quickly during active development.</Note>
            <Note type="warn">Deleting an UNUSED image is permanent. If you need the image again you will have to rebuild it or re-pull it from Docker Hub.</Note>

            {/* ─── 20. DOCKER HUB REGISTRY ─── */}
            <H2 id="registry">Docker Hub Registry</H2>
            <P>The <strong className="text-white">Registry</strong> page is your Docker Hub integration hub — connect your account once and unlock pulling public/private images, pushing your built images, and searching Docker Hub directly from the dashboard.</P>

            <H3>Connecting Your Account</H3>
            <P>Enter your Docker Hub <strong className="text-white">username</strong> and <strong className="text-white">password or access token</strong> and click <strong className="text-white">Connect Docker Hub</strong>. Your credentials are encrypted immediately with <strong className="text-white">AES-256-GCM</strong> before being written to the database — the plaintext password is never stored.</P>
            <ul className="mb-4">
              <Li>A <strong className="text-white">violet AES-256-GCM</strong> badge is shown next to the password field as a reminder that credentials are encrypted at rest</Li>
              <Li>Once connected, a green <strong className="text-white">Connected</strong> badge and your Docker Hub username are shown in the card header</Li>
              <Li>Click <strong className="text-white">Disconnect</strong> at any time to wipe the stored credentials — requires confirmation</Li>
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
              <Li>The <strong className="text-white">amber warning banner</strong> on the connect form reminds you of the anonymous limit before you log in</Li>
              <Li>After connecting, a <strong className="text-white">green rate-limit info row</strong> confirms your authenticated allowance</Li>
              <Li>Hitting the pull limit returns a <code className="text-indigo-300">429 Too Many Requests</code> error — wait for the window to reset or connect an account</Li>
            </ul>

            <H3>Pulling Images</H3>
            <P>Use the <strong className="text-white">Pull Image</strong> card to pull any image from Docker Hub directly onto your DevOpsEase host. Type the image name (with optional tag) and hit Pull:</P>
            <CodeBlock lang="bash" code={`nginx:latest
redis:7-alpine
my-org/my-private-image:v2.1`} />
            <ul className="mb-4">
              <Li>Pulled images appear immediately in the <strong className="text-white">Images</strong> page with source tagged as <code className="text-indigo-300">REGISTRY</code></Li>
              <Li>Pull count is tracked per-image — visible on the Image Detail page</Li>
              <Li>Private images require a connected and authenticated Docker Hub account</Li>
            </ul>

            <H3>Searching Docker Hub</H3>
            <P>The <strong className="text-white">Explore Docker Hub</strong> search panel lets you find images without leaving the dashboard. Type at least 2 characters — results appear automatically with a 400ms debounce.</P>
            <ul className="mb-4">
              <Li>Each result shows: image name, description, star count, pull count, and an <strong className="text-white">Official</strong> badge for Docker-verified images</Li>
              <Li>Click <strong className="text-white">Pull</strong> on any result to pull it instantly</Li>
              <Li>The <strong className="text-white">Popular Images</strong> grid (nginx, redis, postgres, mongo, node, python…) is shown when the search is empty — click any tile to pull</Li>
            </ul>

            <H3>Pushing Images</H3>
            <P>From the <strong className="text-white">Images</strong> page, hit <strong className="text-white">Push</strong> on any image row to open the Push modal. Enter the target repository tag (e.g. <code className="text-indigo-300">my-org/my-app:v1.0</code>) and confirm. The push runs server-side and reports the final pushed tag on success.</P>
            <Note type="tip">Use Docker Hub <strong>access tokens</strong> instead of your account password — they are revocable and can be scoped to read-only or read/write as needed.</Note>
            <Note type="warn">Pushing to a repository you don't own will fail with a 403. Make sure the repository name matches your Docker Hub username or organisation namespace.</Note>

            {/* ─── 21. LINKING REPOSITORIES ─── */}
            <H2 id="repositories">Linking Repositories</H2>
            <P>The <strong className="text-white">Repositories</strong> page connects your GitHub repositories to DevOpsEase so that pipeline runs, builds, and deployments can be triggered automatically on every push — no manual CI scripts needed.</P>

            <H3>Connecting GitHub</H3>
            <P>Click <strong className="text-white">Link Repository</strong> and enter the GitHub repository URL. DevOpsEase uses your stored GitHub OAuth token to verify access and register the repository:</P>
            <CodeBlock lang="bash" code={`https://github.com/your-org/my-app
https://github.com/your-username/my-service`} />
            <ul className="mb-4">
              <Li>Both <strong className="text-white">public and private</strong> repositories are supported — private repos require GitHub OAuth login</Li>
              <Li>The repository is cloned with a <strong className="text-white">shallow clone</strong> (<code className="text-indigo-300">--depth 1</code>) on the target branch — fast and bandwidth-efficient</Li>
              <Li>Each linked repo shows its <strong className="text-white">last commit hash, branch, and sync status</strong> in the repository list</Li>
            </ul>

            <H3>Webhook Auto-Setup</H3>
            <P>When you link a repository, DevOpsEase automatically registers a <strong className="text-white">GitHub webhook</strong> pointing to your DevOpsEase instance. No manual webhook configuration in GitHub settings is required.</P>
            <Table
              headers={['Webhook Event', 'What it triggers']}
              rows={[
                ['push',               'Runs the pipeline defined for that branch — build → test → deploy'],
                ['pull_request',       'Not currently used — reserved for future PR checks'],
              ]}
            />
            <ul className="mb-4">
              <Li>Webhook payloads are verified with a <strong className="text-white">HMAC-SHA256 signature</strong> — forged or replayed events are rejected</Li>
              <Li>Only pushes to the <strong className="text-white">tracked branch</strong> (default: <code className="text-indigo-300">main</code>) trigger a pipeline run</Li>
              <Li>The webhook delivery log is visible in your GitHub repo → Settings → Webhooks</Li>
            </ul>

            <H3>Repository List</H3>
            <P>Each linked repository card shows:</P>
            <ul className="mb-4">
              <Li><strong className="text-white">Repo name and URL</strong> — click to open on GitHub</Li>
              <Li><strong className="text-white">Tracked branch</strong> — the branch webhooks listen on</Li>
              <Li><strong className="text-white">Last commit</strong> — short hash of the most recent push received</Li>
              <Li><strong className="text-white">Pipeline status</strong> — last run result (SUCCESS / FAILED / RUNNING) for that repo</Li>
              <Li><strong className="text-white">Unlink</strong> button — removes the repo and deletes the GitHub webhook</Li>
            </ul>
            <Note type="tip">Use a dedicated <strong>GitHub access token</strong> (fine-grained, repo scope only) instead of your personal password when linking private repositories.</Note>
            <Note type="warn">Unlinking a repository removes the webhook from GitHub and stops all future pipeline triggers. Existing pipeline run history is preserved.</Note>

            {/* ─── 22. DEFINING PIPELINES ─── */}
            <H2 id="pipeline-def">Defining Pipelines</H2>
            <P>Pipelines are defined in a <strong className="text-white">YAML file</strong> committed to your repository. DevOpsEase reads and validates the file when you link the repo, and re-parses it on every webhook push.</P>

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

            <H3>Step Types</H3>
            <Table
              headers={['Type', 'What it does', 'Required fields']}
              rows={[
                ['build',  'Builds a Docker image from a Dockerfile in the repo',  'dockerfile, tag'],
                ['test',   'Runs a shell command inside the build context',         'command'],
                ['deploy', 'Deploys the image as a Docker container or K8s workload', 'image, environment'],
              ]}
            />
            <ul className="mb-4">
              <Li><strong className="text-white">name</strong> — pipeline display name shown in the UI</Li>
              <Li><strong className="text-white">version</strong> — pipeline schema version (<code className="text-indigo-300">"1.0"</code> is current)</Li>
              <Li>Steps execute in the <strong className="text-white">order defined</strong> — top to bottom</Li>
              <Li>A failed step <strong className="text-white">stops the pipeline</strong> immediately (fail-fast) — subsequent steps are skipped</Li>
            </ul>
            <Note type="tip">Name your YAML file <code className="text-emerald-300">devopsease.yml</code> and commit it to the root of your repository for automatic detection.</Note>
            <Note type="warn">YAML syntax errors are caught at parse time — the pipeline is rejected with a validation error and no steps are run.</Note>

            {/* ─── 23. PIPELINE EXECUTION ─── */}
            <H2 id="pipeline-exec">Pipeline Execution</H2>
            <P>Every pipeline run is a first-class record — tracked from trigger to completion with live logs, timing, and a full status trail.</P>

            <H3>How a Run Starts</H3>
            <CodeBlock lang="text" code={`GitHub push → webhook → HMAC-SHA256 verified
  ↓
DevOpsEase queues a pipeline run
  ↓
Steps execute sequentially: build → test → deploy
  ↓
Run record saved with status, timing, and log output`} />

            <H3>Live Execution Logs</H3>
            <ul className="mb-4">
              <Li>Each step streams output in <strong className="text-white">real time</strong> via WebSocket — visible on the Pipeline Run detail page</Li>
              <Li>Logs are colour-coded: ERROR (red), WARN (amber), INFO (slate)</Li>
              <Li>On completion logs are <strong className="text-white">persisted to the database</strong> — accessible any time after the run</Li>
            </ul>

            <H3>Execution Behaviour</H3>
            <Table
              headers={['Behaviour', 'Detail']}
              rows={[
                ['Sequential',   'Steps run one at a time — no parallelism within a pipeline'],
                ['Fail-fast',    'Any step failure aborts the run — remaining steps are marked SKIPPED'],
                ['Timeout',      'Individual steps time out after 15 minutes — same limit as image builds'],
                ['Concurrency',  'Only one run per pipeline is active at a time — new pushes queue behind it'],
              ]}
            />
            <Note type="info">Pipeline runs triggered by webhook pushes include the commit hash and branch in the run metadata — visible on the run detail page.</Note>

            {/* ─── 24. DEPLOYMENTS ─── */}
            <H2 id="deployments">Deployments</H2>
            <P>The <strong className="text-white">Deployments</strong> page shows every deployment DevOpsEase has created — from pipeline deploy steps, manual deploys, and Kubernetes rollouts. Each deployment is a live record with status, environment, and linked container or pod.</P>

            <H3>Deployment Status</H3>
            <Table
              headers={['Status', 'Meaning', 'Badge']}
              rows={[
                ['running',   'Container or pod is live and healthy',           '🟢 Green'],
                ['deploying', 'Deploy step is in progress — container starting', '🔵 Blue'],
                ['failed',    'Container exited or pod failed to schedule',      '🔴 Red'],
                ['stopped',   'Deployment was manually stopped',                 '⚫ Grey'],
              ]}
            />

            <H3>Deployment Fields</H3>
            <ul className="mb-4">
              <Li><strong className="text-white">Environment</strong> — <code className="text-indigo-300">dev</code>, <code className="text-indigo-300">staging</code>, or <code className="text-indigo-300">production</code></Li>
              <Li><strong className="text-white">Image tag</strong> — the Docker image used for this deployment</Li>
              <Li><strong className="text-white">Commit hash & branch</strong> — the Git commit that triggered this deploy</Li>
              <Li><strong className="text-white">Container / Pod link</strong> — click to jump to the running container or Kubernetes pod</Li>
            </ul>

            <H3>Actions</H3>
            <ul className="mb-4">
              <Li><strong className="text-white">Stop</strong> — gracefully stops the running container or scales the K8s deployment to 0</Li>
              <Li><strong className="text-white">Remove</strong> — permanently deletes the deployment record and its container</Li>
              <Li><strong className="text-white">Rollback</strong> — see the next section</Li>
            </ul>
            <Note type="tip">Filter the Deployments list by environment (dev / staging / production) to quickly find what's running where.</Note>

            {/* ─── 25. ROLLBACK & HISTORY ─── */}
            <H2 id="rollback">Rollback & History</H2>
            <P>Every deployment is stored permanently — giving you a full audit trail and the ability to roll back to any previous version in one click.</P>

            <H3>How Rollback Works</H3>
            <CodeBlock lang="text" code={`Select a previous deployment → click Rollback
  ↓
DevOpsEase stops the current deployment
  ↓
Re-deploys using the previous deployment's image tag
  ↓
New deployment record created with rollback reason logged`} />
            <ul className="mb-4">
              <Li>Rollback creates a <strong className="text-white">new deployment record</strong> — the history is never mutated</Li>
              <Li>An optional <strong className="text-white">reason</strong> can be provided — stored in the deployment metadata</Li>
              <Li>The rollback target image must still be available locally — if the image was pruned, rollback will fail</Li>
            </ul>

            <H3>Deployment History</H3>
            <ul className="mb-4">
              <Li>All deployments are listed in reverse-chronological order with full metadata</Li>
              <Li>Each entry shows: environment, image tag, commit hash, branch, created time, and final status</Li>
              <Li>Click any deployment to view its <strong className="text-white">log output</strong> from the deploy step</Li>
              <Li>History is never automatically deleted — you control retention</Li>
            </ul>
            <Note type="warn">If a rollback target image has been deleted via <strong>Safe Clean Storage</strong>, the rollback will fail. Tag and preserve images you may need to roll back to before pruning.</Note>

            {/* ─── 26. DOCKER COMPOSE PROJECTS ─── */}
            <H2 id="projects">Docker Compose Projects</H2>
            <P>The <strong className="text-white">Projects</strong> page lets you deploy multi-service applications from a Docker Compose YAML definition — all services, networks, and volumes created and managed as a single unit.</P>

            <H3>Creating a Project</H3>
            <P>Click <strong className="text-white">New Project</strong>, enter a project name and paste your Compose YAML:</P>
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
              <Li><strong className="text-white">YAML validation</strong> — the Compose file is parsed and validated before any containers are created; errors are shown inline</Li>
              <Li>Project <strong className="text-white">namespace</strong> — all containers, networks, and volumes are prefixed with the project name for isolation</Li>
              <Li>Services are started in <strong className="text-white">dependency order</strong> — <code className="text-indigo-300">depends_on</code> is respected</Li>
            </ul>

            <H3>Project Status</H3>
            <Table
              headers={['Status', 'Meaning']}
              rows={[
                ['CREATED',  'Project defined but not yet started'],
                ['RUNNING',  'All services are up and containers are live'],
                ['STOPPED',  'All containers have been stopped — definition preserved'],
                ['FAILED',   'One or more services failed to start'],
              ]}
            />

            <H3>Network Isolation</H3>
            <P>Each project automatically gets a <strong className="text-white">dedicated Docker network</strong> — services within the project can reach each other by service name (e.g. <code className="text-indigo-300">http://api:3000</code>), and are isolated from containers in other projects.</P>

            <H3>Lifecycle Controls</H3>
            <ul className="mb-4">
              <Li><strong className="text-white">Start</strong> — brings all stopped containers back up, recreating any that were removed</Li>
              <Li><strong className="text-white">Stop</strong> — gracefully stops all running containers in the project</Li>
              <Li><strong className="text-white">Delete</strong> — stops and removes all containers, then deletes the project record. Volumes are <em>not</em> deleted automatically</Li>
            </ul>

            <H3>Viewing Services</H3>
            <P>Expand any project card to see all its services — each listed with container name, image, and current status. Click a service to jump to its container detail page for logs, stats, and exec.</P>

            <Note type="tip">Use project namespacing to run multiple environments side by side — e.g. <code className="text-emerald-300">myapp-dev</code> and <code className="text-emerald-300">myapp-staging</code> as separate projects on the same host.</Note>
            <Note type="warn">Deleting a project removes all its containers and the shared network, but <strong>named volumes are preserved</strong>. Clean them up manually from the Volumes page if no longer needed.</Note>

            {/* ─── 27. NETWORKS ─── */}
            <H2 id="networks">Networks</H2>
            <P>The <strong className="text-white">Networks</strong> page lists every Docker network on your account — both user-created and project-managed — with usage status and safe-delete controls.</P>

            <H3>Network Status</H3>
            <Table
              headers={['Status', 'Meaning']}
              rows={[
                ['ACTIVE', 'At least one container is connected to this network'],
                ['UNUSED', 'No containers currently connected — safe to remove'],
              ]}
            />

            <H3>Safe Delete</H3>
            <ul className="mb-4">
              <Li>Removing an <strong className="text-white">UNUSED</strong> network is instant and non-destructive — no containers are affected</Li>
              <Li>Attempting to remove an <strong className="text-white">ACTIVE</strong> network is blocked with a clear error — you must disconnect or stop all containers first</Li>
              <Li>Networks created by a <strong className="text-white">Project</strong> are labelled with the project name — delete them via the Projects page instead</Li>
            </ul>

            <H3>Reconciliation</H3>
            <P>DevOpsEase periodically <strong className="text-white">reconciles</strong> the network list with the Docker daemon — stale records from containers that were removed externally are cleaned up automatically. You can also trigger a manual reconcile from the Networks page.</P>
            <Note type="warn">Default Docker networks (<code className="text-indigo-300">bridge</code>, <code className="text-indigo-300">host</code>, <code className="text-indigo-300">none</code>) are not shown — only user-scoped networks are listed.</Note>

            {/* ─── 28. VOLUMES ─── */}
            <H2 id="volumes">Volumes</H2>
            <P>The <strong className="text-white">Volumes</strong> page manages named Docker volumes — persistent storage that outlives containers. DevOpsEase tracks size, container attachment, and project ownership for every volume.</P>

            <H3>Volume Status</H3>
            <Table
              headers={['Status', 'Meaning']}
              rows={[
                ['ACTIVE',         'Currently mounted by one or more running containers'],
                ['UNUSED',         'Not mounted by any container — safe to delete'],
                ['PENDING_DELETE',  'Marked for deletion — will be removed on next reconcile'],
              ]}
            />

            <H3>Storage Accounting</H3>
            <ul className="mb-4">
              <Li>Each volume card shows its <strong className="text-white">size in MB</strong> and the list of <strong className="text-white">attached container IDs</strong></Li>
              <Li>Only <strong className="text-white">named volumes</strong> are tracked — anonymous volumes (created without a name) are not managed by DevOpsEase</Li>
              <Li>Volumes created by Projects are labelled with the project name</Li>
            </ul>

            <H3>Safe Prune</H3>
            <P>Click <strong className="text-white">Prune Unused Volumes</strong> to open the prune modal. A preview scan runs first — showing you which volumes will be removed and the total space reclaimed — before anything is deleted.</P>
            <CodeBlock lang="text" code={`Preview scan → lists UNUSED volumes with sizes
  ↓
Shows:  4 volumes · 2.1 GB reclaimable
  ↓
Confirm → volumes deleted → list refreshed`} />
            <Note type="tip">Run volume prune after deleting stale projects to reclaim disk space from leftover database and cache volumes.</Note>
            <Note type="warn">Volume deletion is <strong>permanent and irreversible</strong>. Any data stored in the volume — databases, file uploads, caches — is gone. Always back up important data before pruning.</Note>

            {/* ─── 29. SECRETS ─── */}
            <H2 id="secrets">Secrets</H2>
            <P>The <strong className="text-white">Secrets</strong> page is a secure key-value store for sensitive configuration — API keys, database passwords, tokens, and any value you don't want hardcoded in a Dockerfile or Compose file.</P>

            <H3>Encryption</H3>
            <P>Every secret value is encrypted with <strong className="text-white">AES-256-GCM</strong> before being written to the database. The encryption key (<code className="text-indigo-300">ENCRYPTION_KEY</code> in <code className="text-indigo-300">.env</code>) never leaves the server — plaintext values are never stored or logged.</P>
            <ul className="mb-4">
              <Li>Secret <strong className="text-white">values are never returned</strong> by the API after creation — you can only overwrite or delete</Li>
              <Li>Secret <strong className="text-white">names</strong> are visible in the UI — only the value is hidden</Li>
            </ul>

            <H3>Scoping</H3>
            <Table
              headers={['Scope', 'Meaning']}
              rows={[
                ['global',     'Available to all containers and pipelines in your account'],
                ['environment', 'Scoped to a specific environment: dev, staging, or production'],
              ]}
            />

            <H3>Injecting into Containers</H3>
            <P>When creating a container, select secrets from the <strong className="text-white">Secrets</strong> dropdown — DevOpsEase injects them as <strong className="text-white">environment variables</strong> at container start time via Docker's <code className="text-indigo-300">Env</code> HostConfig field:</P>
            <CodeBlock lang="bash" code={`# Equivalent to:
docker run -e MY_SECRET=<decrypted-value> my-image`} />

            <H3>Kubernetes secretKeyRef</H3>
            <P>For Kubernetes deployments, secrets can be referenced as <strong className="text-white">secretKeyRef</strong> in generated YAML manifests — DevOpsEase creates the corresponding <code className="text-indigo-300">Secret</code> object in the target namespace automatically.</P>
            <CodeBlock lang="yaml" code={`env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: devopsease-secrets
        key: DATABASE_PASSWORD`} />
            <Note type="tip">Use <strong>environment-scoped secrets</strong> to keep prod credentials completely separate from dev — a pipeline deploying to production will only see production-scoped secrets.</Note>
            <Note type="warn">Never commit the <code className="text-indigo-300">ENCRYPTION_KEY</code> to version control. If it is compromised or lost, all stored secrets become unreadable.</Note>

            {/* ── footer ── */}
            <div className="mt-20 pt-8 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
              <span>DevOpsEase Docs — updated April 2026</span>
              <Link to="/developers" className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                Developers Hub <ExternalLink size={12} />
              </Link>
            </div>

          </motion.main>
        </div>
      </div>
    </LandingLayout>
  );
};
