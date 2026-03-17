"use client";

import React, { useState, useEffect } from "react";
import DashboardNav from "@/components/DashboardNav";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";

const LOCATION_CONTEXT = "Kandivali West, Mumbai, Maharashtra";

const CYBER_SERVICES = [
  {
    "id": "CS001",
    "name": "CyberSafe Solutions",
    "type": "IT Security Consulting",
    "address": "Office 402, Atlantis Building, Mahavir Nagar, Kandivali West, Mumbai 400067",
    "phone": "+91-98765-43210",
    "email": "contact@cybersafesolutions.in",
    "website": "www.cybersafesolutions.in",
    "rating": 4.8,
    "distance_km": 0.5,
    "emergency_support": true
  },
  {
    "id": "CS002",
    "name": "Kandivali Cyber Crime Investigation Cell",
    "type": "Government/Police",
    "address": "Kandivali Police Station Compound, S.V. Road, Kandivali West, Mumbai 400067",
    "phone": "+91-22-2863-1234",
    "email": "cybercell.kandivali@mahapolice.gov.in",
    "website": "www.mumbaipolice.gov.in/cyber",
    "rating": 4.1,
    "distance_km": 1.2,
    "emergency_support": true
  },
  {
    "id": "CS003",
    "name": "SecureNet Forensics",
    "type": "Digital Forensics & Recovery",
    "address": "Unit 15, Charkop Industrial Estate, Sector 7, Kandivali West, Mumbai 400067",
    "phone": "+91-99887-76655",
    "email": "info@securenetforensics.com",
    "website": "www.securenetforensics.com",
    "rating": 4.6,
    "distance_km": 2.1,
    "emergency_support": false
  },
  {
    "id": "CS004",
    "name": "DefendIT Tech Services",
    "type": "Cybersecurity Helpdesk",
    "address": "Shop 12, Link Road Plaza, New Link Road, Kandivali West, Mumbai 400067",
    "phone": "+91-91234-56789",
    "email": "support@defendit.co.in",
    "website": "www.defendit.co.in",
    "rating": 4.4,
    "distance_km": 0.8,
    "emergency_support": true
  },
  {
    "id": "CS005",
    "name": "Mumbai Cyber Defence Clinic",
    "type": "NGO / Citizen Help Center",
    "address": "Ground Floor, Poisar Gymkhana Marg, Near Poisar Depot, Kandivali West, Mumbai 400067",
    "phone": "+91-22-2805-9999",
    "email": "help@mumbaicyberclinic.org",
    "website": "www.mumbaicyberclinic.org",
    "rating": 4.9,
    "distance_km": 1.5,
    "emergency_support": false
  },
  {
    "id": "CS006",
    "name": "ZeroTrust Consultants",
    "type": "Corporate Security",
    "address": "B-Wing, 7th Floor, Evershine Millennium Paradise, Thakur Village, Kandivali East, Mumbai 400101",
    "phone": "+91-90001-20003",
    "email": "consult@zerotrustmumbai.in",
    "website": "www.zerotrustmumbai.in",
    "rating": 4.7,
    "distance_km": 3.4,
    "emergency_support": false
  },
  {
    "id": "CS007",
    "name": "HackPrevent Experts",
    "type": "Personal Cyber Help & Audit",
    "address": "203, Ganesh Tower, Dahanukar Wadi, Kandivali West, Mumbai 400067",
    "phone": "+91-98700-11223",
    "email": "audit@hackprevent.com",
    "website": "www.hackprevent.com",
    "rating": 4.3,
    "distance_km": 0.9,
    "emergency_support": false
  },
  {
    "id": "CS008",
    "name": "Sentinel Web Security",
    "type": "Web & App Security",
    "address": "Office 11, Shankar Lane, Orlem, Malad West (Near Kandivali Border), Mumbai 400064",
    "phone": "+91-88990-09988",
    "email": "hello@sentinelweb.in",
    "website": "www.sentinelweb.in",
    "rating": 4.5,
    "distance_km": 2.8,
    "emergency_support": false
  },
  {
    "id": "CS009",
    "name": "Cyber Rescue Hub",
    "type": "Emergency Incident Response",
    "address": "Shop No 4, Raghuleela Mall Complex, Behind Poisar Depot, Kandivali West, Mumbai 400067",
    "phone": "+91-97654-32109",
    "email": "sos@cyberrescuehub.in",
    "website": "www.cyberrescuehub.in",
    "rating": 4.9,
    "distance_km": 1.1,
    "emergency_support": true
  },
  {
    "id": "CS010",
    "name": "IronWall Network Security",
    "type": "Network & Cloud Security",
    "address": "1st Floor, Jai Hind Building, Irani Wadi, Kandivali West, Mumbai 400067",
    "phone": "+91-99223-34455",
    "email": "admin@ironwallnet.com",
    "website": "www.ironwallnet.com",
    "rating": 4.2,
    "distance_km": 1.4,
    "emergency_support": false
  }
];

