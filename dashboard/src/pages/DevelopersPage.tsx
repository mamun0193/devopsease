import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingLayout } from '../components/LandingLayout';
import { Copy, Check, Github, MessageSquare, BookOpen, Zap, Users, Star, GitPullRequest, Bug, Terminal, Wrench, ShieldAlert } from 'lucide-react';

type Tab = 'setup' | 'blog' | 'changelog' | 'community';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = 'bash' }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-dds-border bg-dds-bg">
      <div className="flex items-center justify-between px-4 py-2 border-b border-dds-border bg-dds-elevated/80">
        <span className="text-xs text-dds-text-muted font-mono">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-xs text-dds-text-secondary hover:text-dds-white transition-colors">
          {copied ? <Check size={13} className="text-dds-green" /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed"><code className="text-dds-primary font-mono">{code}</code></pre>
    </div>
  );
};

const Note: React.FC<{ type?: 'info' | 'warn' | 'tip'; children: React.ReactNode }> = ({ type = 'info', children }) => {
  const styles = {
    info: 'border-dds-blue/40 bg-dds-blue/10 text-dds-blue',
    warn: 'border-dds-orange/40 bg-dds-orange/10 text-dds-orange',
    tip: 'border-dds-green/40 bg-dds-green/10 text-dds-green',
  };
  const labels = { info: '📘 Note', warn: '⚠️ Warning', tip: '✅ Tip' };
  return (
    <div className={`my-4 p-4 rounded-xl border text-sm leading-relaxed ${styles[type]}`}>
      <strong className="block mb-1 font-bold">{labels[type]}</strong>
      <div className="text-dds-white font-medium">{children}</div>
    </div>
  );
};

