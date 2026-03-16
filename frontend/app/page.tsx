"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import LanguageSelector from "@/components/LanguageSelector";

// 1. Defined product features tailored for the abhedya.sec platform
const FEATURES = [
  { id: 1, title: 'Text Payload Inspection', description: 'Deep analysis of raw text, SMS comms, and email bodies for social engineering or prompt injection patterns.', icon: '📧' },
  { id: 2, title: 'URL Reputation Scanner', description: 'Heuristic analysis of domains for typosquatting, zero-day phishing, or embedded malware redirects.', icon: '🔗' },
  { id: 3, title: 'Deepfake Media Detection', description: 'Spectral audio forensic and frame-by-frame pixel analysis to identify AI synthetic generation.', icon: '🎭' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme, themeStyle } = useTheme();
  const { t } = useLanguage();

  // Handle navbar blur effect on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div 
      className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-cyan-900 selection:text-white relative overflow-hidden flex flex-col items-center pb-20"
      style={themeStyle}
    >

      {/* 2. Advanced Cybersecurity Background Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
        @keyframes auraRed {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes auraBlue {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        /* 3D LOGO KEYFRAMES */
        @keyframes gyro1 {
          0% { transform: rotateX(60deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(60deg) rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes gyro2 {
          0% { transform: rotateX(120deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(120deg) rotateY(-360deg) rotateZ(-360deg); }
        }

        /* ACTIVE CYBER RADAR KEYFRAMES */
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2); opacity: 0; }
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
          position: absolute; width: 6px; height: 6px;
          background: rgba(6, 182, 212, 0.4); border-radius: 50%;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
          pointer-events: none; animation: nodeFloat 10s ease-in-out infinite;
        }
        
        /* RADAR SCANNER STYLES */
        .radar-container {
          position: absolute; top: 20%; left: 50%;
          transform: translate(-50%, -50%);
          width: 800px; height: 800px;
          pointer-events: none; z-index: 0;
          opacity: 0.15;
        }
        .radar-sweep {
          position: absolute; inset: 0; border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 70%, rgba(6, 182, 212, 0.8) 100%);
          animation: radar-spin 4s linear infinite;
        }
        .radar-grid {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1px solid rgba(6, 182, 212, 0.5);
          background-image: 
            linear-gradient(to right, transparent 49.5%, rgba(6, 182, 212, 0.5) 49.5%, rgba(6, 182, 212, 0.5) 50.5%, transparent 50.5%),
            linear-gradient(to bottom, transparent 49.5%, rgba(6, 182, 212, 0.5) 49.5%, rgba(6, 182, 212, 0.5) 50.5%, transparent 50.5%);
        }
        .radar-ring {
          position: absolute; top: 50%; left: 50%;
          width: 100%; height: 100%;
          transform: translate(-50%, -50%);
          border-radius: 50%; border: 1px solid rgba(6, 182, 212, 0.5);
        }
        .radar-ring:nth-child(1) { width: 33%; height: 33%; }
        .radar-ring:nth-child(2) { width: 66%; height: 66%; }
        .radar-pulse {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(239, 68, 68, 0.8);
          animation: pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
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

      {/* ANIMATED SECURITY RADAR BACKGROUND */}
      <div className="radar-container">
        <div className="radar-grid"></div>
        <div className="radar-ring"></div>
        <div className="radar-ring"></div>
        <div className="radar-sweep"></div>
        <div className="radar-pulse"></div>
      </div>

      {/* TOP NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-neutral-950/80 backdrop-blur-md border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">

          {/* 3D Chatbot AI Core Logo */}
          <Link href="/" className="flex items-center gap-4 group cursor-pointer">
            <div className="relative w-10 h-10 flex items-center justify-center perspective-[1000px]">
              <div className="absolute w-full h-full rounded-full border-t-2 border-r-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.5)] group-hover:border-cyan-300 transition-all duration-300" style={{ animation: 'gyro1 5s linear infinite' }}></div>
              <div className="absolute w-full h-full rounded-full border-b-2 border-l-2 border-blue-600/80 shadow-[0_0_15px_rgba(37,99,235,0.5)] group-hover:border-blue-400 transition-all duration-300" style={{ animation: 'gyro2 7s linear infinite' }}></div>
              <div className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-white shadow-[0_0_20px_rgba(255,255,255,0.9)] core-pulse group-hover:scale-125 transition-transform duration-300 flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-white rounded-full blur-[1px]"></div>
              </div>
            </div>
            <span className="text-2xl font-light tracking-widest text-white uppercase group-hover:text-cyan-50 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              abhedya<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">.sec</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-mono uppercase tracking-widest text-neutral-400 md:ml-12 lg:ml-24">
            <button onClick={toggleTheme} className="hover:text-white transition flex items-center gap-2 cursor-pointer focus:outline-none">
              {theme === 'dark' ? (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> LIGHT</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> DARK</>
              )}
            </button>
            <Link href="#engine" className="hover:text-white transition">{t('nav.engine')}</Link>
            <Link href="#awareness" className="hover:text-white transition">Awareness</Link>
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

        {/* CYBERSECURITY AWARENESS IMAGE SECTION */}
        <section id="awareness" className="mb-24 w-full relative">
          <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 md:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Tactical Intel brief
                </div>
                <h2 className="text-3xl md:text-4xl font-light text-white leading-tight">
                  You Are The <br/><span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Human Firewall.</span>
                </h2>
                <p className="text-neutral-400 text-sm leading-relaxed font-mono">
                  Over 90% of all cyber breaches start with human error. No amount of encryption can protect a system if a user unknowingly grants access through a malicious link.
                </p>
                <ul className="space-y-3 font-mono text-xs text-neutral-300 mt-4">
                  <li className="flex items-center gap-3"><span className="text-cyan-400">›</span> Verify sender domains meticulously.</li>
                  <li className="flex items-center gap-3"><span className="text-cyan-400">›</span> Beware of false urgency or panic.</li>
                  <li className="flex items-center gap-3"><span className="text-cyan-400">›</span> Report suspicious links instantly.</li>
                </ul>
              </div>

              <div className="flex-1 w-full relative group">
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-500/50 z-10"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-500/50 z-10"></div>
                <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-500/50 z-10"></div>
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-500/50 z-10"></div>

                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-neutral-900 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                  {/* Genuine Tactical Cybersecurity Image */}
                  <img 
                    src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000" 
                    alt="Cyber Defense Intelligence" 
                    className="w-full h-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                  />
                  {/* Subtle Scanline Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. PLATFORM CORE CAPABILITIES SECTION */}
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