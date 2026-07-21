import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TerminalSquare, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const { pathname } = useLocation();
  const link = (to: string) =>
    `text-sm transition-colors ${pathname === to ? 'text-dds-white font-medium' : 'text-dds-text-muted hover:text-dds-white'}`;

  return (
    <footer className="border-t border-dds-border bg-dds-sidebar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-dds-primary rounded-[6px] flex items-center justify-center shadow-lg shadow-dds-primary/20">
                <TerminalSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-dds-white text-sm tracking-tight">DevOpsEase</span>
            </div>
            <p className="text-dds-text-muted text-xs leading-relaxed max-w-[200px]">
              DevOpsEase simplifies modern DevOps workflows.
              Build, deploy, and scale applications with ease.
              From Git to Kubernetes — all in one platform.
              Designed for developers who value simplicity.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <a
                href="https://github.com/mamun0193/devopsease"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-dds-elevated hover:bg-dds-border text-dds-text-secondary text-xs font-medium transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                Star on GitHub
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-dds-text-muted uppercase tracking-widest mb-4">Product</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Home', to: '/' },
                { label: 'About', to: '/about' },
                { label: 'Features', to: '/features' },
                { label: 'Pricing', to: '/pricing' },
                { label: 'Docs', to: '/docs' },
                { label: 'Contact and Support', to: '/contact' },
              ].map(l => (
                <li key={l.label}>
                  <Link to={l.to} className={link(l.to)}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold text-dds-text-muted uppercase tracking-widest mb-4">Platform</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'CI/CD Pipelines', to: '/features' },
                { label: 'Docker Builds', to: '/features' },
                { label: 'Kubernetes', to: '/features' },
                { label: 'Secrets', to: '/features' },
                { label: 'CLI Tool', to: '/features' },
              ].map(l => (
                <li key={l.label}>
                  <Link to={l.to} className={link(l.to)}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plans */}
          <div>
            <h4 className="text-xs font-semibold text-dds-text-muted uppercase tracking-widest mb-4">Plans</h4>
            <ul className="flex flex-col gap-2.5">
              {[
                { label: 'Free — ₹0/mo', to: '/pricing' },
                { label: 'Pro — ₹199/mo', to: '/pricing' },
                { label: 'Premium — ₹399/mo', to: '/pricing' },
              ].map(l => (
                <li key={l.label}>
                  <Link to={l.to} className={link(l.to)}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="mt-2">
                <Link
                  to="/login?tab=register"
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Get Started Free
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-dds-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-dds-text-muted text-xs">
            © 2026 DevOpsEase || Made with ❤️ by <a href="https://github.com/mamun0193" target="_blank" rel="noopener noreferrer" className="text-dds-primary hover:text-dds-primary-hover">Mamun Rahaman</a>
          </p>
          <div className="flex items-center gap-2">
            {['Node.js', 'React', 'Docker', 'Kubernetes', 'GitHub'].map(t => (
              <span key={t} className="px-2 py-0.5 bg-dds-elevated text-dds-text-muted text-[10px] rounded-[4px] font-mono border border-dds-border">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