export default function CyberHelp() {
  const [isLocating, setIsLocating] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const { theme, toggleTheme, themeStyle } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    // Simulate geolocation API lookup delay to build tension/engagement
    const timer1 = setTimeout(() => {
      setIsLocating(false);
      setShowResults(true);
    }, 3000);

    return () => clearTimeout(timer1);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-red-900 selection:text-white relative overflow-hidden flex flex-col items-center pb-20"
      style={themeStyle}
    >

      {/* Radar Map & Grid CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .bg-grid-cyber {
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(239, 68, 68, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(239, 68, 68, 0.05) 1px, transparent 1px);
        }
        
        .radar {
          width: 300px;
          height: 300px;
          border-radius: 50%;
          border: 1px solid rgba(239, 68, 68, 0.3);
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.1) inset;
        }

        .radar::before, .radar::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(239, 68, 68, 0.2);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .radar::before { width: 200px; height: 200px; }
        .radar::after { width: 100px; height: 100px; }

        .radar-sweep {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 50%;
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.5) 0%, transparent 100%);
          transform-origin: 0% 100%;
          animation: spin 3s linear infinite;
        }

        .radar-crosshair {
          position: absolute;
          background: rgba(239, 68, 68, 0.2);
        }
        .crosshair-v { width: 1px; height: 100%; left: 50%; top: 0; }
        .crosshair-h { width: 100%; height: 1px; top: 50%; left: 0; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .blip {
          background-color: #ef4444;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: absolute;
          box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444;
          animation: fadeBlip 3s ease-in-out infinite;
        }

        @keyframes fadeBlip {
          0% { transform: scale(0); opacity: 0; }
          20% { transform: scale(1.5); opacity: 1; }
          40% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(0.5); opacity: 0; }
        }
      `}} />

      <div className="absolute inset-0 bg-grid-cyber pointer-events-none w-full h-full"></div>

      <DashboardNav />

      {/* Main Content Container */}
      <div className="max-w-6xl w-full px-4 md:px-8 mt-12 relative z-10 mx-auto">

        {/* Theme Toggle Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-red-500/30 bg-red-950/20 text-red-400 hover:text-white hover:bg-red-900/40 transition-all cursor-pointer font-mono text-xs uppercase tracking-widest focus:outline-none shadow-[0_0_10px_rgba(239,68,68,0.1)]"
          >
            {theme === 'dark' ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> LIGHT MODE</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> DARK MODE</>
            )}
          </button>
        </div>

        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-2 uppercase">
            {t('help.title')} <span className="font-bold text-red-500">{t('help.title2')}</span>
          </h1>
          <p className="text-red-400 font-mono text-sm uppercase tracking-widest max-w-2xl mx-auto mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded inline-block">
            {isLocating ? t('help.acquiring') : t('help.location') + LOCATION_CONTEXT}
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">

          {/* Radar Map Sidebar */}
          <div className="w-full lg:w-1/3 flex flex-col items-center">

            <div className="bg-neutral-900 border border-red-500/20 rounded-xl p-8 w-full flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

              {/* Fake Map Radar UI */}
              <div className="radar my-8">
                <div className="radar-crosshair crosshair-v"></div>
                <div className="radar-crosshair crosshair-h"></div>
                <div className="radar-sweep"></div>

                {/* Center User Point */}
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_#fff] z-10"></div>

                {/* Animated Simulated Blips */}
                {showResults && (
                  <>
                    <div className="blip" style={{ top: '30%', left: '40%', animationDelay: '0.2s' }}></div>
                    <div className="blip" style={{ top: '65%', left: '70%', animationDelay: '1.4s' }}></div>
                    <div className="blip" style={{ top: '20%', left: '60%', animationDelay: '0.8s' }}></div>
                    <div className="blip" style={{ top: '80%', left: '30%', animationDelay: '2.1s' }}></div>
                    <div className="blip" style={{ top: '45%', left: '15%', animationDelay: '1.9s' }}></div>
                  </>
                )}
              </div>

              <div className="w-full text-center font-mono text-xs uppercase tracking-widest text-neutral-500 border-t border-red-500/20 pt-4 mt-2">
                {isLocating ? (
                  <span className="text-red-400 animate-pulse">{t('help.scanning')}</span>
                ) : (
                  <span className="text-green-400">{t('help.found').replace("{0}", CYBER_SERVICES.length.toString())}</span>
                )}
              </div>
            </div>

            <div className="w-full bg-red-950/20 border border-red-500/30 rounded-xl p-6 mt-6">
              <h3 className="text-red-400 font-mono font-bold uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                {t('help.disclaimerTitle')}
              </h3>
              <p className="text-neutral-400 text-sm font-light">
                {t('help.disclaimerText')}
              </p>
            </div>
          </div>

          {/* Results List */}
          <div className="w-full lg:w-2/3">
            {isLocating ? (
              // Loading Skeleton
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-neutral-900 border border-white/5 rounded-xl p-6 animate-pulse flex flex-col gap-4">
                    <div className="h-6 bg-white/10 rounded w-1/3"></div>
                    <div className="h-4 bg-white/5 rounded w-1/2"></div>
                    <div className="h-4 bg-white/5 rounded w-1/4 mt-4"></div>
                  </div>
                ))}
              </div>
            ) : (
              // Results Data
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end mb-2 border-b border-red-500/20 pb-2">
                  <h2 className="text-lg font-mono text-white tracking-widest uppercase">{t('help.verified')}</h2>
                  <span className="text-xs font-mono text-neutral-500">{t('help.sorted')}</span>
                </div>

                {CYBER_SERVICES.sort((a, b) => a.distance_km - b.distance_km).map(service => (
                  <div key={service.id} className="bg-neutral-900 border border-white/5 hover:border-red-500/40 hover:bg-neutral-800 transition-all rounded-xl p-6 group relative overflow-hidden">

                    {/* Emergency Flag */}
                    {service.emergency_support && (
                      <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-lg shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                        {t('help.emergency') || "24/7 Emergency"}
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                      <div>
                        <h3 className="text-xl text-white font-medium mb-1 flex items-center gap-2">
                          {service.name}
                        </h3>
                        <p className="text-sm font-mono text-cyan-400 uppercase tracking-widest">{service.type}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="bg-black/50 border border-white/10 px-3 py-1.5 rounded text-sm text-neutral-300 font-mono">
                          ★ {service.rating}
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded text-sm font-mono font-bold shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                          {service.distance_km} KM
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-neutral-400 mb-6 flex items-start gap-2 max-w-2xl">
                      <svg className="w-5 h-5 flex-shrink-0 text-neutral-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {service.address}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-4">
                      <a href={`tel:${service.phone}`} className="flex items-center gap-2 text-sm font-mono text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded transition">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                        {service.phone}
                      </a>

                      <a href={`mailto:${service.email}`} className="flex items-center gap-2 text-sm font-mono text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded transition truncate">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        {service.email.split('@')[0]}@...
                      </a>

                      <a href={`https://${service.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-mono text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded transition truncate">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                        {t('help.website') || "Website"}
                      </a>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}