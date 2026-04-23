import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingLayout } from '../components/LandingLayout';
import { Copy, Check, Github, MessageSquare, BookOpen, Zap, Users, Star, GitPullRequest, Bug } from 'lucide-react';

type Tab = 'setup' | 'blog' | 'changelog' | 'community';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

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

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-bold text-white mt-10 mb-3 flex items-center gap-3">
    <span className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-400 to-indigo-400 flex-shrink-0" />
    {children}
  </h2>
);
const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => <h3 className="text-base font-semibold text-white mt-5 mb-2">{children}</h3>;
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-gray-400 leading-relaxed mb-3 text-sm">{children}</p>;
const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-gray-400 text-sm mb-1.5">
    <span className="text-purple-400 mt-0.5 flex-shrink-0">▸</span>{children}
  </li>
);
const Table: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto my-4 rounded-xl border border-gray-800">
    <table className="w-full text-sm">
      <thead className="bg-gray-900/60 border-b border-gray-800">
        <tr>{headers.map(h => <th key={h} className="px-4 py-2.5 text-left text-gray-400 font-semibold text-xs">{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="px-4 py-2.5 text-gray-300 text-xs font-mono">{r[0]}</td>{r.slice(1).map((c, j) => <td key={j} className="px-4 py-2.5 text-gray-400 text-xs">{c}</td>)}</tr>)}</tbody>
    </table>
  </div>
);

