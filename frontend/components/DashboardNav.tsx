"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";

export default function DashboardNav() {
  const [sessionId] = useState(() => `SYS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const pathname = usePathname();
  const { t } = useLanguage();

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
          <Link href="/" className="flex items-center gap-4 group cursor-pointer mb-2">
            <div className="relative w-10 h-10 flex items-center justify-center perspective-[1000px]">
              {/* Outer 3D Gyroscope Ring 1 */}
              <div 
                className="absolute w-full h-full rounded-full border-t-2 border-r-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:border-cyan-300 group-hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300" 
                style={{ animation: 'gyro1 5s linear infinite' }}>
              </div>
              {/* Outer 3D Gyroscope Ring 2 */}
              <div 
                className="absolute w-full h-full rounded-full border-b-2 border-l-2 border-blue-600/80 shadow-[0_0_15px_rgba(37,99,235,0.5)] group-hover:border-blue-400 transition-all duration-300" 
                style={{ animation: 'gyro2 7s linear infinite' }}>
              </div>
              {/* Inner Glowing AI Pupil / Core */}
              <div className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-white shadow-[0_0_20px_rgba(255,255,255,0.9)] core-pulse group-hover:scale-125 transition-transform duration-300 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-white rounded-full blur-[1px]"></div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-light tracking-widest text-white uppercase group-hover:text-cyan-50 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] m-0 leading-none">
              abhedya<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">.sec</span>
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
