"use client";

import React, { useState } from "react";
import ExplainabilityCard from "@/components/ExplainabilityCard";
import DashboardNav from "@/components/DashboardNav";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { analyzeUrl, ThreatResult } from "@/lib/api";

export default function UrlScanner() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ThreatResult | null>(null);
  const { theme, toggleTheme, themeStyle } = useTheme();
  const { t } = useLanguage();

  const handleScan = async () => {
    if (!url.trim()) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const res = await analyzeUrl(url);
      setResult(res);
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
    setUrl("");
    setResult(null);
  };

  let parsedProtocol = "AWAITING";
  let domainLength = 0;
  try {
    if (url) {
      const parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
      parsedProtocol = parsedUrl.protocol.replace(":", "").toUpperCase();
      domainLength = parsedUrl.hostname.length;
    }
  } catch {
    parsedProtocol = "INVALID";
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center"
      style={themeStyle}
    >
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
        @keyframes scan-sweep-horizontal {
          0% { left: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 110%; opacity: 0; }
        }
        .cyber-scanner-x {
          animation: scan-sweep-horizontal 2s ease-in-out infinite;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.9), transparent);
          box-shadow: 0 0 15px rgba(255,255,255,0.5);
        }
      `}} />

      <div className="absolute inset-0 bg-grid-animated pointer-events-none w-full h-full"></div>

      <DashboardNav />

      <div className="max-w-5xl w-full px-4 md:px-8 lg:px-12 relative z-10 mx-auto">

        <div className="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer font-mono text-xs uppercase tracking-widest focus:outline-none"
          >
            {theme === "dark" ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> LIGHT</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> DARK</>
            )}
          </button>
        </div>

        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-2">
            {t("us.title") || "Domain "} <span className="font-bold">{t("us.title2") || "Scanner"}</span>
          </h1>
          <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest border-l-2 border-white/20 pl-3">
            {t("us.subtitle") || "Module // Network Intelligence & URL Inspection"}
          </p>
        </header>

        <div className="bg-neutral-900/40 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl overflow-hidden">

          <div className="bg-neutral-950 px-4 py-3 border-b border-white/10 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              {t("us.sandbox") || "URL_Inspection_Sandbox"}
            </div>
          </div>

          <div className="p-1">
            <div className="relative bg-black rounded-lg overflow-hidden border border-transparent focus-within:border-white/20 transition-all duration-300">

              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-[2px]">
                  <div className="text-white font-mono text-sm uppercase tracking-widest mb-3 animate-pulse">
                    {t("us.tracing") || "Tracing Domain Records..."}
                  </div>
                </div>
              )}

              <div className="flex items-center py-6 px-4 md:px-8">
                <span className="text-neutral-600 font-mono mr-4 text-xl">{">"}</span>
                <input
                  id="target-url"
                  type="text"
                  className="w-full bg-transparent text-neutral-200 font-mono text-lg md:text-xl placeholder-neutral-700 outline-none relative z-10 tracking-wide"
                  placeholder={t("us.placeholder") || "https://suspicious-link.com/login"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    e.preventDefault();
                    setUrl(pasted.trim());
                  }}
                  disabled={isAnalyzing}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {isAnalyzing && (
                <div className="absolute top-0 h-full w-[2px] cyber-scanner-x z-30 pointer-events-none"></div>
              )}

              <div className="bg-neutral-950/80 px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-mono text-neutral-500 uppercase border-t border-white/5">
                <div className="flex gap-4 md:gap-8">
                  <span>{t("us.protocol") || "Protocol: "} {parsedProtocol}</span>
                  <span className={parsedProtocol === "HTTP" ? "text-red-400" : ""}>
                    {parsedProtocol === "HTTP"
                      ? t("us.insecure") || "INSECURE"
                      : t("us.secure") || "SECURE"}
                  </span>
                </div>
                <div className="flex gap-4 md:gap-8">
                  <span>{t("us.domainLen") || "Domain_Len: "} {url ? domainLength : 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-950 p-4 md:px-6 md:py-5 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <button
              onClick={clearInput}
              disabled={isAnalyzing || !url}
              className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition disabled:opacity-30 w-full md:w-auto text-left md:text-center"
            >
              {t("us.clear") || "[ Clear Target ]"}
            </button>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={handleScan}
                disabled={isAnalyzing || !url}
                className="flex-1 md:flex-none px-8 py-3 text-xs md:text-sm font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isAnalyzing
                  ? t("us.processing") || "Processing"
                  : t("us.inspect") || "Inspect URL"}
              </button>
            </div>
          </div>
        </div>

        <div className={`transition-all duration-700 ease-out origin-top ${result ? "opacity-100 scale-y-100 translate-y-0 mt-8" : "opacity-0 scale-y-95 translate-y-4 pointer-events-none h-0"}`}>
          {result && (
            <div className="relative">
              <div className="absolute -top-8 left-8 w-px h-8 bg-gradient-to-b from-white/20 to-transparent"></div>

              {result.resolvedUrl && result.originalUrl !== result.resolvedUrl && (
                <div className="mb-3 px-4 py-2 rounded-md bg-white/5 border border-white/10 font-mono text-xs text-neutral-400 flex flex-col gap-1">
                  <span>
                    <span className="text-neutral-600 mr-2">ORIGINAL</span>
                    {result.originalUrl}
                  </span>
                  <span>
                    <span className="text-neutral-600 mr-2">RESOLVED</span>
                    <span className="text-yellow-400">{result.resolvedUrl}</span>
                  </span>
                </div>
              )}

              <ExplainabilityCard result={result} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
