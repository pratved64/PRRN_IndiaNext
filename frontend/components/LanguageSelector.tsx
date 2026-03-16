"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { SupportedLanguage, languageNames } from "@/lib/i18n/translations";

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left z-50" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-neutral-400 bg-black/40 border border-white/10 rounded hover:text-white hover:bg-white/5 transition"
        id="menu-button"
        aria-expanded="true"
        aria-haspopup="true"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
        {languageNames[language].split(" ")[0]} 
        <svg className="-mr-1 ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-[0_0_20px_rgba(0,0,0,0.8)] bg-neutral-900 ring-1 ring-white/10 focus:outline-none overflow-hidden" 
          role="menu" 
          aria-orientation="vertical" 
          aria-labelledby="menu-button" 
          tabIndex={-1}
        >
          <div className="py-1" role="none">
            {(Object.entries(languageNames) as [SupportedLanguage, string][]).map(([code, name]) => (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                className={`w-full text-left block px-4 py-2 text-xs font-mono tracking-wider ${
                  language === code 
                    ? 'bg-cyan-900/40 text-cyan-400' 
                    : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                }`}
                role="menuitem"
                tabIndex={-1}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
