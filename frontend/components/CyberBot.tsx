"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  actionText?: string;
  actionRoute?: string;
  timestamp: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "bot",
      content: "Hi there! 👋 I am Kawach, your personal AI Assistant. How can I protect and assist you today?",
      timestamp: ""
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Set initial message timestamp on client only
  useEffect(() => {
    setIsMounted(true);
    setMessages(prev => 
      prev[0].timestamp === "" 
        ? [{...prev[0], timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]
        : prev
    );
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isMounted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isMounted]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInput("");

    // 1. Add User Message
    const newUserMsg: Message = { 
      id: Date.now().toString(), 
      role: "user", 
      content: userText,
      timestamp: currentTime
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    // 2. Call Gemini API via our backend route
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages
            .filter(m => m.id !== "init")
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: data.response,
          actionRoute: data.actionRoute || "",
          actionText: data.actionText || "",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Oops! I'm having trouble connecting to my servers right now. Please try again in a moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNavigation = (route: string) => {
    setIsOpen(false); // Close chat when navigating
    router.push(route);
  };

  // Mini Mascot Avatar Component for Chat Bubbles
  const MiniKawachAvatar = () => (
    <div className="flex-shrink-0 w-8 h-8 mt-1 bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-full border border-white/20 flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.05)]">
      <div className="w-4 h-2 bg-black rounded-full flex items-center justify-center gap-[2px] overflow-hidden relative">
        <div className="absolute -top-1 left-0 w-4 h-1 bg-white/30 rounded-full transform -rotate-12"></div>
        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
  );

  return (
    <>
      {/* 3D Holographic CSS Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin-3d-slow {
          0% { transform: rotateX(20deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(20deg) rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes spin-3d-fast {
          0% { transform: rotateX(-20deg) rotateY(360deg) rotateZ(0deg); }
          100% { transform: rotateX(-20deg) rotateY(0deg) rotateZ(360deg); }
        }
        @keyframes border-run {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes msg-pop-3d {
          0% { opacity: 0; transform: translateY(15px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bot-blink {
          0%, 96% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
          100% { transform: scaleY(1); }
        }
        @keyframes bot-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .anim-msg-3d { animation: msg-pop-3d 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .glass-bubble {
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      `}} />

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center z-50 group transition-all duration-500 transform-gpu preserve-3d ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:shadow-[0_0_40px_rgba(255,255,255,0.8)] hover:bg-white/10'}`}
      >
        {/* Outer Rings */}
        <div className="absolute inset-0 border-2 border-white/20 rounded-full" style={{ animation: 'spin-3d-slow 8s linear infinite' }}></div>
        <div className="absolute inset-1 border-2 border-dashed border-white/40 rounded-full" style={{ animation: 'spin-3d-fast 6s linear infinite' }}></div>
        
        {/* Core Background */}
        <div className="absolute inset-2 bg-neutral-900 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover:bg-neutral-800 transition-colors duration-500"></div>
        
        {/* Friendly 3D-Styled CSS Mascot Avatar (KAWACH) */}
        <div className="relative w-12 h-12 flex flex-col items-center justify-center z-10 transition-transform duration-500 group-hover:scale-110" style={{ animation: 'bot-float 3s ease-in-out infinite' }}>
          
          {/* Glowing Antenna */}
          <div className="absolute -top-1 w-2 h-2 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1)] animate-pulse z-0"></div>
          <div className="absolute top-1 w-1 h-3 bg-gradient-to-b from-gray-200 to-gray-500 z-0"></div>
          
          {/* Main 3D Head Base */}
          <div className="relative mt-2 w-9 h-7 bg-gradient-to-br from-white via-gray-200 to-gray-400 rounded-xl shadow-[0_5px_10px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-white/50 flex items-center justify-center z-10 overflow-hidden">
            
            {/* Dark Glass Visor */}
            <div className="w-7 h-3.5 bg-neutral-900 rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 relative overflow-hidden">
              {/* Glossy Visor Reflection */}
              <div className="absolute -top-1 left-0 w-6 h-2 bg-white/20 rounded-full transform -rotate-12"></div>
              {/* Cute Blinking Eyes */}
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]" style={{ animation: 'bot-blink 4s infinite' }}></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]" style={{ animation: 'bot-blink 4s infinite' }}></div>
            </div>
          </div>
        </div>

        {/* Notification dot */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] border border-neutral-900 rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window Overlay */}
      <div 
        className={`fixed bottom-8 right-8 w-[350px] sm:w-[420px] h-[600px] max-h-[85vh] z-50 flex flex-col transition-all duration-500 origin-bottom-right transform-gpu ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-12 pointer-events-none'}`}
        style={{ perspective: '1000px' }}
      >
        
        {/* Animated Glowing Border Wrapper */}
        <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-white/40 via-white/5 to-white/20">
          <div className="absolute inset-0 bg-neutral-950 rounded-2xl"></div>
        </div>

        {/* Inner Content Window */}
        <div className="relative flex flex-col h-full w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-neutral-950 to-black rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9),_0_0_30px_rgba(255,255,255,0.05)]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 backdrop-blur-md relative z-10 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Kawach Mascot Head for Header */}
              <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-400 rounded-full border border-white/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)] relative">
                <div className="w-6 h-3 bg-neutral-900 rounded-full flex items-center justify-center gap-[3px] overflow-hidden relative">
                  <div className="absolute -top-1 left-0 w-5 h-1.5 bg-white/20 rounded-full transform -rotate-12"></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: 'bot-blink 4s infinite' }}></div>
                  <div className="w-1.5 h-1.5 bg-white rounded-full" style={{ animation: 'bot-blink 4s infinite' }}></div>
                </div>
                {/* Status indicator */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-neutral-900 rounded-full"></div>
              </div>
              
              <div className="flex flex-col">
                <span className="font-sans text-lg font-bold text-white tracking-wide drop-shadow-md">Kawach</span>
                <span className="font-sans text-[11px] text-white/50 tracking-wider uppercase font-medium">AI System Active</span>
              </div>
            </div>
            
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative z-10">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`flex w-full anim-msg-3d ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`} style={{ animationDelay: `${idx === messages.length -1 ? '0s' : '0s'}` }}>
                
                {/* Bot Avatar next to message */}
                {msg.role === 'bot' && <MiniKawachAvatar />}

                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[78%]`}>
                  <div 
                    className={`px-4 py-3 text-[14px] leading-relaxed shadow-lg ${
                      msg.role === 'user' 
                      ? 'bg-gradient-to-br from-white to-gray-200 text-black rounded-2xl rounded-br-sm font-medium shadow-[0_5px_15px_rgba(255,255,255,0.15)]' 
                      : 'glass-bubble border border-white/10 text-neutral-100 rounded-2xl rounded-tl-sm shadow-[0_5px_15px_rgba(0,0,0,0.5)]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[10px] text-white/30 mt-1.5 px-1 font-medium tracking-wide">
                    {msg.timestamp}
                  </span>

                  {/* Dynamic Action Button */}
                  {msg.actionRoute && msg.actionText && (
                    <button 
                      onClick={() => handleNavigation(msg.actionRoute!)}
                      className="mt-2 text-[11px] font-bold uppercase tracking-wider text-black bg-white hover:bg-gray-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300"
                    >
                      {msg.actionText} 
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex w-full justify-start gap-3 anim-msg-3d">
                <MiniKawachAvatar />
                <div className="glass-bubble border border-white/10 rounded-2xl rounded-tl-sm px-4 py-4 flex items-center gap-1.5 h-fit mt-1 shadow-lg">
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Floating Input Area */}
          <div className="p-4 bg-transparent relative z-10 w-full">
            <form onSubmit={handleSend} className="relative flex items-center w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] focus-within:bg-white/10 focus-within:border-white/30 transition-all duration-300">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Kawach..."
                className="w-full bg-transparent px-6 py-4 text-sm text-white placeholder-white/40 focus:outline-none"
                disabled={isTyping}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-300 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </div>

        </div>
      </div>
    </>
  );
}