/* ── Setup Tab ─────────────────────────────── */
const SetupTab: React.FC = () => (
  <div>
    <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 mb-8">
      <p className="text-purple-300 font-semibold mb-1">🛠️ Self-Hosted Setup</p>
      <p className="text-gray-400 text-sm">These guides are for developers who want to run DevOpsEase on their own infrastructure or contribute to the open-source project.</p>
    </div>

    <H2>Prerequisites</H2>
    <Table
      headers={['Requirement', 'Version', 'Purpose']}
      rows={[
        ['Docker Engine', 'v24+', 'Container runtime — must be running and accessible'],
        ['Node.js', 'v20+', 'Runs the backend API server and CLI'],
        ['MongoDB', 'v6+', 'Stores users, builds, pipelines, secrets'],
        ['Redis', 'v7 (optional)', 'Caching, real-time metrics, history persistence'],
        ['Git', 'any', 'Repository cloning and webhook integration'],
      ]}
    />
    <Note type="warn">On Windows, Docker Desktop with WSL2 is required.</Note>

    <H2>Installation</H2>
    <CodeBlock lang="bash" code={`git clone https://github.com/mamun0193/devopsease.git
cd devopsease
npm install`} />
    <H3>Start Development Mode</H3>
    <CodeBlock lang="bash" code={`# Start everything together
npm run dev

# Or separately:
# Terminal 1 — Backend API (port 3497)
cd server && npm run dev

# Terminal 2 — Frontend Dashboard (port 5173)
cd dashboard && npm run dev`} />
    <P>Dashboard: <code className="text-indigo-300">http://localhost:5173</code> — API: <code className="text-indigo-300">http://localhost:3497</code></P>
    <Note type="tip">Quick deps: <code className="text-indigo-300">docker run -d -p 27017:27017 mongo</code> and <code className="text-indigo-300">docker run -d -p 6379:6379 redis:7-alpine</code></Note>

    <H2>Environment Configuration</H2>
    <P>Create a <code className="text-indigo-300">.env</code> file inside the <code className="text-indigo-300">server/</code> directory:</P>
    <CodeBlock lang="env" code={`PORT=3497
MONGO_URI=mongodb://localhost:27017/devopsease

# Auth — use a long random string
JWT_SECRET=your_very_long_random_secret_key

# Encryption — exactly 64 hex chars
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_hex_char_key

# OAuth (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Pre-seed admin account
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your_strong_password

# Public Tunnels (optional)
NGROK_AUTH_TOKEN=your_ngrok_token
TUNNEL_PROVIDER=ngrok`} />
    <Table
      headers={['Variable', 'Required', 'Notes']}
      rows={[
        ['MONGO_URI', '✅ Yes', 'MongoDB connection string'],
        ['JWT_SECRET', '✅ Yes', 'Signs access tokens — use a long random string'],
        ['ENCRYPTION_KEY', '✅ Yes', 'Must be exactly 64 hex chars — AES-256-GCM'],
        ['GITHUB / GOOGLE OAuth', '❌ Optional', 'Enables OAuth login buttons'],
        ['ADMIN_EMAIL/PASSWORD', '❌ Optional', 'Auto-creates admin on first boot'],
        ['NGROK_AUTH_TOKEN', '❌ Optional', 'Required only for Public Tunnels feature'],
      ]}
    />
    <Note type="warn">Never change or lose your <code className="text-indigo-300">ENCRYPTION_KEY</code> after first run. All secrets, Docker Hub credentials, and Kubernetes kubeconfigs are encrypted with it. Changing it makes all encrypted data unreadable.</Note>

    <H2>Project Structure</H2>
    <CodeBlock lang="text" code={`devopsease/
├── server/          # Node.js + Express backend (port 3497)
│   ├── src/
│   │   ├── models/       # Mongoose models
│   │   ├── services/     # Business logic
│   │   ├── controllers/  # Route handlers
│   │   ├── routes/       # Express routers
│   │   ├── middlewares/  # Auth, rate limiting, RBAC
│   │   ├── websocket/    # WS handlers (exec, builds, alerts, metrics)
│   │   ├── intelligence/ # Failure classification engine
│   │   └── docker/       # Docker Engine API wrappers
│   └── sandbox/     # Verification scripts
│
├── dashboard/       # React + TypeScript frontend (port 5173)
│   └── src/
│       ├── pages/        # Route-level page components
│       ├── components/   # Shared UI components
│       ├── hooks/        # React Query hooks + WebSocket hooks
│       ├── store/        # Redux slices (auth, toasts, alerts)
│       ├── api/          # Typed API client
│       └── context/      # AuthContext, RoleContext
│
├── cli/             # devopsease-cli (dse binary, 25 modules)
└── docs/            # Daily progress logs (Day 1–88)`} />

    <H2>Contributing</H2>
    <ul className="mb-4">
      <Li>Fork the repo and create a feature branch: <code className="text-indigo-300">git checkout -b feat/my-feature</code></Li>
      <Li>Follow the existing code style — TypeScript strict mode on the frontend, ES2022 modules on the backend</Li>
      <Li>Add docs entries to <code className="text-indigo-300">docs/</code> for any significant feature work</Li>
      <Li>Open a PR against <code className="text-indigo-300">main</code> — include what changed and why</Li>
      <Li>For bugs, open a GitHub Issue with reproduction steps before submitting a fix</Li>
    </ul>
    <Note type="info">The <code className="text-indigo-300">docs/</code> folder contains 88 daily progress logs documenting the full build history of every feature. Reading relevant day files is the fastest way to understand any subsystem.</Note>
  </div>
);

/* ── Blog Tab ─────────────────────────────── */
const BlogTab: React.FC = () => (
  <div className="text-center py-28">
    <div className="text-6xl mb-5">✍️</div>
    <h2 className="text-2xl font-bold text-white mb-3">Blog Coming Soon</h2>
    <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">Engineering posts, deep dives, architecture decisions, and tutorials are on the way. Check back soon.</p>
  </div>
);

/* ── Changelog Tab ─────────────────────────── */
const ChangelogTab: React.FC = () => (
  <div className="text-center py-28">
    <div className="text-6xl mb-5">📋</div>
    <h2 className="text-2xl font-bold text-white mb-3">Changelog Coming Soon</h2>
    <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">Version history, release notes, and what's new in each update will be published here.</p>
  </div>
);


/* ── Community Tab ─────────────────────────── */


