import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Github } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans relative">
      {/* Background Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Box className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                DevOpsEase
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link
                to="/"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`text-sm font-medium transition-colors ${location.pathname === '/' && !location.hash ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Home
              </Link>
              <a
                href="/#about"
                className={`text-sm font-medium transition-colors ${location.hash === '#about' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                About
              </a>
              <a
                href="/#features"
                className={`text-sm font-medium transition-colors ${location.hash === '#features' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Features
              </a>
              <a
                href="/#pricing"
                className={`text-sm font-medium transition-colors ${location.hash === '#pricing' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Pricing
              </a>
              <Link
                to="/docs"
                className={`text-sm font-medium transition-colors ${location.pathname === '/docs' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Docs
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link
                    to="/login?tab=register"
                    className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
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

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-gray-500" />
            <span className="text-gray-500 font-medium text-sm">DevOpsEase &copy; 2026. Made for developers.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors"><Github className="w-5 h-5" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
};
