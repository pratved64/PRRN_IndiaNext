"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    // Simulate login
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 p-4 md:p-8 flex flex-col justify-center items-center font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden">
      
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

      {/* Main Login Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition">
            <div className="w-4 h-4 bg-white rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            <span className="text-xl font-light tracking-widest text-white uppercase">
              Threat<span className="font-bold">Analyzer</span>
            </span>
          </Link>
          <h1 className="text-3xl font-light text-white tracking-tight">Access <span className="font-bold">Terminal</span></h1>
          <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mt-2 border-b border-white/10 pb-4 inline-block px-8">
            Secure Node Authentication
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl p-6 md:p-8 relative">
          
          {/* Top decorative bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-30"></div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">Operator ID [Email]</label>
              <input
                type="email"
                required
                className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white font-mono placeholder-neutral-700 outline-none focus:border-white/30 transition shadow-inner"
                placeholder="operator@threat-analyzer.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono uppercase tracking-widest text-neutral-400">Passkey</label>
                <Link href="#" className="text-[10px] font-mono uppercase text-neutral-500 hover:text-white transition">Reset Key?</Link>
              </div>
              <input
                type="password"
                required
                className="w-full bg-black/50 border border-white/10 rounded px-4 py-3 text-white font-mono placeholder-neutral-700 outline-none focus:border-white/30 transition shadow-inner"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className={`w-full py-4 text-sm font-mono font-bold uppercase tracking-widest rounded transition-all flex justify-center items-center gap-2
                ${isAuthenticating 
                  ? 'bg-neutral-800 text-neutral-400 cursor-wait' 
                  : 'bg-white text-black hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]'}`}
            >
              {isAuthenticating ? (
                <>
                  <span className="w-3 h-3 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
                  Authenticating...
                </>
              ) : (
                "Initialize Session"
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs font-mono text-neutral-500">
            No active profile?{" "}
            <Link href="/signup" className="text-white hover:text-green-400 uppercase tracking-wider ml-1 transition">
              Request Access
            </Link>
          </div>
        </div>
        
        {/* System Status */}
        <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-mono uppercase text-neutral-600 tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
          Gateway: Operational &middot; Enc: AES-256
        </div>
      </div>
    </div>
  );
}
