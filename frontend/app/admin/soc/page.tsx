"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface ThreatLog {
  ip: string;
  userAgent: string;
  country: string;
  city: string;
  timestamp: string;
}

export default function ThreatDashboard() {
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the logs when the dashboard loads
    fetch('/api/admin/threat-logs')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Parse the Redis strings back into JSON objects
          setLogs(data.logs.map((log: string) => JSON.parse(log)));
        } else {
          setError(data.error || "Failed to load Threat Logs. Make sure you have configured Upstash Redis credentials in .env.local.");
        }
      })
      .catch(err => {
        console.error(err);
        setError("Error fetching threat logs.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Function to export blocked IPs to Cloudflare/AWS WAF format
  const exportWafList = () => {
    if (!logs.length) return;
    const ips = logs.map((log) => log.ip).join('\n');
    const blob = new Blob([ips], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kawach_blocked_ips.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-10 font-mono relative z-20">
      
      {/* Go Back Link */}
      <Link href="/" className="inline-block text-cyan-400 hover:text-cyan-300 transition-colors uppercase text-xs tracking-widest mb-6">
        &larr; Return to Main Platform
      </Link>

      <header className="mb-10 flex flex-col md:flex-row gap-4 md:items-end justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-white">KAWACH <span className="text-cyan-400">SOC</span></h1>
          <p className="text-neutral-500 text-sm mt-1 uppercase tracking-widest">Active Threat Intelligence</p>
        </div>
        <button 
          onClick={exportWafList}
          disabled={logs.length === 0}
          className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export WAF Rules
        </button>
      </header>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-lg text-sm text-center">
          {error}
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-20">
           <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-neutral-900 border border-white/5 p-6 rounded relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-red-500/10 transition-colors duration-500"></div>
              <p className="text-neutral-500 text-xs mb-2 uppercase relative z-10">Trapped Bots (30d)</p>
              <p className="text-4xl text-red-500 font-bold relative z-10">{logs.length}</p>
            </div>
            <div className="bg-neutral-900 border border-white/5 p-6 rounded relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-500/10 transition-colors duration-500"></div>
              <p className="text-neutral-500 text-xs mb-2 uppercase relative z-10">System Defense</p>
              <p className="text-2xl text-green-400 font-bold flex items-center gap-2 relative z-10">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                ACTIVE
              </p>
            </div>
          </div>

          {/* Live Threat Feed Table */}
          <div className="bg-neutral-900 border border-white/10 rounded overflow-x-auto">
            {logs.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-black/50 text-neutral-400 text-[10px] md:text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Attacker IP</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Bot Fingerprint (User-Agent)</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-white/5 transition">
                      <td className="p-4 text-neutral-400">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 font-bold text-red-400 font-mono tracking-wider">{log.ip}</td>
                      <td className="p-4">{log.city}, {log.country}</td>
                      <td className="p-4 text-[10px] md:text-xs text-neutral-500 truncate max-w-[150px] md:max-w-xs" title={log.userAgent}>{log.userAgent}</td>
                      <td className="p-4"><span className="bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">Blocked</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
                <div className="text-center p-12 text-neutral-500 text-sm tracking-widest uppercase">
                  No active threats detected.
                </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
