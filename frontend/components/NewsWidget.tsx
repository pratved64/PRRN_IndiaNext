"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
}

export default function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch(
          'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/TheHackersNews'
        );
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Take top 4 items
        if (data.status === 'ok' && data.items) {
          setNews(data.items.slice(0, 4));
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateString.split(' ')[0];
    }
  };

  return (
    <div className="bg-neutral-900/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-sm flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
        <h2 className="text-sm font-mono uppercase text-white tracking-widest flex items-center gap-2">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2"></path></svg>
          {t('dash.news') || "Cyber Awareness"}
        </h2>
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
      </div>

      <div className="p-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 flex flex-col gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse flex flex-col gap-2">
                <div className="h-4 bg-neutral-800 rounded w-full"></div>
                <div className="h-3 bg-neutral-800 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error || news.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <svg className="w-8 h-8 text-neutral-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest">{t('dash.news.offline') || "Feed Offline"}</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {news.map((item, idx) => (
              <li key={idx}>
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block p-4 hover:bg-white/[0.03] transition group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-sm font-medium text-neutral-300 group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <svg className="w-4 h-4 text-neutral-600 group-hover:text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </div>
                  <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                    {formatDate(item.pubDate)}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="px-5 py-2 border-t border-white/5 bg-black/20 text-[9px] font-mono text-neutral-600 text-center uppercase tracking-widest">
        {t('dash.news.source') || "Source: The Hacker News"}
      </div>
    </div>
  );
}
