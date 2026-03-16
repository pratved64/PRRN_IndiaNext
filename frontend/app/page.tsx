"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";

// 1. Defined product features tailored for the abhedya.sec platform
const FEATURES = [
  { id: 1, title: 'Text Payload Inspection', description: 'Deep analysis of raw text, SMS comms, and email bodies for social engineering or prompt injection patterns.', icon: '📧' },
  { id: 2, title: 'URL Reputation Scanner', description: 'Heuristic analysis of domains for typosquatting, zero-day phishing, or embedded malware redirects.', icon: '🔗' },
  { id: 3, title: 'Deepfake Media Detection', description: 'Spectral audio forensic and frame-by-frame pixel analysis to identify AI synthetic generation.', icon: '🎭' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();

  // Handle navbar blur effect on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-cyan-900 selection:text-white relative overflow-hidden flex flex-col items-center pb-20">
      
      {/* 2. Advanced Cybersecurity Background Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drift {
          from { background-position: 0 0; }
          to { background-position: -40px -40px; }
        }
        @keyframes binaryRain {
          0% { background-position: 0 -100px; }
          100% { background-position: 0 600px; }
        }
        @keyframes nodeFloat {
          0%, 100% { transform: translate(0, 0); opacity: 0.1; }
          50% { transform: translate(30px, -30px); opacity: 0.3; }
        }
        .bg-grid-animated {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          animation: drift 20s linear infinite;
        }
        .binary-rain {
          position: absolute; inset: 0;
          color: rgba(6, 182, 212, 0.08); font-family: monospace; font-size: 10px; line-height: 10px;
          word-break: break-all; pointer-events: none;
          animation: binaryRain 40s linear infinite;
        }
        .network-node {
          position: absolute; width: 6px; h-6;
          background: rgba(6, 182, 212, 0.4); border-radius: 50%;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
          pointer-events: none; animation: nodeFloat 10s ease-in-out infinite;
        }
      `}} />

      {/* Background Layers */}
      <div className="absolute inset-0 bg-grid-animated pointer-events-none w-full h-full"></div>
      <div className="binary-rain pointer-events-none">{'0 1 1 0 1 0 0 1 0 1 1 0 1 1 0 '.repeat(300)}</div>
      
      {/* Floating Nodes for depth */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="network-node pointer-events-none" style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          animationDelay: `${i * 1.8}s`,
          transform: `scale(${0.5 + Math.random()})`
        }}></div>
      ))}

      {/* TOP NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-neutral-950/80 backdrop-blur-md border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-4 h-4 bg-white rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.5)] group-hover:shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-shadow"></div>
            <span className="text-xl font-light tracking-widest text-white uppercase group-hover:text-neutral-300 transition-colors">
              abhedya<span className="font-bold">.sec</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-mono uppercase tracking-widest text-neutral-400">
            <Link href="#features" className="hover:text-white transition">{t('nav.platform')}</Link>
            <Link href="#engine" className="hover:text-white transition">{t('nav.engine')}</Link>
            <Link href="#integration" className="hover:text-white transition">{t('nav.integration')}</Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4 items-center">
            <LanguageSelector />
            <Link href="/cyber-help" className="hidden lg:flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500/20 transition group shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              {t('nav.cyberHelp')}
            </Link>
            <Link href="/login" className="hidden md:flex px-5 py-2 text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition items-center">
              {t('nav.login')}
            </Link>
            <Link href="/signup" className="hidden md:flex px-5 py-2 text-xs font-mono uppercase tracking-widest text-neutral-300 border border-white/10 rounded hover:bg-white/5 transition items-center">
              {t('nav.signup')}
            </Link>
            <Link href="/phishing" className="px-6 py-2 text-xs font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 transition">
              {t('nav.launch')}
            </Link>
          </div>
        </div>
      </nav>

      {/* MAIN HERO SECTION */}
      <main className="relative z-10 pt-40 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full">
        
        <div className="text-center max-w-4xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-mono text-cyan-400 uppercase tracking-widest mb-6 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.6)]"></span>
            {t('hero.badge')}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-6 leading-tight">
            {t('hero.title1')} <br />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-400 to-neutral-600">
              {t('hero.title2')}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 font-mono font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            {t('hero.subtitle')}
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 pt-6">
            <Link href="/phishing" className="px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center gap-3">
              <span className="text-lg">🛠️</span>
              {t('hero.btn.scan')}
            </Link>
            <Link href="/cyber-help" className="px-8 py-4 text-sm font-mono font-bold uppercase tracking-widest text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 rounded shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all flex items-center justify-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
              </span>
              {t('hero.btn.help')}
            </Link>
          </div>
        </div>

        {/* 3. PLATFORM CORE CAPABILITIES SECTION (Replaces old Dashboard Data) */}
        <section id="features" className="mb-24 space-y-12 w-full relative">
          <header className="border-b border-white/10 pb-6 text-center md:text-left">
            <h2 className="text-sm font-mono uppercase text-neutral-400 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,1)]"></span>
              {t('feat.header')}
            </h2>
          </header>
          
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div key={feat.id} className="bg-neutral-900/40 border border-white/5 p-8 rounded-xl backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/30 hover:bg-neutral-900 group">
                <div className="w-14 h-14 bg-black border border-white/10 rounded-lg flex items-center justify-center text-3xl mb-8 group-hover:border-cyan-500/50 group-hover:text-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">{feat.icon}</div>
                <h3 className="text-lg font-bold text-white mb-3 uppercase tracking-wider">{t(`feat.${feat.id}.title`)}</h3>
                <p className="text-neutral-400 font-mono text-sm leading-relaxed">{t(`feat.${feat.id}.desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. THE AI EXPLAINABILITY ENGINE SECTION */}
        <section id="engine" className="mb-24 grid md:grid-cols-5 gap-12 items-center">
          <div className="md:col-span-2 space-y-6">
            <label className="text-xs font-mono uppercase text-cyan-400 tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                {t('eng.label')}
            </label>
            <h3 className="text-4xl font-light text-white leading-tight uppercase">{t('eng.title1')}<br /><span className="font-bold">{t('eng.title2')}</span></h3>
            <p className="text-neutral-400 font-mono text-sm leading-relaxed">{t('eng.desc')}</p>
          </div>

          {/* Code/Sandbox Aesthetic */}
          <div className="md:col-span-3 bg-neutral-900 border border-white/10 rounded-lg p-1 transition hover:border-cyan-500/20 shadow-inner">
            <div className="bg-neutral-950 rounded md p-6 font-mono text-[11px] md:text-xs text-neutral-500 space-y-3 leading-loose">
              <p className="text-cyan-400">{`[09:21:04] PHISHING_ENGINE_ANALYSIS :: payload=email001`}</p>
              <p>{`[09:21:05] Module: Tone_Analyzer_Urgency //Detecting_Hindi_Window_Detected`}</p>
              <p className="text-white bg-red-950/20 p-2 border border-red-500/30 rounded">{`[Flag] कृत्रिम_वर्किंग_विंडो_Detected :: artificially creating urgency with 24-hour window.`}</p>
              <p>{`[09:21:05] Module: Domain_ mismatch_Analyzer`}</p>
              <p className="text-white bg-red-950/20 p-2 border border-red-500/30 rounded">{`[Flag] Mimic Detected :: reply-to address 'admin@paypal-support-web.com' is not verified domain.`}</p>
              <p className="text-red-400 text-sm font-bold">{`[RESULT] FLAG_CRITICAL. AUTOMATED_QUARANTINE.`}</p>
            </div>
          </div>
        </section>

        {/* 5. ECOSYSTEM INTEGRATION SECTION */}
        <section id="integration">
          <header className="mb-12 border-b border-white/10 pb-6 text-center">
            <h2 className="text-sm font-mono uppercase text-neutral-400 tracking-widest flex items-center gap-2 justify-center">
              {t('int.header')}
            </h2>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['SIEM', 'SOAR', 'EAP', 'IDP'].map((tool) => (
              <div key={tool} className="bg-neutral-900 border border-white/5 p-6 rounded-md text-center text-neutral-400 font-mono text-sm tracking-widest uppercase hover:text-white hover:border-cyan-500/20 transition group">
                {tool} <span className="text-cyan-400 group-hover:shadow-[0_0_10px_rgba(6,182,212,1)]">•</span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}