const H2: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-bold text-dds-white mt-10 mb-3 flex items-center gap-3 tracking-tight">
    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-dds-primary to-purple-400 flex-shrink-0" />
    {children}
  </h2>
);
const H3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-base font-semibold text-dds-white mt-6 mb-2">{children}</h3>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-dds-text-secondary leading-relaxed mb-3 text-sm">{children}</p>
);
const Li: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-dds-text-secondary text-sm mb-2">
    <span className="text-dds-primary mt-0.5 flex-shrink-0">▸</span>
    <span className="leading-relaxed">{children}</span>
  </li>
);
const Table: React.FC<{ headers: string[]; rows: string[][] }> = ({ headers, rows }) => (
  <div className="overflow-x-auto my-4 rounded-xl border border-dds-border bg-dds-surface">
    <table className="w-full text-sm">
      <thead className="bg-dds-elevated border-b border-dds-border">
        <tr>
          {headers.map(h => (
            <th key={h} className="px-4 py-3 text-left text-dds-white font-bold text-xs uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-dds-border/50">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-dds-elevated/40 transition-colors">
            <td className="px-4 py-3 text-dds-white text-xs font-mono font-semibold">{r[0]}</td>
            {r.slice(1).map((c, j) => (
              <td key={j} className="px-4 py-3 text-dds-text-secondary text-xs">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ── Setup Tab ─────────────────────────────── */
const SetupTab: React.FC = () => (
  <div>
    <div className="p-5 rounded-xl border border-dds-primary/30 bg-dds-primary/10 mb-8 flex items-start gap-3.5">
      <div className="w-10 h-10 rounded-lg bg-dds-elevated border border-dds-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Wrench className="w-5 h-5 text-dds-primary" />
      </div>
      <div>
        <h4 className="text-dds-white font-bold text-base mb-1">Self-Hosted Setup</h4>
        <p className="text-dds-text-secondary text-sm leading-relaxed">
          Follow these guides to run DevOpsEase on your local machine, deploy to self-hosted infrastructure, or contribute to the open-source platform.
        </p>
      </div>
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
    <Note type="warn">On Windows, Docker Desktop with WSL2 backend enabled is required.</Note>

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
    <P>
      Dashboard: <code className="text-dds-primary font-mono font-semibold">http://localhost:5173</code> — API: <code className="text-dds-primary font-mono font-semibold">http://localhost:3497</code>
    </P>
    <Note type="tip">Quick local DB dependencies: <code className="text-dds-primary">docker run -d -p 27017:27017 mongo</code> and <code className="text-dds-primary">docker run -d -p 6379:6379 redis:7-alpine</code></Note>

    <H2>Environment Configuration</H2>
    <P>Create a <code className="text-dds-primary">.env</code> file inside the <code className="text-dds-primary">server/</code> directory:</P>
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
    <Note type="warn">
      Never change or lose your <code className="text-dds-primary font-mono font-semibold">ENCRYPTION_KEY</code> after first run. All secrets, Docker Hub credentials, and Kubernetes kubeconfigs are encrypted with it.
    </Note>

    <H2>Project Architecture</H2>
    <CodeBlock lang="text" code={`devopsease/
├── server/          # Node.js + Express backend (port 3497)
│   ├── src/
│   │   ├── models/       # Mongoose schemas & models
│   │   ├── services/     # Business logic & engines
│   │   ├── controllers/  # API Route controllers
│   │   ├── routes/       # Express endpoint definitions
│   │   ├── middlewares/  # Auth, Rate limiting, RBAC
│   │   ├── websocket/    # Live WS handlers (logs, metrics, builds)
│   │   ├── intelligence/ # Failure classification engine
│   │   └── docker/       # Docker Engine API integration
│   └── sandbox/     # Verification & self-check scripts
│
├── dashboard/       # React + TypeScript PaaS UI (port 5173)
│   └── src/
│       ├── pages/        # Dashboard & Public pages
│       ├── components/   # DDS Design system elements
│       ├── hooks/        # React Query + WebSocket hooks
│       ├── store/        # Redux toolkit state slices
│       ├── api/          # Axios typed API client
│       └── context/      # AuthContext & RoleContext
│
├── cli/             # devopsease CLI binary (dse command)
└── docs/            # Build logs & engineering notes`} />

    <H2>Contributing</H2>
    <ul className="mb-6 space-y-1">
      <Li>Fork the repository and create a feature branch: <code className="text-dds-primary">git checkout -b feat/my-feature</code></Li>
      <Li>Follow the project standard — TypeScript strict mode on frontend, ES2022 modules on backend</Li>
      <Li>Add docs entries to <code className="text-dds-primary">docs/</code> for any significant feature addition</Li>
      <Li>Open a PR against <code className="text-dds-primary">main</code> with a summary of changes and verification steps</Li>
    </ul>
    <Note type="info">The <code className="text-dds-primary">docs/</code> folder contains detailed technical logs documenting the implementation history of every subsystem.</Note>
  </div>
);

/* ── Blog Tab ─────────────────────────────── */
const BlogTab: React.FC = () => (
  <div className="card text-center py-24 px-6 border-dds-border">
    <div className="w-16 h-16 rounded-2xl bg-dds-elevated border border-dds-border flex items-center justify-center mx-auto mb-4 text-dds-primary">
      <Terminal size={32} />
    </div>
    <h2 className="text-2xl font-bold text-dds-white mb-2">Engineering Blog Coming Soon</h2>
    <p className="text-dds-text-secondary text-sm max-w-md mx-auto leading-relaxed">
      In-depth technical posts on container intelligence, Kubernetes autopilot algorithms, WebSocket log streaming, and platform architecture are on the way.
    </p>
  </div>
);

/* ── Changelog Tab ─────────────────────────── */
const ChangelogTab: React.FC = () => (
  <div className="card text-center py-24 px-6 border-dds-border">
    <div className="w-16 h-16 rounded-2xl bg-dds-elevated border border-dds-border flex items-center justify-center mx-auto mb-4 text-dds-primary">
      <Star size={32} />
    </div>
    <h2 className="text-2xl font-bold text-dds-white mb-2">Platform Changelog Coming Soon</h2>
    <p className="text-dds-text-secondary text-sm max-w-md mx-auto leading-relaxed">
      Detailed version histories, release logs, breaking change notifications, and new CLI module releases will be tracked here.
    </p>
  </div>
);

/* ── Community Tab ─────────────────────────── */
const CommunityTab: React.FC = () => (
  <div>
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-dds-white mb-2">Community & Ecosystem</h2>
      <p className="text-dds-text-secondary text-sm">
        Connect with the DevOpsEase community — ask questions, discuss architecture, report bugs, and shape the roadmap.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
      {[
        { icon: Github, title: 'GitHub Repository', desc: 'Explore source code, submit pull requests, and review open issues. The core hub of DevOpsEase.', link: 'https://github.com/mamun0193/devopsease', label: 'View on GitHub' },
        { icon: MessageSquare, title: 'GitHub Discussions', desc: 'Discuss implementation ideas, ask setup questions, and share custom pipeline recipes with developers.', link: 'https://github.com/mamun0193/devopsease/discussions', label: 'Join Discussions' },
        { icon: Bug, title: 'Bug Reports', desc: 'Found an issue? Open a bug report with reproduction steps, Docker Engine logs, and environment details.', link: 'https://github.com/mamun0193/devopsease/issues', label: 'Report a Bug' },
        { icon: GitPullRequest, title: 'Contributions & PRs', desc: 'Submit PRs for new features, bug fixes, CLI subcommands, or documentation enhancements.', link: 'https://github.com/mamun0193/devopsease/pulls', label: 'Submit a PR' },
      ].map(({ icon: Icon, title, desc, link, label }) => (
        <a key={title} href={link} target="_blank" rel="noreferrer"
          className="card card-interactive p-6 flex flex-col gap-3 group border-dds-border hover:border-dds-primary/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-dds-elevated border border-dds-border flex items-center justify-center text-dds-primary group-hover:text-white transition-colors">
              <Icon size={18} />
            </div>
            <span className="text-dds-white font-bold text-base">{title}</span>
          </div>
          <p className="text-dds-text-secondary text-sm leading-relaxed">{desc}</p>
          <span className="text-dds-primary text-xs font-semibold group-hover:translate-x-1 transition-transform mt-auto inline-flex items-center gap-1">
            {label} →
          </span>
        </a>
      ))}
    </div>

    <div className="card p-6 border-dds-border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-dds-white font-bold text-base mb-1 flex items-center gap-2">
          <Star size={18} className="text-dds-orange" /> Show Your Support
        </h3>
        <p className="text-dds-text-secondary text-sm">
          If DevOpsEase streamlines your deployments, give the project a star on GitHub!
        </p>
      </div>
      <a href="https://github.com/mamun0193/devopsease" target="_blank" rel="noreferrer"
        className="btn-primary flex-shrink-0 px-5 py-2.5 text-sm font-semibold rounded-lg">
        <Star size={15} /> Star on GitHub
      </a>
    </div>

    <div className="card p-6 border-dds-border">
      <h3 className="text-dds-white font-bold text-base mb-2 flex items-center gap-2">
        <Users size={18} className="text-dds-primary" /> Good First Issues
      </h3>
      <p className="text-dds-text-secondary text-sm mb-4">
        Looking for beginner-friendly contributions? Explore topics open for implementation:
      </p>
      <div className="space-y-2.5">
        {[
          'Add unit test coverage for the failure intelligence classifier',
          'Enhance responsive navigation controls on lower resolution displays',
          'Add ECR & Google Artifact Registry integrations',
          'Write end-to-end integration tests for container provisioning',
          'Expand CLI interactive wizard for multi-cluster configuration',
        ].map(item => (
          <div key={item} className="flex items-center gap-2.5 text-dds-text-secondary text-sm">
            <span className="text-[11px] px-2 py-0.5 rounded bg-dds-primary/15 border border-dds-primary/30 text-dds-primary font-mono font-semibold uppercase">
              Idea
            </span>
            <span className="leading-relaxed">{item}</span>
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
    { key: 'blog',      label: 'Engineering Blog', icon: Zap },
    { key: 'changelog', label: 'Changelog',         icon: Star },
    { key: 'community', label: 'Community',         icon: Users },
  ];

  return (
    <LandingLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-14">

        {/* Hero */}
        <motion.div
          className="text-center mb-10"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[6px] bg-dds-primary/10 border border-dds-primary/20 text-dds-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Terminal className="w-3.5 h-3.5" />
            Developers Area
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-3 text-dds-white tracking-tight">
            DevOpsEase for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-dds-primary to-purple-400">
              Developers & Contributors
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-dds-text-secondary text-base max-w-2xl mx-auto leading-relaxed">
            Self-host DevOpsEase on your own infrastructure, build custom integrations, follow engineering deep dives, and connect with the community.
          </motion.p>
        </motion.div>

        {/* Tab Bar */}
        <motion.div
          className="flex overflow-x-auto gap-2 p-1.5 bg-dds-surface border border-dds-border rounded-xl mb-10 max-w-3xl mx-auto"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
                tab === key
                  ? 'bg-dds-primary text-white shadow-lg shadow-dds-primary/20'
                  : 'text-dds-text-secondary hover:text-dds-white hover:bg-dds-elevated'
              }`}>
              <Icon size={16} />
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
            className="max-w-5xl mx-auto"
          >
            {tab === 'setup'     && <SetupTab />}
            {tab === 'blog'      && <BlogTab />}
            {tab === 'changelog' && <ChangelogTab />}
            {tab === 'community' && <CommunityTab />}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-dds-border/60 flex flex-col sm:flex-row items-center justify-between text-sm text-dds-text-muted gap-3">
          <span>DevOpsEase Developers Area — Open Source Community</span>
          <a href="https://github.com/mamun0193/devopsease" target="_blank" rel="noreferrer" className="text-dds-primary hover:text-dds-primary-hover font-semibold transition-colors flex items-center gap-1">
            GitHub Repository →
          </a>
        </div>
      </div>
    </LandingLayout>
  );
};

export default DevelopersPage;
