"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// 1. Updated stats with dark-mode optimized colors
const STATS = [
  { label: 'Threats Detected', value: '1,284', change: '+12% this week', color: 'text-red-400' },
  { label: 'URLs Scanned', value: '8,472', change: '+34% this week', color: 'text-blue-400' },
  { label: 'Emails Analyzed', value: '3,910', change: '+8% this week', color: 'text-purple-400' },
  { label: 'Threats Blocked', value: '1,201', change: '93.5% block rate', color: 'text-green-400' },
];

const RECENT_THREATS = [
  { id: 1, type: 'Phishing Email', target: 'finance@corp.com', risk: 'Critical', time: '2 min ago' },
  { id: 2, type: 'Malicious URL', target: 'paypa1.com/login', risk: 'High', time: '11 min ago' },
  { id: 3, type: 'Spear Phishing', target: 'ceo@corp.com', risk: 'Critical', time: '28 min ago' },
  { id: 4, type: 'Typosquatting', target: 'g00gle.com', risk: 'Medium', time: '45 min ago' },
  { id: 5, type: 'Prompt Injection', target: 'AI Chatbot Input', risk: 'High', time: '1 hr ago' },
];

// 2. Updated risk badges for the dark cyber theme
const riskBadge: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  High: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  Low: 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  // Handle navbar blur effect on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden">
      
      {/* Background Grid Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drift {
          from { background-position: 0 0; }
          to { background-position: -40px -40px; }
        }
        .bg-grid-animated {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          animation: drift 20s linear infinite;
        }
      `}} />
      <div className="absolute inset-0 bg-grid-animated pointer-events-none"></div>

      {/* Radial Glow for visual depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none"></div>

      {/* TOP NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-neutral-950/80 backdrop-blur-md border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-white rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            <span className="text-xl font-light tracking-widest text-white lowercase">
              abhedya<span className="font-bold">.sec</span>
            </span>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-mono uppercase tracking-widest text-neutral-400">
            <Link href="#features" className="hover:text-white transition">Platform</Link>
            <Link href="#engine" className="hover:text-white transition">AI Engine</Link>
            <Link href="#data" className="hover:text-white transition">Live Data</Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4">
            <Link href="/login" className="hidden md:flex px-5 py-2 text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition items-center">
              Login
            </Link>
            <Link href="/signup" className="hidden md:flex px-5 py-2 text-xs font-mono uppercase tracking-widest text-neutral-300 border border-white/10 rounded hover:bg-white/5 transition items-center">
              Sign Up
            </Link>
            <Link href="/phishing" className="px-6 py-2 text-xs font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 transition">
              Launch Console
            </Link>
          </div>
        </div>
      </nav>

      {/* MAIN HERO SECTION */}
      <main className="relative z-10 pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-mono text-neutral-400 uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Module v2.4 Online
          </div>
          
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-6 leading-tight">
            Next-Gen Defense Against <br />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-400 to-neutral-600">
              Zero-Day Threats.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 font-mono font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Detect, analyze, and explain emerging cyber threats in milliseconds using our deterministic AI classification engine.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/phishing" className="px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">
              Initialize Live Scan
            </Link>
            <Link href="#documentation" className="px-8 py-4 text-sm font-mono uppercase tracking-widest text-neutral-300 border border-white/10 rounded hover:bg-white/5 transition-all">
              View API Docs
            </Link>
          </div>
        </div>

        {/* LIVE TELEMETRY DASHBOARD (Your provided code, heavily stylized) */}
        <div id="data" className="mt-12 bg-neutral-900/40 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl p-6 md:p-8">
          
          <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-light text-white uppercase tracking-wide">Global <span className="font-bold">Telemetry</span></h2>
              <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mt-1">Real-time AI-powered threat intelligence summary.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-green-400 bg-green-950/30 border border-green-500/20 px-3 py-1.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live Feed Active
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-black/50 rounded-lg border border-white/5 p-6 hover:border-white/20 transition duration-300 group">
                <p className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-2">{stat.label}</p>
                <p className={`text-4xl font-light tracking-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-mono uppercase text-neutral-600 mt-2 flex items-center gap-1">
                  <span className="text-green-500">↑</span> {stat.change}
                </p>
              </div>
            ))}
          </div>

          {/* Recent Threats Table */}
          <div className="bg-black/80 rounded-lg border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-neutral-950 flex justify-between items-center">
              <h3 className="text-sm font-mono uppercase text-neutral-400 tracking-widest">Recent Threat Interceptions</h3>
              <span className="text-[10px] font-mono text-neutral-600 uppercase">Updating live...</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-900/50 text-neutral-500 font-mono uppercase text-[10px] tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-normal">Threat Type</th>
                    <th className="px-6 py-4 font-normal">Target Payload / URL</th>
                    <th className="px-6 py-4 font-normal">Severity</th>
                    <th className="px-6 py-4 font-normal text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {RECENT_THREATS.map((threat) => (
                    <tr key={threat.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 text-neutral-300 font-medium">{threat.type}</td>
                      <td className="px-6 py-4 text-neutral-500 font-mono text-xs">{threat.target}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-widest ${riskBadge[threat.risk]}`}>
                          {threat.risk}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 font-mono text-xs text-right">{threat.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}