const CommunityTab: React.FC = () => (
  <div>
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-2">Community</h2>
      <p className="text-gray-400 text-sm">Join the DevOpsEase developer community — discuss ideas, report bugs, request features, and contribute code.</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
      {[
        { icon: Github, title: 'GitHub', desc: 'Source code, issues, pull requests, and releases. This is the primary hub for all development activity.', link: 'https://github.com/mamun0193/devopsease', label: 'View on GitHub', color: 'border-gray-700 hover:border-gray-500' },
        { icon: MessageSquare, title: 'GitHub Discussions', desc: 'Ask questions, share ideas, discuss architecture decisions, and get help from the community.', link: 'https://github.com/mamun0193/devopsease/discussions', label: 'Join Discussions', color: 'border-indigo-800 hover:border-indigo-500' },
        { icon: Bug, title: 'Bug Reports', desc: 'Found something broken? Open a GitHub Issue with reproduction steps. Include your OS, Docker version, and logs.', link: 'https://github.com/mamun0193/devopsease/issues', label: 'Report a Bug', color: 'border-red-900 hover:border-red-600' },
        { icon: GitPullRequest, title: 'Contribute', desc: 'PRs are welcome for bug fixes, new features, documentation improvements, and test coverage expansions.', link: 'https://github.com/mamun0193/devopsease/pulls', label: 'Open a PR', color: 'border-emerald-900 hover:border-emerald-600' },
      ].map(({ icon: Icon, title, desc, link, label, color }) => (
        <a key={title} href={link} target="_blank" rel="noreferrer"
          className={`p-5 rounded-xl border bg-gray-900/40 transition-all group flex flex-col gap-3 ${color}`}>
          <div className="flex items-center gap-3">
            <Icon size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            <span className="text-white font-semibold">{title}</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
          <span className="text-indigo-400 text-xs font-medium group-hover:text-indigo-300 transition-colors mt-auto">{label} →</span>
        </a>
      ))}
    </div>

    <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/30 mb-6">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Star size={16} className="text-amber-400" /> Show Support</h3>
      <p className="text-gray-400 text-sm mb-3">If DevOpsEase has been useful, a GitHub ⭐ star helps the project grow and reach more developers.</p>
      <a href="https://github.com/mamun0193/devopsease" target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm hover:bg-amber-500/20 transition-colors">
        <Star size={14} /> Star on GitHub
      </a>
    </div>

    <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/30">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Users size={16} className="text-indigo-400" /> Good First Issues</h3>
      <p className="text-gray-400 text-sm mb-4">New to the codebase? Look for issues labeled <code className="text-indigo-300">good-first-issue</code> on GitHub — they're scoped, well-described, and a great way to get started contributing.</p>
      <div className="space-y-2">
        {[
          'Add unit tests for the failure intelligence classifier',
          'Improve mobile responsiveness of the ResourceNav bar',
          'Add ECR / GCR support to the Registry page',
          'Write E2E tests for the container lifecycle flow',
          'Add a dark/light theme toggle to the dashboard',
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">idea</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Page ─────────────────────────────────── */
export const DevelopersPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('setup');

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'setup',     label: 'Self-Hosted Setup', icon: BookOpen },
    { key: 'blog',      label: 'Blog',              icon: Zap },
    { key: 'changelog', label: 'Changelog',         icon: Star },
    { key: 'community', label: 'Community',         icon: Users },
  ];

  return (
    <LandingLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Hero */}
        <motion.div
          className="text-center mb-12"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-4">
            🛠️ Developers Hub
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            DevOpsEase for Developers
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 max-w-2xl mx-auto">
            Self-host DevOpsEase on your own infrastructure, contribute to the open-source project, follow engineering deep dives, and connect with the community.
          </motion.p>
        </motion.div>

        {/* Tab Bar */}
        <motion.div
          className="flex overflow-x-auto gap-1 p-1 bg-gray-900 border border-gray-800 rounded-xl mb-10"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                tab === key
                  ? 'bg-gradient-to-r from-purple-600/80 to-indigo-600/80 text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }}
          >
            {tab === 'setup'     && <SetupTab />}
            {tab === 'blog'      && <BlogTab />}
            {tab === 'changelog' && <ChangelogTab />}
            {tab === 'community' && <CommunityTab />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
          <span>DevOpsEase Developers Hub — April 2026</span>
          <a href="https://github.com/mamun0193/devopsease" target="_blank" rel="noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">GitHub →</a>
        </div>
      </div>
    </LandingLayout>
  );
};

export default DevelopersPage;
