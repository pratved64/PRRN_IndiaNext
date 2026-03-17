"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardNav from "@/components/DashboardNav";
import NewsWidget from "@/components/NewsWidget";
import { useTheme } from "@/lib/ThemeContext";
import { 
  getScanHistory, 
  getScanStats, 
  clearScanHistory, 
  seedDemoData,
  getRecentScans,
  ScanRecord 
} from "@/lib/scanHistory";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from "recharts";

// Helper function to format tool names
function humanReadableTool(tool: string): string {
  const toolMap: Record<string, string> = {
    phishing: "Phishing",
    url: "URL Scanner",
    deepfake_media: "Deepfake Media",
    deepfake_audio: "Deepfake Audio",
    prompt_injection: "Prompt Injection",
    behavior: "Behavior Analysis"
  };
  return toolMap[tool] || tool;
}

// Helper function for relative time
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Tool badge colors
function getToolBadgeColor(tool: string): string {
  const colors: Record<string, string> = {
    phishing: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    url: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    deepfake_media: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    deepfake_audio: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    prompt_injection: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    behavior: "bg-teal-500/20 text-teal-400 border-teal-500/30"
  };
  return colors[tool] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

// Verdict badge colors
function getVerdictBadgeColor(verdict: string): string {
  const colors: Record<string, string> = {
    MALICIOUS: "bg-red-500/20 text-red-400 border-red-500/30",
    SUSPICIOUS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    SAFE: "bg-green-500/20 text-green-400 border-green-500/30",
    "AI GENERATED": "bg-red-500/20 text-red-400 border-red-500/30",
    "REAL HUMAN": "bg-green-500/20 text-green-400 border-green-500/30",
    "PROMPT INJECTION": "bg-red-500/20 text-red-400 border-red-500/30"
  };
  return colors[verdict] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export default function Dashboard() {
  const { theme, toggleTheme, themeStyle } = useTheme();
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Load data on mount and seed demo data if empty
  useEffect(() => {
    seedDemoData();
    setScanHistory(getScanHistory());
  }, []);

  // Refresh data when component mounts or when user navigates back
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setScanHistory(getScanHistory());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Compute stats
  const stats = useMemo(() => getScanStats(), [scanHistory]);

  // Compute charts data
  const toolChartData = useMemo(() => {
    // Add some fake data if no real data exists
    const baseData = Object.entries(stats.byTool)
      .filter(([_, count]) => count > 0)
      .map(([tool, count]) => ({
        tool: humanReadableTool(tool),
        count
      }));
    
    // If no data, add fake demo data for better visualization
    if (baseData.length === 0) {
      return [
        { tool: "Phishing", count: 12 },
        { tool: "URL Scanner", count: 8 },
        { tool: "Deepfake Media", count: 6 },
        { tool: "Deepfake Audio", count: 4 },
        { tool: "Prompt Injection", count: 7 },
        { tool: "Behavior Analysis", count: 9 }
      ];
    }
    
    return baseData;
  }, [stats.byTool]);

  const verdictChartData = useMemo(() => {
    let segments = [
      { name: 'Safe', value: stats.byVerdict.safe, color: '#22c55e' },
      { name: 'Suspicious', value: stats.byVerdict.suspicious, color: '#f59e0b' },
      { name: 'Malicious', value: stats.byVerdict.malicious, color: '#ef4444' },
      { name: 'Other', value: stats.byVerdict.other, color: '#64748b' },
    ].filter(s => s.value > 0);
    
    // If no data, add fake demo data for better visualization
    if (segments.length === 0) {
      segments = [
        { name: 'Safe', value: 15, color: '#22c55e' },
        { name: 'Suspicious', value: 8, color: '#f59e0b' },
        { name: 'Malicious', value: 4, color: '#ef4444' },
        { name: 'Other', value: 3, color: '#64748b' }
      ];
    }
    
    return segments;
  }, [stats.byVerdict]);

  const timelineData = useMemo(() => {
    const last14Days = Array.from({length: 14}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });

    return last14Days.map(date => {
      const dayScans = scanHistory.filter(s => 
        s.timestamp.startsWith(date)
      );
      return {
        date: date.slice(5), // MM-DD format
        total: dayScans.length,
        threats: dayScans.filter(s => 
          s.verdict === 'MALICIOUS' || 
          s.verdict === 'SUSPICIOUS' ||
          s.verdict === 'PROMPT INJECTION' ||
          s.verdict === 'AI GENERATED'
        ).length
      };
    });
  }, [scanHistory]);

  const recentScans = useMemo(() => {
    return getRecentScans(20);
  }, [scanHistory]);

  const handleClearHistory = () => {
    clearScanHistory();
    setScanHistory([]);
    setShowClearConfirm(false);
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Empty state for first-time users
  if (stats.total === 0) {
    return (
      <div
        className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center"
        style={themeStyle}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
          .bg-grid {
            background-size: 40px 40px;
            background-image: 
              linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          }
        `}} />
        <div className="absolute inset-0 bg-grid pointer-events-none w-full h-full"></div>

        <DashboardNav />

        <div className="max-w-4xl w-full px-4 md:px-8 lg:px-12 relative z-10 mx-auto text-center">

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

          <div className="py-20">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">
                Your Dashboard is <span className="font-bold">Empty</span>
              </h1>
              <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest max-w-2xl mx-auto">
                Start using the security tools to build your threat analysis history. Every scan you run will appear here with full analytics.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <a href="/phishing" className="group p-6 bg-neutral-900/40 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                <div className="text-cyan-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-white font-mono text-sm">Scan an Email</div>
              </a>

              <a href="/url-scan" className="group p-6 bg-neutral-900/40 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                <div className="text-blue-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="text-white font-mono text-sm">Scan a URL</div>
              </a>

              <a href="/deepfake-scan" className="group p-6 bg-neutral-900/40 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                <div className="text-purple-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-white font-mono text-sm">Analyze Media</div>
              </a>

              <a href="/deepfake-scan" className="group p-6 bg-neutral-900/40 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                <div className="text-indigo-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="text-white font-mono text-sm">Analyze Audio</div>
              </a>

              <a href="/prompt-injection" className="group p-6 bg-neutral-900/40 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                <div className="text-amber-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="text-white font-mono text-sm">Check a Prompt</div>
              </a>

              <a href="/behavior" className="group p-6 bg-neutral-900/40 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                <div className="text-teal-400 mb-2">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-white font-mono text-sm">Behavior Analysis</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center"
      style={themeStyle}
    >

      {/* Background Grid */}
      <style dangerouslySetInnerHTML={{
        __html: `
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

        {/* SECTION 1 — TOP STATS ROW */}
        <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
          {/* Total Scans */}
          <div className="bg-neutral-900/40 rounded-lg border border-white/10 p-6 backdrop-blur-sm hover:border-white/30 transition duration-300">
            <p className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-2">TOTAL SCANS</p>
            <p className="text-3xl md:text-4xl font-light tracking-tight text-cyan-400">{stats.total}</p>
            <p className="text-[10px] font-mono uppercase text-neutral-600 mt-2">All time</p>
          </div>

          {/* Threats Detected */}
          <div className="bg-neutral-900/40 rounded-lg border border-white/10 p-6 backdrop-blur-sm hover:border-white/30 transition duration-300">
            <p className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-2">THREATS DETECTED</p>
            <p className={`text-3xl md:text-4xl font-light tracking-tight ${(stats.byVerdict.malicious + stats.byVerdict.suspicious) > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
              {stats.byVerdict.malicious + stats.byVerdict.suspicious}
            </p>
            <p className="text-[10px] font-mono uppercase text-neutral-600 mt-2">Malicious + Suspicious</p>
          </div>

          {/* Threat Rate */}
          <div className="bg-neutral-900/40 rounded-lg border border-white/10 p-6 backdrop-blur-sm hover:border-white/30 transition duration-300">
            <p className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-2">THREAT RATE</p>
            <p className={`text-3xl md:text-4xl font-light tracking-tight ${
              stats.threatRate > 30 ? 'text-red-400' : 
              stats.threatRate > 10 ? 'text-amber-400' : 
              'text-green-400'
            }`}>
              {stats.threatRate.toFixed(1)}%
            </p>
            <p className="text-[10px] font-mono uppercase text-neutral-600 mt-2">Of all scans</p>
          </div>

          {/* Most Used Tool */}
          <div className="bg-neutral-900/40 rounded-lg border border-white/10 p-6 backdrop-blur-sm hover:border-white/30 transition duration-300">
            <p className="text-xs font-mono uppercase text-neutral-500 tracking-widest mb-2">MOST USED TOOL</p>
            <p className="text-lg md:text-xl font-light tracking-tight text-purple-400">
              {stats.mostUsedTool ? humanReadableTool(stats.mostUsedTool) : "None yet"}
            </p>
            <p className="text-[10px] font-mono uppercase text-neutral-600 mt-2">
              {stats.mostUsedTool ? `${stats.byTool[stats.mostUsedTool]} scans` : ""}
            </p>
          </div>
        </div>

        {/* SECTION 2 — CHARTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Scans by Tool Bar Chart */}
          <div className="bg-neutral-900/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-sm">
            <div className="px-6 py-4 border-b border-white/10 bg-black/40">
              <h2 className="text-sm font-mono uppercase text-white tracking-widest">SCANS BY TOOL</h2>
            </div>
            <div className="p-6 h-64">
              {toolChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toolChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#666" />
                    <YAxis dataKey="tool" type="category" stroke="#666" width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-sm">
                  Run some scans to see analytics
                </div>
              )}
            </div>
          </div>

          {/* Threat Distribution Donut Chart */}
          <div className="bg-neutral-900/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-sm">
            <div className="px-6 py-4 border-b border-white/10 bg-black/40">
              <h2 className="text-sm font-mono uppercase text-white tracking-widest">THREAT DISTRIBUTION</h2>
            </div>
            <div className="p-6 h-64">
              {verdictChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={verdictChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {verdictChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length && payload[0]) {
                          const data = payload[0];
                          if (data && data.value !== undefined && stats.total > 0) {
                            return (
                              <div className="bg-neutral-900/95 border border-white/20 rounded-lg p-3 backdrop-blur-sm">
                                <p className="text-white font-mono text-sm">{data.name}</p>
                                <p className="text-neutral-300 font-mono text-xs">{data.value} scans</p>
                                <p className="text-neutral-500 font-mono text-xs">
                                  {(((data.value as number) / (stats.total as number)) * 100).toFixed(1)}%
                                </p>
                              </div>
                            );
                          }
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-sm">
                  No scan data yet
                </div>
              )}
            </div>
            {/* Enhanced Legend */}
            {verdictChartData.length > 0 && (
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {verdictChartData.map((segment) => (
                    <div 
                      key={segment.name} 
                      className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800/50 border border-white/5 hover:bg-neutral-800/70 transition-all cursor-default"
                    >
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white/10" 
                        style={{ backgroundColor: segment.color }}
                      ></div>
                      <div className="flex-1">
                        <div className="text-white font-mono text-sm">{segment.name}</div>
                        <div className="text-neutral-400 font-mono text-xs">
                          {segment.value} {stats.total > 0 ? `(${(((segment.value as number) / (stats.total as number)) * 100).toFixed(1)}%)` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3 — SCAN TIMELINE CHART */}
        <div className="bg-neutral-900/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-sm mb-8">
          <div className="px-6 py-4 border-b border-white/10 bg-black/40">
            <h2 className="text-sm font-mono uppercase text-white tracking-widest">SCAN ACTIVITY</h2>
          </div>
          <div className="p-6 h-64">
            {timelineData.some(d => d.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stackId="1"
                    stroke="#06b6d4" 
                    fill="#06b6d4" 
                    fillOpacity={0.6}
                    name="Total Scans"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="threats" 
                    stackId="2"
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.8}
                    name="Threats"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500 font-mono text-sm">
                No recent activity — start scanning to see your activity timeline
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4 — RECENT SCAN HISTORY TABLE */}
        <div className="bg-neutral-900/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-sm mb-8">
          <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
            <h2 className="text-sm font-mono uppercase text-white tracking-widest">
              RECENT SCANS ({recentScans.length})
            </h2>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-[10px] font-mono uppercase text-red-400 hover:text-red-300 transition border border-red-400/30 px-3 py-1 rounded"
            >
              Clear History
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/20 text-neutral-500 font-mono uppercase text-[10px] tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-normal">Tool</th>
                  <th className="px-6 py-4 font-normal">Input</th>
                  <th className="px-6 py-4 font-normal">Verdict</th>
                  <th className="px-6 py-4 font-normal">Risk</th>
                  <th className="px-6 py-4 font-normal">Time</th>
                  <th className="px-6 py-4 font-normal text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentScans.map((scan: ScanRecord) => (
                  <React.Fragment key={scan.id}>
                    <tr 
                      className="hover:bg-white/[0.02] transition cursor-pointer"
                      onClick={() => toggleRowExpansion(scan.id)}
                    >
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-widest ${getToolBadgeColor(scan.tool)}`}>
                          {scan.tool.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 font-mono text-xs">
                        {scan.input_preview}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-widest ${getVerdictBadgeColor(scan.verdict)}`}>
                          {scan.verdict}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-mono text-xs ${getVerdictBadgeColor(scan.verdict).split(' ')[1]}`}>
                          {scan.risk_score}/100
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 font-mono text-xs">
                        {getRelativeTime(scan.timestamp)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <svg 
                          className={`w-4 h-4 text-neutral-500 transition-transform ${expandedRows.has(scan.id) ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>
                    {expandedRows.has(scan.id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-black/20">
                          <div className="space-y-2">
                            <div className="text-xs font-mono text-neutral-400">
                              <span className="text-neutral-500">CLASSIFICATION:</span> {scan.classification}
                            </div>
                            <div className="text-xs font-mono text-neutral-400">
                              <span className="text-neutral-500">TIMESTAMP:</span> {new Date(scan.timestamp).toLocaleString()}
                            </div>
                            <div className="text-xs font-mono text-neutral-400">
                              <span className="text-neutral-500">TOOL:</span> {humanReadableTool(scan.tool)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clear History Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-neutral-900 border border-white/10 rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-mono text-white mb-4">Clear All Scan History?</h3>
              <p className="text-neutral-400 text-sm mb-6">
                This will permanently delete all {stats.total} scan records. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-mono uppercase tracking-widest text-neutral-400 border border-white/10 rounded hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearHistory}
                  className="flex-1 px-4 py-2 text-sm font-mono uppercase tracking-widest bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  Clear History
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
