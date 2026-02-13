import React from 'react';
import { LandingLayout } from '../components/LandingLayout';

export const DocsPage: React.FC = () => {
    return (
        <LandingLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col md:flex-row gap-12">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 flex-shrink-0 hidden md:block">
                        <div className="sticky top-24">
                            <h3 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">Documentation</h3>
                            <nav className="space-y-3">
                                <a href="#introduction" className="block text-gray-400 hover:text-white transition-colors hover:pl-2 border-l-2 border-transparent hover:border-indigo-500 pl-2 -ml-2.5">Introduction</a>
                                <a href="#getting-started" className="block text-gray-400 hover:text-white transition-colors hover:pl-2 border-l-2 border-transparent hover:border-indigo-500 pl-2 -ml-2.5">Getting Started</a>
                                <a href="#features" className="block text-gray-400 hover:text-white transition-colors hover:pl-2 border-l-2 border-transparent hover:border-indigo-500 pl-2 -ml-2.5">Key Features</a>
                                <a href="#troubleshooting" className="block text-gray-400 hover:text-white transition-colors hover:pl-2 border-l-2 border-transparent hover:border-indigo-500 pl-2 -ml-2.5">Troubleshooting</a>
                            </nav>
                        </div>
                    </aside>

                    {/* Content */}
                    <main className="flex-1 text-gray-300 min-w-0">
                        <section id="introduction" className="mb-16 scroll-mt-24">
                            <h1 className="text-4xl font-bold text-white mb-6 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent inline-block">Introduction</h1>
                            <p className="text-lg leading-relaxed mb-6">
                                <strong className="text-white">DevOpsEase</strong> is a modern, lightweight Docker management dashboard designed to simplify container orchestration for developers.
                                Say goodbye to complex CLI commands and wrestle with JSON output.
                            </p>
                            <p className="text-lg leading-relaxed">
                                Whether you're debugging a local microservice architecture or managing a small production cluster, DevOpsEase gives you the visibility and control you need in a single, beautiful interface.
                            </p>
                        </section>

                        <section id="getting-started" className="mb-16 scroll-mt-24">
                            <h2 className="text-3xl font-bold text-white mb-6">Getting Started</h2>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
                                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                    Prerequisites
                                </h3>
                                <ul className="space-y-3 text-gray-400">
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-400 mt-1">•</span>
                                        <span>Docker Engine installed and running on the host machine.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-400 mt-1">•</span>
                                        <span>Node.js v18+ (if running outside Docker).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-indigo-400 mt-1">•</span>
                                        <span>Modern web browser (Chrome, Firefox, Safari).</span>
                                    </li>
                                </ul>
                            </div>

                            <p className="mb-4 text-gray-300">
                                To run DevOpsEase locally, clone the repository and start the development server:
                            </p>

                            <div className="bg-gray-950 p-5 rounded-xl font-mono text-sm border border-gray-800 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-gray-500">bash</span>
                                </div>
                                <code className="block text-indigo-300">git clone https://github.com/mamun0193/devopsease.git</code>
                                <code className="block text-gray-400 mt-1">cd devopsease</code>
                                <code className="block text-gray-400 mt-1">npm install</code>
                                <code className="block text-emerald-400 mt-1">npm run dev</code>
                            </div>
                        </section>

                        <section id="features" className="mb-16 scroll-mt-24">
                            <h2 className="text-3xl font-bold text-white mb-8">Key Features</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 hover:border-indigo-500/30 transition-colors">
                                    <h3 className="text-xl font-bold text-indigo-400 mb-3">Visual Management</h3>
                                    <p className="text-sm leading-relaxed">Start, stop, restart, and remove containers with a single click. No more typing <code>docker ps</code> and manual ID entry.</p>
                                </div>
                                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 hover:border-emerald-500/30 transition-colors">
                                    <h3 className="text-xl font-bold text-emerald-400 mb-3">Real-time Metrics</h3>
                                    <p className="text-sm leading-relaxed">Track CPU usage, memory consumption, and network I/O for every running container. Identify performance bottlenecks instantly.</p>
                                </div>
                                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 hover:border-amber-500/30 transition-colors">
                                    <h3 className="text-xl font-bold text-amber-400 mb-3">Live Logs</h3>
                                    <p className="text-sm leading-relaxed">Stream container logs directly to your browser. Filter, search, and debug applications faster than ever with log persistence.</p>
                                </div>
                                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 hover:border-cyan-500/30 transition-colors">
                                    <h3 className="text-xl font-bold text-cyan-400 mb-3">Exec Console</h3>
                                    <p className="text-sm leading-relaxed">Need to run a command inside a container? Open a secure web-based terminal session directly from the dashboard.</p>
                                </div>
                            </div>
                        </section>

                        <section id="troubleshooting" className="mb-16 scroll-mt-24">
                            <h2 className="text-3xl font-bold text-white mb-6">Troubleshooting</h2>
                            <div className="space-y-4">
                                <details className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group">
                                    <summary className="font-semibold text-white p-4 cursor-pointer hover:bg-gray-800 transition-colors list-none flex items-center justify-between">
                                        <span>Docker socket not found / permission denied?</span>
                                        <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <div className="px-4 pb-4 pt-0 text-gray-400 text-sm border-t border-gray-800 mt-0">
                                        <p className="mt-4">Ensure Docker Desktop is running. On Linux, you may need to add your user to the docker group:</p>
                                        <code className="block bg-gray-950 p-2 rounded mt-2 text-indigo-300">sudo usermod -aG docker $USER</code>
                                        <p className="mt-2">Then log out and log back in.</p>
                                    </div>
                                </details>
                                <details className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group">
                                    <summary className="font-semibold text-white p-4 cursor-pointer hover:bg-gray-800 transition-colors list-none flex items-center justify-between">
                                        <span>Metrics appearing as 0%?</span>
                                        <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <div className="px-4 pb-4 pt-0 text-gray-400 text-sm border-t border-gray-800 mt-0">
                                        <p className="mt-4">Docker stats API takes a few seconds to gather initial data. Wait 5-10 seconds after container start. Ensure the container is actually running and not restarting.</p>
                                    </div>
                                </details>
                                <details className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group">
                                    <summary className="font-semibold text-white p-4 cursor-pointer hover:bg-gray-800 transition-colors list-none flex items-center justify-between">
                                        <span>Authentication issues?</span>
                                        <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <div className="px-4 pb-4 pt-0 text-gray-400 text-sm border-t border-gray-800 mt-0">
                                        <p className="mt-4">If you get locked out, clear your browser cookies or try logging in again after 15 minutes. The system has strict brute-force protection.</p>
                                    </div>
                                </details>
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </LandingLayout>
    );
};
