"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ThemeContext";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clearance, setClearance] = useState("L1");
  const [isRegistering, setIsRegistering] = useState(false);
  const { theme, toggleTheme, themeStyle } = useTheme();
  
  const router = useRouter();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    // Simulate API registration
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  return (
    <div 
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 p-4 md:p-8 flex flex-col justify-center items-center font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden"
      style={themeStyle}
    >
      
      {/* Dynamic CSS for Background Grid */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drift {
          from { background-position: 0 0; }
          to { background-position: -40px -40px; }
        }
        .bg-grid-animated {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          animation: drift 20s linear infinite;
        }
      `}} />

      {/* Animated Subtle Grid */}
      <div className="absolute inset-0 bg-grid-animated pointer-events-none"></div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
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

      {/* Main Signup Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Link href="/" className="flex items-center gap-4 group cursor-pointer mb-6">
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

            <span className="text-2xl font-light tracking-widest text-white uppercase group-hover:text-cyan-50 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
              abhedya<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">.sec</span>
            </span>
          </Link>
          <h1 className="text-3xl font-light text-white tracking-tight">Request <span className="font-bold">Access</span></h1>
          <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mt-2 border-b border-white/10 pb-4 inline-block px-8">
            Provision New Operative
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl p-6 md:p-8 relative">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-30"></div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Operator ID [Email]</label>
              <input
                type="email"
                required
                className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white font-mono placeholder-neutral-700 outline-none focus:border-white/30 transition shadow-inner"
                placeholder="new.operator@threat-analyzer.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Clearance Level Request</label>
              <select 
                title="Clearance"
                className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white font-mono outline-none focus:border-white/30 appearance-none shadow-inner"
                value={clearance}
                onChange={(e) => setClearance(e.target.value)}
              >
                <option value="L1">Level 1 - Read Only Intel</option>
                <option value="L2">Level 2 - Live Scanning Analyst</option>
                <option value="L3">Level 3 - System Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Generate Passkey</label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white font-mono placeholder-neutral-700 outline-none focus:border-white/30 transition shadow-inner"
                placeholder="Assign secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className={`w-full py-4 mt-2 text-sm font-mono font-bold uppercase tracking-widest rounded transition-all flex justify-center items-center gap-2
                ${isRegistering 
                  ? 'bg-neutral-800 text-neutral-400 cursor-wait' 
                  : 'bg-white text-black hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}
            >
              {isRegistering ? (
                <>
                  <span className="w-3 h-3 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
                  Provisioning...
                </>
              ) : (
                "Issue Credentials"
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs font-mono text-neutral-500">
            Already provisioned?{" "}
            <Link href="/login" className="text-white hover:text-green-400 uppercase tracking-wider ml-1 transition">
              Initialize Session
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
