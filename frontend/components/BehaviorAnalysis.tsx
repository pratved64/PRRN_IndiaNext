"use client";

import React, { useState, useEffect } from "react";
import { runSentinelAnalyze } from "@/lib/api";
import { saveScan } from "@/lib/scanHistory";
import { useTheme } from "@/lib/ThemeContext";

interface Scenario {
  id: string;
  name: string;
  description: string;
  data: any;
}

const SCENARIOS: Scenario[] = [
  {
    id: "scenario-1",
    name: "Impossible Travel",
    description: "Mumbai → London in 28 minutes",
    data: {
      event_id: "scenario-1",
      user_id: "user_001",
      timestamp: "2025-03-16T22:28:00",
      ip: "45.33.32.156",
      latitude: 51.5074,
      longitude: -0.1278,
      city: "London",
      country: "United Kingdom",
      device_os: "Windows",
      device_browser: "Edge",
      success: true,
      failure_count: 0,
      session_duration_mins: 12,
      is_vpn: false
    }
  },
  {
    id: "scenario-2",
    name: "Credential Stuffing",
    description: "15 failed logins in 90 seconds",
    data: {
      event_id: "scenario-2",
      user_id: "user_002",
      timestamp: "2025-03-16T03:01:30",
      ip: "45.33.32.156",
      latitude: 12.9716,
      longitude: 77.5946,
      city: "Bangalore",
      country: "India",
      device_os: "Windows",
      device_browser: "Chrome",
      success: false,
      failure_count: 15,
      session_duration_mins: 0,
      is_vpn: false
    }
  },
  {
    id: "scenario-3",
    name: "New Device at 3am",
    description: "Unknown device, unknown country, 3am",
    data: {
      event_id: "scenario-3",
      user_id: "user_003",
      timestamp: "2025-03-16T03:17:00",
      ip: "197.210.54.22",
      latitude: 6.5244,
      longitude: 3.3792,
      city: "Lagos",
      country: "Nigeria",
      device_os: "Android",
      device_browser: "Chrome",
      success: true,
      failure_count: 0,
      session_duration_mins: 8,
      is_vpn: false
    }
  },
  {
    id: "scenario-4",
    name: "Dormant Account",
    description: "95 days dormant, new location",
    data: {
      event_id: "scenario-4",
      user_id: "user_001",
      timestamp: "2025-03-16T14:00:00",
      ip: "185.220.101.45",
      latitude: 25.2048,
      longitude: 55.2708,
      city: "Dubai",
      country: "United Arab Emirates",
      device_os: "MacOS",
      device_browser: "Safari",
      success: true,
      failure_count: 0,
      session_duration_mins: 22,
      is_vpn: false
    }
  },
  {
    id: "scenario-5",
    name: "Contextual Anomaly",
    description: "Tor browser, VPN, multiple failures",
    data: {
      event_id: "scenario-5",
      user_id: "user_002",
      timestamp: "2025-03-16T11:00:00",
      ip: "185.220.101.45",
      latitude: 12.9716,
      longitude: 77.5946,
      city: "Bangalore",
      country: "India",
      device_os: "Linux",
      device_browser: "Tor Browser",
      success: true,
      failure_count: 3,
      session_duration_mins: 5,
      is_vpn: true
    }
  }
];

