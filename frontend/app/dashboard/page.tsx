"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import NewsWidget from "@/components/NewsWidget";
import { useTheme } from "@/lib/ThemeContext";

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

const riskBadge: Record<string, string> = {
  Critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  High: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  Low: 'bg-green-500/10 text-green-400 border-green-500/30',
};

export default function Dashboard() {
  const [sessionId, setSessionId] = useState("");
  const { theme, toggleTheme, themeStyle } = useTheme();

  useEffect(() => {
    setSessionId(`SYS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }, []);

  return (
    <div 
      className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center"
      style={themeStyle}
    >
      
      {/* Background Grid */}
      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
        }
      `}} />
      <div className="absolute inset-0 bg-grid pointer-events-none w-full h-full"></div>

      <DashboardNav />

      <div className="max-w-6xl w-full px-4 md:px-8 lg:px-12 relative z-10 mx-auto">

        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-mono text-xs uppercase tracking-widest focus:outline-none"
          >
            {theme === 'dark' ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> LIGHT</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> DARK</>
            )}
          </button>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-neutral-900/40 rounded-lg border border-white/10 p-6 backdrop-blur-sm hover:border-white/30 transition duration-300">
              <p className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-2">{stat.label}</p>
              <p className={`text-3xl md:text-4xl font-light tracking-tight ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] font-mono uppercase text-neutral-600 mt-2 flex items-center gap-1">
                <span className="text-green-500">↑</span> {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Split Layout for Threats and News */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Threats Table (2/3 width) */}
          <div className="lg:col-span-2 bg-neutral-900/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
            <h2 className="text-sm font-mono uppercase text-white tracking-widest">Recent Interceptions</h2>
            <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/20 text-neutral-500 font-mono uppercase text-[10px] tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-normal">Threat Type</th>
                  <th className="px-6 py-4 font-normal">Target / Indicator</th>
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

          {/* News Widget (1/3 width) */}
          <div className="lg:col-span-1 min-h-[400px]">
            <NewsWidget />
          </div>

        </div>

      </div>
    </div>
  );
}