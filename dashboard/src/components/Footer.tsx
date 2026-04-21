import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const { pathname } = useLocation();
  const link = (to: string) =>
    `text-sm transition-colors ${pathname === to ? 'text-white font-medium' : 'text-gray-500 hover:text-gray-200'}`;

  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm">DevOpsEase</span>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed max-w-[200px]">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                Star on GitHub
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Product</h4>
            <ul className="flex flex-col gap-2.5">
              {[{ label: 'Home', to: '/' },
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
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Platform</h4>
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
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Plans</h4>
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Get Started Free
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © 2026 DevOpsEase || Made with ❤️ by <a href="https://github.com/mamun0193" target="_blank" rel="noopener noreferrer">Mamun Rahaman</a>
          </p>
          <div className="flex items-center gap-2">
            {['Node.js','React', 'Docker', 'Kubernetes', 'GitHub'].map(t => (
              <span key={t} className="px-2 py-0.5 bg-gray-800 text-gray-500 text-[10px] rounded font-mono">
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
