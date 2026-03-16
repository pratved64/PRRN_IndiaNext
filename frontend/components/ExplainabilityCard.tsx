"use client";

import React from "react";

interface HighlightedWord {
  word: string;
  score: number;
}

interface ThreatResult {
  threatType: string;
  riskLevel: "None" | "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  explanations: HighlightedWord[]; // ← now carries full {word, score} objects
  recommendation: string;
}

export default function ExplainabilityCard({ result }: { result: ThreatResult }) {
  const getAlertStyles = (level: string) => {
    if (level === "Critical" || level === "High") {
      return {
        wrapper: "border-red-500/50 bg-red-950/20",
        header: "border-red-500/50 bg-red-500/10 text-red-400",
        scoreBar: "bg-red-500",
        icon: "🔴",
      };
    }
    if (level === "None" || level === "Safe") {
      return {
        wrapper: "border-green-500/50 bg-green-950/20",
        header: "border-green-500/50 bg-green-500/10 text-green-400",
        scoreBar: "bg-green-500",
        icon: "🟢",
      };
    }
    // Low / Medium → white
    return {
      wrapper: "border-white/20 bg-white/5",
      header: "border-white/20 bg-white/10 text-white",
      scoreBar: "bg-white",
      icon: "⚪",
    };
  };

  const styles = getAlertStyles(result.riskLevel);

  // Sort descending by score so highest-influence words appear first
  const sortedExplanations = [...result.explanations].sort((a, b) => b.score - a.score);

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
          <div className="text-xl font-bold uppercase tracking-wider">{result.riskLevel}</div>
        </div>
      </div>

      {/* Diagnostic Body */}
      <div className="p-6 text-gray-300">
        
        {/* Flagged Indicators */}
        <h4 className="text-sm font-mono uppercase tracking-widest text-gray-400 mb-4 border-b border-white/10 pb-2">
          Diagnostic Logs // Why flagged
        </h4>

        {sortedExplanations.length === 0 ? (
          <p className="text-green-400 font-mono text-sm mb-8">
            No suspicious indicators detected in the payload.
          </p>
        ) : (
          <ul className="space-y-3 mb-8 font-mono text-sm">
            {sortedExplanations.map((item, index) => {
              // score is 0–1 from backend; render as a percentage bar
              const pct = Math.round(item.score * 100);
              return (
                <li key={index} className="flex items-center gap-4">
                  {/* Index tag */}
                  <span className="opacity-40 shrink-0 w-8">{`[${String(index + 1).padStart(2, "0")}]`}</span>

                  {/* Word label */}
                  <span className="flex-1 truncate">{item.word}</span>

                  {/* Score bar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${styles.scoreBar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] opacity-50 w-8 text-right">{pct}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Recommendation */}
        <div className="bg-black/40 border border-white/10 p-4 rounded-md">
          <h4 className="text-xs font-mono uppercase text-gray-400 mb-2">Recommended Action</h4>
          <p className="text-sm text-gray-200">{result.recommendation}</p>
        </div>
      </div>
    </div>
  );
}