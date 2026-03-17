"use client";

import React from "react";
import DashboardNav from "@/components/DashboardNav";
import BehaviorAnalysis from "@/components/BehaviorAnalysis";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";

export default function BehaviorPage() {
  const { themeStyle } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center pb-20"
      style={themeStyle}
    >
      {/* Animated Subtle Grid */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
      `}} />

      <div className="absolute inset-0 bg-grid-animated pointer-events-none w-full h-full"></div>

      <DashboardNav />

      {/* Main Content Container */}
      <div className="max-w-6xl w-full px-4 md:px-8 lg:px-12 relative z-10 mx-auto">
        
        {/* Header Title */}
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-2">
            Behavior <span className="font-bold">Analysis</span>
          </h1>
          <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest border-l-2 border-white/20 pl-3">
            Sentinel AI // Anomalous Login Detection Engine
          </p>
        </header>

        {/* Behavior Analysis Component */}
        <BehaviorAnalysis />

      </div>
    </div>
  );
}
