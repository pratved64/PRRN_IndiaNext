"use client";

import React, { useState } from "react";
import ExplainabilityCard from "@/components/ExplainabilityCard";
import DashboardNav from "@/components/DashboardNav";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { analyzePhishingText, ThreatResult } from "@/lib/api";

export default function PhishingAnalyzer() {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ThreatResult | null>(null);
  const { theme, toggleTheme, themeStyle } = useTheme();
  const { t } = useLanguage();
  
  const handleAnalyze = async (scenario: "threat" | "safe" = "threat") => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      if (scenario === "safe") {
        // Since backend requires actual text, we can still do a mock or just send safe text
        // But the prompt wants actual backend calls. We'll send the input text to the backend.
        const res = await analyzePhishingText(inputText);
        // If the user clicked "Simulate Safe" we might just want to show a safe result regardless, 
        // to maintain the UI feature, or we can just run it against the backend. 
        // We will run it against the backend for authenticity.
        setResult(res);
      } else {
        const res = await analyzePhishingText(inputText);
        setResult(res);
      }
    } catch (error: unknown) {
      console.error(error);
      setResult({
        threatType: "Analysis Error",
        riskLevel: "None",
        confidence: 0,
        explanations: [
          error instanceof Error ? error.message : "Failed to connect to the backend",
        ],
        recommendation: "Please try again later.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearInput = () => {
    setInputText("");
    setResult(null);
  };

  // Calculate mock payload metrics
  const byteSize = new Blob([inputText]).size;
  const lineCount = inputText.split(/\r\n|\r|\n/).length;

  return (
    <div 
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center"
      style={themeStyle}
    >
      
      {/* Dynamic CSS for Background & Lasers */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drift {
          from { background-position: 0 0; }
          to { background-position: -40px -40px; }
        }
        .bg-grid-animated {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          animation: drift 20s linear infinite;
        }
        @keyframes scan-sweep {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        .cyber-scanner {
          animation: scan-sweep 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.9), transparent);
          box-shadow: 0 0 15px rgba(255,255,255,0.5);
        }
      `}} />

      {/* Animated Subtle Grid */}
      <div className="absolute inset-0 bg-grid-animated pointer-events-none w-full h-full"></div>

      <DashboardNav />

      {/* Main Content Container */}
      <div className="max-w-5xl w-full px-4 md:px-8 lg:px-12 relative z-10 mx-auto">

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
        
        {/* Header Title */}
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-2">
            {t('ts.title') || "Threat "} <span className="font-bold">{t('ts.title2') || "Analyzer"}</span>
          </h1>
          <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest border-l-2 border-white/20 pl-3">
            {t('ts.subtitle') || "Module // Text & Payload Inspection Engine"}
          </p>
        </header>

        {/* Primary Input Console */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl overflow-hidden">
          
          {/* Console Top Bar */}
          <div className="bg-neutral-950 px-4 py-3 border-b border-white/10 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              {t('ts.sandbox') || "Secure_Sandbox_Environment"}
            </div>
          </div>

          <div className="p-1">
            <div className="relative bg-black rounded-lg overflow-hidden border border-transparent focus-within:border-white/20 transition-all duration-300 group">
              
              {/* Overlay while analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center backdrop-blur-[2px]">
                  <div className="text-white font-mono text-sm uppercase tracking-widest mb-4 animate-pulse">
                    {t('ts.running') || "Running Heuristic Analysis..."}
                  </div>
                  {/* Progress Bar Mock */}
                  <div className="w-48 h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-full origin-left animate-[scale-x_2.5s_ease-in-out_infinite]"></div>
                  </div>
                </div>
              )}

              <textarea
                id="payload"
                rows={8}
                className="w-full p-6 bg-transparent text-neutral-300 font-mono text-sm placeholder-neutral-700 outline-none resize-y relative z-10 leading-relaxed"
                placeholder={t('ts.placeholder') || "[ INITIALIZE INPUT ] \n> Paste suspicious email headers, raw SMS text, or malicious code blocks here..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isAnalyzing}
              />
              
              {/* Laser Scanner Line */}
              {isAnalyzing && (
                <div className="absolute left-0 w-full h-[2px] cyber-scanner z-30 pointer-events-none"></div>
              )}

              {/* Console Bottom Status Bar */}
              <div className="bg-neutral-950/80 px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-mono text-neutral-500 uppercase border-t border-white/5">
                <div className="flex gap-4 md:gap-8">
                  <span>{t('ts.type') || "Type: RAW_TEXT"}</span>
                  <span>{t('ts.enc') || "Enc: UTF-8"}</span>
                </div>
                <div className="flex gap-4 md:gap-8">
                  <span>{t('ts.ln') || "Ln: "} {inputText ? lineCount : 0}</span>
                  <span>{t('ts.size') || "Size: "} {byteSize} Bytes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="bg-neutral-950 p-4 md:px-6 md:py-5 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <button
              onClick={clearInput}
              disabled={isAnalyzing || !inputText}
              className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition disabled:opacity-30 w-full md:w-auto text-left md:text-center"
            >
              {t('ts.clear') || "[ Clear Payload ]"}
            </button>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => handleAnalyze("safe")}
                disabled={isAnalyzing || !inputText}
                className="flex-1 md:flex-none px-6 py-3 text-xs md:text-sm font-mono uppercase tracking-widest text-neutral-400 border border-white/10 rounded hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('ts.simSafe') || "Simulate Safe"}
              </button>

              <button
                onClick={() => handleAnalyze("threat")}
                disabled={isAnalyzing || !inputText}
                className="flex-1 md:flex-none px-8 py-3 text-xs md:text-sm font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (t('ts.processing') || "Processing") : (t('ts.execute') || "Execute Scan")}
              </button>
            </div>
          </div>
        </div>

        {/* Results / Explainability Engine Output */}
        <div className={`transition-all duration-700 ease-out origin-top ${result ? 'opacity-100 scale-y-100 translate-y-0 mt-8' : 'opacity-0 scale-y-95 translate-y-4 pointer-events-none h-0'}`}>
          {result && (
            <div className="relative">
              {/* Little connection line to tie the UI together */}
              <div className="absolute -top-8 left-8 w-px h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
              <ExplainabilityCard result={result} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
