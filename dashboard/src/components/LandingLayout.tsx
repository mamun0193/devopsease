import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TerminalSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';

export const LandingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-dds-bg text-dds-white flex flex-col font-sans relative">
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-dds-primary/15 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-dds-primary/8 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-dds-border bg-dds-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-dds-primary rounded-[6px] flex items-center justify-center shadow-lg shadow-dds-primary/20">
                <TerminalSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-semibold tracking-tight text-dds-white">
                DevOpsEase
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`text-sm font-medium transition-colors ${location.pathname === '/' && !location.hash ? 'text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white'}`}
              >
                Home
              </Link>
              <Link
                to="/about"
                className={`text-sm font-medium transition-colors ${location.pathname === '/about' ? 'text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white'}`}
              >
                About
              </Link>
              <Link
                to="/features"
                className={`text-sm font-medium transition-colors ${location.pathname === '/features' ? 'text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white'}`}
              >
                Features
              </Link>
              <Link
                to="/pricing"
                className={`text-sm font-medium transition-colors ${location.pathname === '/pricing' ? 'text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white'}`}
              >
                Pricing
              </Link>
              <Link
                to="/docs"
                className={`text-sm font-medium transition-colors ${location.pathname === '/docs' ? 'text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white'}`}
              >
                Documentation
              </Link>
              <Link
                to="/developers"
                className={`text-sm font-medium transition-colors ${location.pathname === '/developers' ? 'text-dds-primary' : 'text-dds-text-secondary hover:text-dds-white'}`}
              >
                Developers area
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-dds-text-secondary hover:text-dds-white transition-colors">
                    Sign In
                  </Link>
                  <Link
                    to="/login?tab=register"
                    className="btn-primary"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full relative">
        {children}
      </main>

      <Footer />
    </div>
  );
};