export default function BehaviorAnalysis() {
  const [activeScenario, setActiveScenario] = useState<number | null>(1);
  const [inputJson, setInputJson] = useState(JSON.stringify(SCENARIOS[0].data, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { themeStyle } = useTheme();

  const handleScenarioClick = (index: number) => {
    setActiveScenario(index + 1);
    setInputJson(JSON.stringify(SCENARIOS[index].data, null, 2));
    setError(null);
  };

  const handleAnalyze = async () => {
    setError(null);
    let parsed;
    try {
      parsed = JSON.parse(inputJson);
    } catch (e) {
      setError("Invalid JSON — check the format");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const data = await runSentinelAnalyze(parsed);
      setResult(data);
      
      // Save scan to history
      saveScan({
        tool: "behavior",
        input_preview: `${parsed.user_id} — ${parsed.city}`,
        verdict: data.verdict,
        risk_score: data.severityScore || 0,
        classification: data.highestSeverityRule || data.verdict,
        details: data
      });
    } catch (err: any) {
      setError(err.message || "API call failed. Ensure sentinel backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case "MALICIOUS":
        return "border-red-500/50 bg-red-500/10 text-red-400";
      case "SUSPICIOUS":
        return "border-amber-500/50 bg-amber-500/10 text-amber-400";
      default:
        return "border-green-500/50 bg-green-500/10 text-green-400";
    }
  };

  const getRuleBadgeStyle = (rule: string) => {
    if (rule.includes("IMPOSSIBLE_TRAVEL")) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (rule.includes("CREDENTIAL_STUFFING")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (rule.includes("NEW_DEVICE_NEW_COUNTRY")) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (rule.includes("OFF_HOURS")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (rule.includes("DORMANT")) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    return "bg-neutral-800 text-neutral-400 border-neutral-700";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4" style={themeStyle}>
      
      {/* LEFT COLUMN - Input Panel */}
      <div className="space-y-6">
        <div className="bg-neutral-900/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
          <div className="bg-neutral-950 px-4 py-3 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase text-neutral-500 tracking-widest">Login Event JSON</h3>
            {error && !result && <span className="text-[10px] text-red-400 uppercase font-bold animate-pulse">{error}</span>}
          </div>
          <div className="p-1">
            <textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              className="w-full bg-black/50 p-4 font-mono text-xs text-neutral-300 outline-none min-h-[300px] resize-y"
              spellCheck={false}
            />
          </div>
          <div className="bg-neutral-950 p-4 border-t border-white/10">
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full py-3 bg-white text-black font-mono font-bold uppercase tracking-widest rounded hover:bg-neutral-200 transition-all disabled:bg-neutral-800 disabled:text-neutral-500 flex justify-center items-center gap-2"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? "Analyzing..." : "Analyze Behavior"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase text-neutral-500 tracking-widest px-2">Simulation Presets</h3>
          {SCENARIOS.map((scenario, index) => (
            <button
              key={scenario.id}
              onClick={() => handleScenarioClick(index)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-300 group ${
                activeScenario === index + 1
                  ? "bg-white/10 border-white/30"
                  : "bg-neutral-900/40 border-white/5 hover:border-white/20"
              }`}
            >
              <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${
                activeScenario === index + 1 ? "text-cyan-400" : "text-neutral-400 group-hover:text-neutral-200"
              }`}>
                Scenario {index + 1} &mdash; {scenario.name}
              </p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-tighter">{scenario.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN - Results Panel */}
      <div className="bg-neutral-900/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4">
            <div className="text-white font-mono text-sm uppercase tracking-widest animate-pulse">Running Sentinel Analysis...</div>
            <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 w-full origin-left animate-[scale-x_2.5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        ) : result ? (
          <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Verdict Banner */}
            <div className={`p-4 rounded border flex justify-between items-center ${getVerdictStyle(result.verdict)}`}>
              <div className="font-mono font-bold text-lg uppercase tracking-widest">{result.verdict}</div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest opacity-70">Severity Score</div>
                <div className="text-2xl font-bold font-mono">{result.severity_score}/100</div>
              </div>
            </div>

            {/* Narrative Card */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase text-neutral-500 tracking-widest border-b border-white/10 pb-2">AI Analysis Narrative</h4>
              <div className="bg-black/30 p-4 rounded border border-white/5 font-mono text-xs text-neutral-300 leading-relaxed italic">
                {result.narrative}
              </div>
            </div>

            {/* Rules Fired */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase text-neutral-500 tracking-widest border-b border-white/10 pb-2">Triggered Rules</h4>
              <div className="flex flex-wrap gap-2">
                {result.rules_fired && result.rules_fired.length > 0 ? (
                  result.rules_fired.map((rule: string, i: number) => (
                    <span key={i} className={`px-2 py-1 rounded text-[10px] font-mono font-bold border uppercase ${getRuleBadgeStyle(rule)}`}>
                      {rule}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500 uppercase tracking-widest font-mono">No rules triggered</span>
                )}
              </div>
            </div>

            {/* SHAP Features */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase text-neutral-500 tracking-widest border-b border-white/10 pb-2">Feature Attribution (Local Interpretability)</h4>
              <div className="space-y-4 pt-2">
                {result.shap_features && result.shap_features.length > 0 ? (
                  result.shap_features.map((feature: any, i: number) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono uppercase">
                        <span className="text-neutral-400">{feature.label}</span>
                        <span className={feature.direction === "risk" ? "text-red-400" : "text-green-400"}>
                          {feature.direction === "risk" ? "+" : "-"}{feature.magnitude.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${feature.direction === "risk" ? "bg-red-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(100, feature.magnitude * 10)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 font-mono">No SHAP attribution data available.</p>
                )}
              </div>
            </div>

            {/* Recommended Action */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 p-4 rounded-lg">
              <h4 className="text-[10px] font-mono uppercase text-cyan-400 tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                Recommended Response
              </h4>
              <p className="text-sm text-neutral-200 leading-relaxed font-mono">
                {result.recommended_action}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-4">
           <div className="text-red-500 text-5xl opacity-50">⚠️</div>
           <div className="text-red-400 font-mono text-xs uppercase tracking-widest font-bold">{error}</div>
           <button 
             onClick={() => setError(null)}
             className="text-[10px] font-mono uppercase text-neutral-500 hover:text-white transition underline"
           >
             Dismiss Error
           </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-60">
            <div className="text-neutral-600 text-6xl mb-6">🔍</div>
            <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest leading-loose">
              Select a scenario or paste a login event <br /> to detect anomalous behavior
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
