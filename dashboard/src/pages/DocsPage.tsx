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
