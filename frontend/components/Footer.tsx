"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatIST(d: Date): string {
  // IST = UTC+05:30
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  const ist = new Date(utcMs + 5.5 * 60 * 60_000);
  return `${pad2(ist.getHours())}:${pad2(ist.getMinutes())}:${pad2(ist.getSeconds())}`;
}

export default function Footer(): React.JSX.Element {
  const [clock, setClock] = useState<string>("");
  const [threats, setThreats] = useState<number>(0);

  const counterRafRef = useRef<number | null>(null);
  const counterStartRef = useRef<number | null>(null);

  const tickerMessages = useMemo(
    () => [
      "[ SENTINEL_AI ] OPERATIONAL",
      "·—·",
      "[ PHISHING_ENGINE ] ACCURACY: 94.7%",
      "·—·",
      "[ URL_SCANNER ] LATENCY: 142ms",
      "·—·",
      "[ ANOMALY_DETECTION ] BASELINE: ACTIVE",
      "·—·",
      "[ GROQ_LLM ] NARRATIVE_GEN: READY",
      "·—·",
      "[ AES-256 ] ENCRYPTION: ENABLED",
      "·—·",
      "[ FIREWALL ] 2,847 RULES ACTIVE",
      "·—·",
    ],
    []
  );

  useEffect(() => {
    // Set initial clock on mount
    setClock(`IST // ${formatIST(new Date())}`);
    
    const id = window.setInterval(() => {
      setClock(`IST // ${formatIST(new Date())}`);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const durationMs = 2000;
    const target = 1247;

    const tick = (ts: number) => {
      if (counterStartRef.current == null) counterStartRef.current = ts;
      const elapsed = ts - counterStartRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setThreats(Math.round(easeOut * target));

      if (progress < 1) {
        counterRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    counterRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (counterRafRef.current != null) window.cancelAnimationFrame(counterRafRef.current);
      counterRafRef.current = null;
      counterStartRef.current = null;
    };
  }, []);

  const tickerRow = (
    <div className="flex items-center whitespace-nowrap">
      {tickerMessages.map((m, idx) => (
        <span key={idx} className="mr-5">
          {m}
        </span>
      ))}
    </div>
  );

  return (
    <footer className="w-full bg-neutral-950 text-neutral-200 font-sans border-t border-white/5">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes ticker {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          @keyframes ekg-draw {
            0%   { stroke-dashoffset: 2400; opacity: 0.3; }
            10%  { opacity: 1; }
            90%  { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 0.3; }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes pulse-line {
            0%, 100% { opacity: 1; width: 80px; }
            50% { opacity: 0.4; width: 40px; }
          }
          @keyframes fall {
            from { transform: translateY(-100%); opacity: 0.3; }
            to   { transform: translateY(100%); opacity: 0; }
          }
          `,
        }}
      />

      {/* ZONE 1 — Threat Intelligence Ticker */}
      <div
        className="w-full h-9 flex items-center justify-between overflow-hidden"
        style={{
          background: "rgba(0, 255, 255, 0.02)",
          borderTop: "1px solid rgba(0, 255, 255, 0.08)",
        }}
      >
        <div className="flex-1 overflow-hidden">
          <div
            className="flex items-center"
            style={{
              width: "200%",
              animation: "ticker 35s linear infinite",
            }}
          >
            <div className="flex items-center text-xs font-mono" style={{ color: "rgba(0, 255, 255, 0.5)" }}>
              {tickerRow}
            </div>
            <div className="flex items-center text-xs font-mono" style={{ color: "rgba(0, 255, 255, 0.5)" }}>
              {tickerRow}
            </div>
          </div>
        </div>

        <div className="shrink-0 pr-4 font-mono text-xs text-neutral-600">{clock}</div>
      </div>

      {/* ZONE 2 — EKG Heartbeat Line */}
      <div className="w-full">
        <div className="w-full h-14">
          <svg width="100%" height="56" viewBox="0 0 1200 56" preserveAspectRatio="none" className="block">
            <defs>
              <filter id="ekgBlur" x="-10%" y="-50%" width="120%" height="200%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            <path
              d="M0,28 L60,28 L70,20 L80,28 L90,28 L100,28 L110,4 L120,52 L130,10 L140,28 L150,28 L210,28 L220,20 L230,28 L240,28 L300,28 L360,28 L370,20 L380,28 L390,28 L400,28 L410,4 L420,52 L430,10 L440,28 L450,28 L510,28 L520,20 L530,28 L540,28 L600,28 L660,28 L670,20 L680,28 L690,28 L700,28 L710,4 L720,52 L730,10 L740,28 L750,28 L810,28 L820,20 L830,28 L840,28 L900,28 L960,28 L970,20 L980,28 L990,28 L1000,28 L1010,4 L1020,52 L1030,10 L1040,28 L1050,28 L1110,28 L1120,20 L1130,28 L1140,28 L1200,28"
              stroke="rgba(0,255,255,0.15)"
              strokeWidth="3"
              fill="none"
              filter="url(#ekgBlur)"
              strokeDasharray="2400 2400"
              style={{ animation: "ekg-draw 4s linear infinite" }}
            />
            <path
              d="M0,28 L60,28 L70,20 L80,28 L90,28 L100,28 L110,4 L120,52 L130,10 L140,28 L150,28 L210,28 L220,20 L230,28 L240,28 L300,28 L360,28 L370,20 L380,28 L390,28 L400,28 L410,4 L420,52 L430,10 L440,28 L450,28 L510,28 L520,20 L530,28 L540,28 L600,28 L660,28 L670,20 L680,28 L690,28 L700,28 L710,4 L720,52 L730,10 L740,28 L750,28 L810,28 L820,20 L830,28 L840,28 L900,28 L960,28 L970,20 L980,28 L990,28 L1000,28 L1010,4 L1020,52 L1030,10 L1040,28 L1050,28 L1110,28 L1120,20 L1130,28 L1140,28 L1200,28"
              stroke="rgba(0,255,255,0.6)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="2400 2400"
              style={{ animation: "ekg-draw 4s linear infinite" }}
            />
          </svg>
        </div>

        <div
          className="text-center font-mono text-[10px] text-neutral-800"
          style={{ letterSpacing: "0.3em", marginTop: "-4px" }}
        >
          // SYSTEM PULSE MONITOR //
        </div>
      </div>

      {/* ZONE 3 — Main Footer Body */}
      <div className="px-12 py-16">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 md:gap-28">
            {/* COLUMN 1 */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white rounded-sm" />
                <span className="text-sm text-neutral-200 font-light tracking-widest uppercase">
                  abhedya<strong className="font-semibold">.sec</strong>
                </span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="System Online" />
              </div>

              <p className="mt-4 max-w-60 font-mono text-xs text-neutral-600 leading-relaxed">
                Impenetrable AI-powered defense.
                <br />
                Real-time threat detection.
                <br />
                Zero compromise.
              </p>

              <div className="mt-8 flex flex-col gap-2">
                <div className="font-mono text-[10px] text-neutral-700 uppercase tracking-widest">
                  THREATS NEUTRALIZED TODAY
                </div>

                <div className="text-3xl font-bold font-mono text-cyan-400 tabular-nums">{threats}</div>

                <div
                  className="h-0.5"
                  style={{
                    width: "80px",
                    background: "linear-gradient(to right, #06b6d4, transparent)",
                    animation: "pulse-line 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            {/* COLUMN 2 */}
            <div className="md:col-span-1 md:justify-self-end">
              <div className="font-mono text-[10px] text-neutral-700 uppercase tracking-[0.2em] mb-5">
                PLATFORM
              </div>

              <nav className="space-y-3">
                <Link href="/phishing" className="group flex items-center gap-2">
                  <span className="text-neutral-700 transition-transform duration-200 group-hover:translate-x-1">›</span>
                  <span className="font-mono text-sm text-neutral-500 hover:text-cyan-400 transition-colors duration-150">
                    Phishing Scanner
                  </span>
                </Link>

                <Link href="/cyber-help" className="group flex items-center gap-2">
                  <span className="text-red-400 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-30" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-neutral-700 transition-transform duration-200 group-hover:translate-x-1">›</span>
                  </span>
                  <span className="font-mono text-sm text-red-400 hover:text-red-300 transition-colors duration-150">
                    Cyber Emergency
                  </span>
                </Link>

                <Link href="/login" className="group flex items-center gap-2">
                  <span className="text-neutral-700 transition-transform duration-200 group-hover:translate-x-1">›</span>
                  <span className="font-mono text-sm text-neutral-500 hover:text-cyan-400 transition-colors duration-150">
                    Secure Login
                  </span>
                </Link>

                <Link href="/signup" className="group flex items-center gap-2">
                  <span className="text-neutral-700 transition-transform duration-200 group-hover:translate-x-1">›</span>
                  <span className="font-mono text-sm text-neutral-500 hover:text-cyan-400 transition-colors duration-150">
                    Create Account
                  </span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 4 — Bottom Bar */}
      <div
        className="px-12 py-3 flex flex-col md:flex-row items-center justify-between gap-3"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <div className="font-mono text-[11px] text-neutral-800">© 2024 ABHEDYA.SEC</div>

        <div className="flex items-center gap-2">
          {["AES-256", "ZERO-LOGS", "AI-POWERED"].map((b) => (
            <div
              key={b}
              className="border border-white/5 rounded-sm px-2 py-0.5 font-mono text-[9px] text-neutral-800 uppercase tracking-widest hover:border-cyan-400/20 hover:text-neutral-600 transition duration-200"
            >
              [ {b} ]
            </div>
          ))}
        </div>

        <div className="font-mono text-[11px] text-neutral-800 text-right">BUILT FOR INDIA · SECURED BY AI</div>
      </div>
    </footer>
  );
}
