"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";

export default function DashboardNav() {
  const [sessionId, setSessionId] = useState("");
  const pathname = usePathname();
  const { t } = useLanguage();

  useEffect(() => {
    setSessionId(`SYS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  }, []);

  return (
    <div className="max-w-6xl mx-auto relative z-20 pt-8 px-4 md:px-8 lg:px-12">
      {/* Top Telemetry Bar */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10 text-xs font-mono uppercase tracking-widest text-neutral-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {t('dash.allModules')}
          </span>
        </div>
        <div>Session_ID: {sessionId || "CONNECTING..."}</div>
      </div>

      {/* Dashboard Navigation Navbar */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <Link href="/" className="inline-block group">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2 lowercase group-hover:text-neutral-300 transition-colors">
              abhedya<span className="font-bold">.sec</span>
            </h1>
          </Link>
          <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest border-l-2 border-white/20 pl-3">
            {t('dash.overview')}
          </p>
        </div>
        
        {/* Navigation Links */}
        <div className="flex flex-wrap gap-3 items-center">
          <LanguageSelector />
          <Link href="/" className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-black/40 text-neutral-400 border border-white/10 rounded hover:text-white hover:bg-white/5 transition flex items-center justify-center">
            {t('dash.logout')}
          </Link>
          <Link 
            href="/dashboard" 
            className={`px-5 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded transition shadow-sm flex items-center justify-center ${
              pathname === '/dashboard' 
                ? 'bg-neutral-600 text-white border border-neutral-500' 
                : 'bg-black/40 text-neutral-400 border border-white/10 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('dash.home')}
          </Link>
          <Link 
            href="/phishing" 
            className={`px-5 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded transition shadow-sm flex items-center justify-center ${
              pathname === '/phishing' 
                ? 'bg-white text-black hover:bg-neutral-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'bg-black/40 text-neutral-400 border border-white/10 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('dash.textScan')}
          </Link>
          <Link 
            href="/url-scan" 
            className={`px-5 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded transition shadow-sm flex items-center justify-center ${
              pathname === '/url-scan' 
                ? 'bg-white text-black hover:bg-neutral-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                : 'bg-black/40 text-neutral-400 border border-white/10 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('dash.urlScan')}
          </Link>
          <Link 
            href="/deepfake-scan" 
            className={`px-5 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded transition shadow-sm flex items-center justify-center ${
              pathname === '/deepfake-scan' 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 hover:bg-purple-500/30' 
                : 'bg-black/40 text-neutral-400 border border-white/10 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('dash.deepfakeScan')}
          </Link>
          <Link 
            href="/cyber-help" 
            className={`px-5 py-2 text-xs font-mono font-bold uppercase tracking-widest rounded transition shadow-sm flex items-center justify-center ${
              pathname === '/cyber-help' 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'bg-black/40 text-neutral-400 border border-white/10 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('dash.cyberHelp')}
          </Link>
        </div>
      </header>
    </div>
  );
}
