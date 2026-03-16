"use client";

import React from "react";

interface ThreatResult {
  threatType: string;
  riskLevel: "None" | "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  explanations: string[];
  recommendation: string;
}

export default function ExplainabilityCard({ result }: { result: ThreatResult }) {
  // Apply your specific color rules
  const getAlertStyles = (level: string) => {
    if (level === "Critical" || level === "High") {
      return {
        wrapper: "border-red-500/50 bg-red-950/20",
        header: "border-red-500/50 bg-red-500/10 text-red-400",
        icon: "🔴",
      };
    }
    if (level === "None" || level === "Safe") {
      return {
        wrapper: "border-green-500/50 bg-green-950/20",
        header: "border-green-500/50 bg-green-500/10 text-green-400",
        icon: "🟢",
      };
    }
    // Default to White for Low/Medium
    return {
      wrapper: "border-white/20 bg-white/5",
      header: "border-white/20 bg-white/10 text-white",
      icon: "⚪",
    };
  };

  const styles = getAlertStyles(result.riskLevel);

  return (
    <div className={`mt-8 border backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300 ${styles.wrapper}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b flex justify-between items-center ${styles.header}`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{styles.icon}</span>
          <div>
            <h3 className="text-lg font-semibold tracking-wide uppercase">{result.threatType}</h3>
            <p className="text-xs font-mono opacity-80 mt-1">CONFIDENCE_SCORE: {result.confidence}%</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Risk Level</div>
          <div className="text-xl font-bold uppercase tracking-wider">
            {result.riskLevel}
          </div>
        </div>
      </div>

      {/* Explanation Body */}
      <div className="p-6 text-gray-300">
        <h4 className="text-sm font-mono uppercase tracking-widest text-gray-400 mb-4 border-b border-white/10 pb-2">
          Diagnostic Logs // Why flagged
        </h4>
        <ul className="space-y-3 mb-8 font-mono text-sm">
          {result.explanations.map((reason, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-3 opacity-50">{`[0${index + 1}]`}</span>
              <span>{reason}</span>
            </li>
          ))}
          {result.explanations.length === 0 && (
            <li className="text-green-400">No suspicious indicators detected in the payload.</li>
          )}
        </ul>

        {/* Recommendation */}
        <div className="bg-black/40 border border-white/10 p-4 rounded-md">
          <h4 className="text-xs font-mono uppercase text-gray-400 mb-2">Recommended Action</h4>
          <p className="text-sm text-gray-200">{result.recommendation}</p>
        </div>
      </div>
    </div>
  );
}