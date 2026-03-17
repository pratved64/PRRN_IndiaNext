"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  getSentinelHealth, 
  getSentinelDemoScenarios, 
  runSentinelDemo,
  getSentinelUserHistory 
} from "@/lib/api";

interface SentinelEvent {
  event_id: string;
  user_id: string;
  verdict: string;
  severity_score: number;
  highest_severity_rule: string;
  timestamp: string;
  narrative: string;
}

export default function SentinelSOCDashboard() {
  const [history, setHistory] = useState<SentinelEvent[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState("U001");

  useEffect(() => {
    async function init() {
      try {
        const [h, s, hist] = await Promise.all([
          getSentinelHealth(),
          getSentinelDemoScenarios(),
          getSentinelUserHistory(selectedUser)
        ]);
        setHealth(h);
        setScenarios(s.scenarios || []);
        setHistory(hist.history || []);
      } catch (err) {
        console.error(err);
        setError("Sentinel Engine Offline. Check backend status.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [selectedUser]);

  const handleRunDemo = async (scenarioId: string) => {
    try {
      setLoading(true);
      await runSentinelDemo(scenarioId);
      const hist = await getSentinelUserHistory(selectedUser);
      setHistory(hist.history || []);
    } catch (err) {
      setError("Failed to trigger demo scenario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-10 font-mono relative z-20">
      
      {/* Background Grid */}
      <style dangerouslySetInnerHTML={{__html: `
        .bg-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
        }
      `}} />
      <div className="absolute inset-0 bg-grid pointer-events-none"></div>

      <Link href="/" className="inline-block text-cyan-400 hover:text-cyan-300 transition-colors uppercase text-xs tracking-widest mb-6 relative z-10">
        &larr; Return to Main Platform
      </Link>

      <header className="mb-10 flex flex-col md:flex-row gap-4 md:items-end justify-between border-b border-white/10 pb-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-white uppercase">Sentinel <span className="text-cyan-400">SOC</span></h1>
          <p className="text-neutral-500 text-sm mt-1 uppercase tracking-widest">Behavioral Anomaly Detection Engine</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-black/50 border border-white/10 px-4 py-2 rounded flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${health?.ready ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
            <span className="text-[10px] uppercase text-neutral-400">Engine: {health?.ready ? 'ONLINE' : 'TRAINING'}</span>
          </div>
          <div className="bg-black/50 border border-white/10 px-4 py-2 rounded">
             <span className="text-[10px] uppercase text-neutral-400">Users Trained: {health?.users_trained || 0}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-lg text-sm text-center mb-10 relative z-10">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
        
        {/* Sidebar: Demo Scenarios */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xs uppercase text-neutral-500 tracking-widest mb-4">Simulation Control</h2>
          <div className="space-y-3">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => handleRunDemo(s.id)}
                disabled={loading}
                className="w-full text-left bg-neutral-900 border border-white/5 p-4 rounded hover:border-cyan-500/50 transition group"
              >
                <p className="text-[10px] text-cyan-400 uppercase tracking-tighter mb-1 font-bold group-hover:text-cyan-300">{s.id}</p>
                <p className="text-xs text-neutral-300">{s.name}</p>
                <p className="text-[9px] text-neutral-500 mt-2 italic line-clamp-2">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Feed: Anomaly History */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs uppercase text-neutral-500 tracking-widest">Behavioral Intelligence Feed</h2>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-black border border-white/10 text-xs px-2 py-1 rounded outline-none text-cyan-400"
            >
              <option value="U001">User U001</option>
              {/* Add more as needed */}
            </select>
          </div>

          <div className="bg-neutral-900/50 border border-white/10 rounded overflow-hidden">
            {history.length > 0 ? (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-black/50 text-neutral-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 font-normal">Timestamp</th>
                    <th className="p-4 font-normal">Verdict</th>
                    <th className="p-4 font-normal">Main Indicator</th>
                    <th className="p-4 font-normal">Severity</th>
                    <th className="p-4 font-normal">Narrative Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {history.map((evt, i) => (
                    <tr key={evt.event_id} className="hover:bg-cyan-500/5 transition group">
                      <td className="p-4 text-neutral-500 font-mono">{new Date(evt.timestamp).toLocaleTimeString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          evt.verdict === 'MALICIOUS' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          evt.verdict === 'SUSPICIOUS' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                          'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}>
                          {evt.verdict}
                        </span>
                      </td>
                      <td className="p-4 text-neutral-300">{evt.highest_severity_rule}</td>
                      <td className="p-4 font-mono font-bold text-neutral-400">{(evt.severity_score * 10).toFixed(1)}/10</td>
                      <td className="p-4 text-neutral-500 italic max-w-xs truncate" title={evt.narrative}>{evt.narrative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-20 text-center text-neutral-500 uppercase text-xs tracking-widest">
                No behavioral anomalies detected for {selectedUser}.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
