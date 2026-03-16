"use client";

import React, { useState, useRef, useEffect } from "react";
import ExplainabilityCard from "@/components/ExplainabilityCard";
import DashboardNav from "@/components/DashboardNav";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";

interface ThreatResult {
  threatType: string;
  riskLevel: "None" | "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  explanations: string[];
  recommendation: string;
  timelineMarkers?: { time: number; label: string }[];
}

export default function DeepfakeScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ThreatResult | null>(null);
  const [sessionId, setSessionId] = useState("");
  const { theme, toggleTheme, themeStyle } = useTheme();
  const { t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLMediaElement>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [graphData, setGraphData] = useState<{ x: number, y: number, percent: number, time: number }[]>([]);
  const [hoverData, setHoverData] = useState<{ x: number, y: number, percent: number, time: number } | null>(null);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Handle Audio Time Update
  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setAudioProgress(mediaRef.current.currentTime);
    }
  };

  const toggleAudioPlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Generate synthetic graph points based on markers or analysis state
  useEffect(() => {
    if (!isAnalyzing && !result) {
      setGraphData([]);
      return;
    }

    const isThreat = isAnalyzing || (result && result.riskLevel === "Critical");
    const markers = result?.timelineMarkers;
    
    // In a real scenario, this would use audioDuration, but for mock we use 20s
    const duration = audioDuration > 0 ? audioDuration : 20;
    
    const numPoints = 100; // Increased resolution for smoother hover
    const newData = [];
    
    for (let i = 0; i <= numPoints; i++) {
      const percent = i / numPoints;
      // Base noise
      let val = isThreat ? 80 + Math.random() * 15 : 95 + Math.random() * 5; 
      const timeSec = percent * duration; 
      
      // Add spikes where markers are
      if (markers && isThreat) {
        for (const m of markers) {
          if (Math.abs(m.time - timeSec) < 0.8) {
            val -= 60; // Spike down (higher threat = lower Y in SVG)
          }
        }
      }
      newData.push({ x: percent * 100, y: val, percent, time: timeSec });
    }
    setGraphData(newData);
  }, [isAnalyzing, result, audioDuration]);
  
  const getGraphPointsString = () => {
    if (graphData.length === 0) return "0,100 100,100";
    let points = "0,100 ";
    graphData.forEach(d => {
      points += `${d.x},${d.y} `;
    });
    points += "100,100";
    return points;
  };

  const handleGraphMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!graphContainerRef.current || graphData.length === 0) return;
    
    const rect = graphContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentX = x / rect.width;
    
    // Find closest data point
    const closest = graphData.reduce((prev, curr) => {
      return (Math.abs(curr.percent - percentX) < Math.abs(prev.percent - percentX) ? curr : prev);
    });
    
    setHoverData(closest);
  };

  const handleGraphMouseLeave = () => {
    setHoverData(null);
  };

  const seekTo = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      setAudioProgress(time); // Update custom audio player state
      // We don't force play here, we just scrub the frame
    }
  };

  useEffect(() => {
    // Generate a fake session ID on load
    setSessionId(`MED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
    
    // Cleanup object URL on unmount to prevent memory leaks
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl); // clear old preview
      setFile(selectedFile);
      setResult(null);
      setIsPlaying(false);
      setAudioProgress(0);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleAnalyze = (scenario: "threat" | "safe" = "threat") => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);

    const fileType = file.type.split('/')[0]; // 'image', 'video', or 'audio'

    setTimeout(() => {
      let mockResult: ThreatResult;

      if (scenario === "threat") {
        mockResult = {
          threatType: "AI-Generated Media (Deepfake)",
          riskLevel: "Critical",
          confidence: 96,
          explanations: [],
          recommendation: "Flag this media as synthetic. Quarantine and verify sender identity through secondary channels (e.g., live phone call)."
        };

        if (fileType === 'video') {
          mockResult.explanations = [
            "Facial artifacts detected: Unnatural blurring around the jawline and eyes.",
            "Lip-sync mismatch: Audio phonemes do not align perfectly with mouth movements at 0:12s.",
            "Lighting inconsistency: Shadows on the subject's face do not match the background environment."
          ];
          mockResult.timelineMarkers = [
            { time: 2.5, label: "Jawline blur" },
            { time: 6.1, label: "Shadow mismatch" },
            { time: 12.0, label: "Lip-sync fail" }
          ];
        } else if (fileType === 'audio') {
          mockResult.explanations = [
            "Spectral anomalies: Unnatural frequency cutoffs typical of AI voice cloning models (e.g., ElevenLabs).",
            "Breathing patterns: Absence of natural inhalation sounds between sentences.",
            "Monotone pitch variations: Emotional cadence lacks human-like micro-fluctuations."
          ];
          mockResult.timelineMarkers = [
            { time: 3.4, label: "Missing breath" },
            { time: 8.2, label: "Pitch anomaly" },
            { time: 14.7, label: "Spectral cutoff" }
          ];
        } else {
          mockResult.explanations = [
            "Generative AI artifacts: Asymmetrical features detected in the background.",
            "Metadata analysis: Missing standard EXIF data; software tag indicates 'Stable Diffusion'.",
            "Pixel-level noise: Noise distribution is uniform and lacks natural camera sensor grain."
          ];
        }
      } else {
        // Safe Scenario
        mockResult = {
          threatType: "Authentic Media Verified",
          riskLevel: "None",
          confidence: 99,
          explanations: [
            "Metadata intact: Standard camera/recording device signatures present.",
            "Forensic analysis: No synthetic noise artifacts or pixel anomalies detected.",
            "Temporal consistency: Frame-by-frame rendering is consistent with natural physics."
          ],
          recommendation: "Media passed all cryptographic and heuristic checks. Safe to process."
        };
      }

      setResult(mockResult);
      setIsAnalyzing(false);
    }, 2500);
  };

  const clearInput = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div 
      className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-neutral-700 selection:text-white relative overflow-hidden flex flex-col items-center pb-20"
      style={themeStyle}
    >
      
      {/* Dynamic CSS for Grid & Scanning Animation */}
      <style dangerouslySetInnerHTML={{__html: `
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
        @keyframes scan-sweep {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        .cyber-scanner-media {
          animation: scan-sweep 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          background: linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.8), transparent);
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.6);
        }
        @keyframes audioWave {
          0% { height: 10%; }
          50% { height: 100%; }
          100% { height: 10%; }
        }
        .audio-bar {
          animation: audioWave 1.2s ease-in-out infinite;
          animation-play-state: paused;
        }
        .audio-bar.playing {
          animation-play-state: running;
        }
      `}} />

      <div className="absolute inset-0 bg-grid-animated pointer-events-none w-full h-full"></div>

      <DashboardNav />

      {/* Main Content Container */}
      <div className="max-w-5xl w-full px-4 md:px-8 mt-12 relative z-10 mx-auto">

        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
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
        
        {/* Top Telemetry Bar */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10 text-xs font-mono uppercase tracking-widest text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Optical/Audio Node: ACTIVE
            </span>
          </div>
          <div>Session_ID: {sessionId || "CONNECTING..."}</div>
        </div>

        {/* Header Title */}
        <header className="mb-10">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-2">
            {t('df.title') || "Media "} <span className="font-bold">{t('df.title2') || "Scanner"}</span>
          </h1>
          <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest border-l-2 border-white/20 pl-3">
            {t('df.subtitle') || "Module // Deepfake & Synthetic Payload Inspection"}
          </p>
        </header>

        {/* Primary Input Console */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl overflow-hidden">
          
          {/* Console Top Bar */}
          <div className="bg-neutral-950 px-4 py-3 border-b border-white/10 flex justify-between items-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest">
              {t('df.sandbox') || "Secure_Media_Sandbox"}
            </div>
          </div>

          <div className="p-4 md:p-6 bg-black/50">
            
            {/* Upload Zone (Hidden if file is selected) */}
            {!file && (
              <div 
                className="border border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/50 transition-all duration-300 rounded-lg p-12 text-center cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,audio/*,video/*" 
                  className="hidden" 
                />
                <div className="text-5xl mb-4 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">📸</div>
                <p className="text-white font-mono uppercase tracking-widest text-sm mb-2">{t('df.initUpload') || "[ INITIALIZE UPLOAD ]"}</p>
                <p className="text-xs font-mono text-neutral-500">{t('df.awaiting') || "Awaiting Image, Audio, or Video Payload..."}</p>
              </div>
            )}

            {/* Media Preview Section */}
            {previewUrl && file && (
              <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black flex justify-center items-center min-h-[300px]">
                
                {/* Visual Scanner Overlay */}
                {isAnalyzing && (
                  <>
                    <div className="absolute inset-0 bg-black/50 z-20 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                        {t('df.analyzing') || "Running Heuristic Pixel Analysis..."}
                      </span>
                    </div>
                    <div className="absolute left-0 w-full h-[2px] cyber-scanner-media z-30 pointer-events-none"></div>
                  </>
                )}

                {/* Render appropriate media type */}
                {file.type.startsWith('image/') && (
                  <img src={previewUrl} alt="Preview" className={`max-h-[400px] object-contain ${isAnalyzing ? 'opacity-50' : ''}`} />
                )}
                
                {file.type.startsWith('audio/') && (
                  <div className="w-full h-full min-h-[300px] p-8 bg-neutral-950 flex flex-col justify-center items-center relative">
                    
                    {/* Hidden Audio Element */}
                    <audio 
                      ref={mediaRef as React.RefObject<HTMLAudioElement>} 
                      src={previewUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden" 
                    />

                    {/* Cyber Audio Waveform Visualizer */}
                    <div className="flex items-center justify-center gap-[3px] h-32 w-full mb-8 max-w-2xl px-4">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2 md:w-3 bg-cyan-400 rounded-sm audio-bar ${isPlaying ? 'playing' : ''}`}
                          style={{ 
                            animationDelay: `${Math.random() * 1.5}s`,
                            height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '10%',
                            opacity: isAnalyzing ? 0.3 : 1,
                            transition: 'height 0.3s ease'
                          }}
                        ></div>
                      ))}
                    </div>

                    {/* Custom Controls */}
                    <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-xl p-4 flex flex-col gap-4 shadow-xl relative z-40 relative z-50 pointer-events-auto">
                      
                      <div className="flex items-center justify-between w-full relative z-50">
                        {/* Play / Pause Toggle */}
                        <button 
                          onClick={toggleAudioPlay}
                          className="w-12 h-12 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30 transition-all z-50 pointer-events-auto"
                        >
                          {isPlaying ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                          ) : (
                            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          )}
                        </button>
                        
                        {/* Progress Bar */}
                        <div className="flex-1 mx-4 relative h-1.5 bg-neutral-800 rounded-full overflow-hidden z-50 pointer-events-auto group">
                          <div 
                            className="absolute top-0 left-0 h-full bg-cyan-400"
                            style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }}
                          ></div>
                          <input 
                            type="range" 
                            min="0" 
                            max={audioDuration || 100} 
                            value={audioProgress}
                            onChange={(e) => seekTo(Number(e.target.value))}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-50 pointer-events-auto"
                          />
                        </div>
                        
                        {/* Time display */}
                        <div className="text-xs font-mono text-cyan-400 w-24 text-right">
                          0:{(audioProgress < 10 ? "0" : "")}{(audioProgress || 0).toFixed(1).replace(".", ":")} / 
                          0:{(audioDuration < 10 ? "0" : "")}{(audioDuration || 0).toFixed(1).replace(".", ":")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {file.type.startsWith('video/') && (
                  <video 
                    ref={mediaRef as React.RefObject<HTMLVideoElement>} 
                    controls 
                    src={previewUrl} 
                    className={`max-h-[400px] w-full object-contain ${isAnalyzing ? 'opacity-50' : ''}`} 
                  />
                )}
              </div>
            )}
            
            {/* Interactive Timeline Scrubbing (Only for Audio/Video after analysis) */}
            {result && result.timelineMarkers && !isAnalyzing && (
              <div className="mt-4 bg-neutral-900 border border-white/10 rounded-lg p-4 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-mono uppercase text-cyan-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {t('df.timeline') || "Forensic Timeline Markers"}
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">{t('df.scrub') || "Click to scrub"}</span>
                </div>
                <div className="flex gap-2 relative overflow-x-auto pb-2 scrollbar-hide">
                  {result.timelineMarkers.map((marker, idx) => (
                    <button 
                      key={idx}
                      onClick={() => seekTo(marker.time)}
                      className="flex-shrink-0 flex flex-col items-center justify-center bg-red-500/10 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/60 transition-all rounded px-3 py-2 cursor-pointer group"
                    >
                      <span className="text-[10px] font-mono text-red-400 font-bold mb-1">
                        0:{(marker.time < 10 ? "0" : "") + marker.time.toFixed(1).replace(".", ":")}s
                      </span>
                      <span className="text-[10px] font-mono text-neutral-300 group-hover:text-white transition">
                        {marker.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Confidence Graph Visualization */}
            {(isAnalyzing || result) && file && !file.type.startsWith('image/') && (
              <div className="mt-6 border border-white/10 bg-neutral-950/50 rounded-lg p-4 relative overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-mono uppercase text-cyan-400">{t('df.graphTitle') || "Heuristic Confidence Graph"}</h4>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase">
                    {isAnalyzing ? (t('df.processing') || "Processing...") : (t('df.complete') || "Analysis Complete")}
                  </span>
                </div>
                
                <div className="h-24 w-full relative border-b border-l border-white/20" ref={graphContainerRef}>
                  {/* Graph Grid */}
                  <div className="absolute inset-0 flex flex-col justify-between opacity-20 pointer-events-none">
                    <div className="w-full border-t border-dashed border-white/50"></div>
                    <div className="w-full border-t border-dashed border-white/50"></div>
                    <div className="w-full border-t border-dashed border-white/50"></div>
                  </div>

                  {/* Hover Marker & Tooltip */}
                  {hoverData && !isAnalyzing && (
                    <>
                      {/* Vertical Reference Line */}
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-cyan-400 z-10 pointer-events-none"
                        style={{ left: `${hoverData.x}%` }}
                      ></div>
                      
                      {/* Interactive Tooltip showing data at that second */}
                      <div 
                        className="absolute z-20 bg-black/90 border border-cyan-500/50 p-2 rounded shadow-xl pointer-events-none min-w-[120px]"
                        style={{ 
                          left: hoverData.x > 80 ? 'auto' : `${hoverData.x}%`, 
                          right: hoverData.x > 80 ? `${100 - hoverData.x}%` : 'auto',
                          top: '10%',
                          transform: hoverData.x > 80 ? 'translateX(-10px)' : 'translateX(10px)'
                        }}
                      >
                        <div className="text-[10px] uppercase font-mono text-cyan-400 mb-1 border-b border-white/10 pb-1">{t('df.telemetry') || "Telemetry Data"}</div>
                        <div className="flex justify-between items-center text-xs font-mono mb-1">
                          <span className="text-neutral-400">{t('df.time') || "Time:"}</span>
                          <span className="text-white">0:{(hoverData.time < 10 ? "0" : "") + hoverData.time.toFixed(1).replace(".", ":")}s</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-neutral-400">{t('df.aiDetect') || "AI DETECT:"}</span>
                          <span className={hoverData.y < 50 ? "text-red-400 font-bold" : "text-green-400"}>
                            {(100 - hoverData.y).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Point indicator on the line */}
                      <div 
                        className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,1)] z-10 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${hoverData.x}%`, top: `${hoverData.y}%` }}
                      ></div>
                    </>
                  )}

                  {/* SVG Line / Area Graph */}
                  <svg 
                    className={`w-full h-full ${!isAnalyzing ? 'cursor-crosshair' : ''}`}
                    preserveAspectRatio="none" 
                    viewBox="0 0 100 100"
                    onMouseMove={handleGraphMouseMove}
                    onMouseLeave={handleGraphMouseLeave}
                    onClick={() => {
                       if (hoverData && !isAnalyzing) seekTo(hoverData.time);
                    }}
                  >
                    <defs>
                      <linearGradient id="graphGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={result?.riskLevel === "Critical" ? "#ef4444" : "#06b6d4"} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={result?.riskLevel === "Critical" ? "#ef4444" : "#06b6d4"} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* The scanning line (only shows during analysis) */}
                    {isAnalyzing && (
                      <rect className="cyber-scanner-media h-full w-[2px] opacity-50 pointer-events-none" />
                    )}

                    <polyline
                      points={getGraphPointsString()}
                      fill="url(#graphGradient)"
                      stroke={result?.riskLevel === "Critical" ? "#ef4444" : "#06b6d4"}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      className={`transition-all duration-1000 pointer-events-none ${isAnalyzing ? 'opacity-50 animate-pulse' : 'opacity-100'}`}
                    />
                  </svg>

                  {/* Axis Labels */}
                  <div className="absolute -left-6 top-0 text-[8px] font-mono text-neutral-500">100%</div>
                  <div className="absolute -left-6 bottom-0 text-[8px] font-mono text-neutral-500">0%</div>
                  <div className="absolute left-0 -bottom-4 text-[8px] font-mono text-neutral-500">0:00</div>
                  <div className="absolute right-0 -bottom-4 text-[8px] font-mono text-neutral-500">END</div>
                </div>
              </div>
            )}
          </div>

          {/* Console Bottom Status Bar */}
          <div className="bg-neutral-950 px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-mono text-neutral-500 uppercase border-t border-white/10">
            <div className="flex gap-4 md:gap-8">
              <span>{t('df.type') || "Type:"} {file ? file.type : "N/A"}</span>
            </div>
            <div className="flex gap-4 md:gap-8">
              <span>{t('df.size') || "Size:"} {file ? (file.size / 1024 / 1024).toFixed(2) + " MB" : "0.00 MB"}</span>
            </div>
          </div>

          {/* Action Area */}
          <div className="bg-neutral-950 p-4 md:px-6 md:py-5 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <button
              onClick={clearInput}
              disabled={isAnalyzing || !file}
              className="text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-white transition disabled:opacity-30 w-full md:w-auto text-left md:text-center"
            >
              {t('df.clear') || "[ Clear Payload ]"}
            </button>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => handleAnalyze("safe")}
                disabled={isAnalyzing || !file}
                className="flex-1 md:flex-none px-6 py-3 text-xs md:text-sm font-mono uppercase tracking-widest text-neutral-400 border border-white/10 rounded hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('df.simSafe') || "Simulate Safe"}
              </button>

              <button
                onClick={() => handleAnalyze("threat")}
                disabled={isAnalyzing || !file}
                className="flex-1 md:flex-none px-8 py-3 text-xs md:text-sm font-mono font-bold uppercase tracking-widest bg-white text-black rounded hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (t('df.processing') || "Processing...") : (t('df.scanMedia') || "Scan Media")}
              </button>
            </div>
          </div>
        </div>

        {/* Results / Explainability Engine Output */}
        <div className={`transition-all duration-700 ease-out origin-top ${result ? 'opacity-100 scale-y-100 translate-y-0 mt-8' : 'opacity-0 scale-y-95 translate-y-4 pointer-events-none h-0'}`}>
          {result && (
            <div className="relative">
              {/* Connection line tying UI together */}
              <div className="absolute -top-8 left-8 w-px h-8 bg-gradient-to-b from-white/20 to-transparent"></div>
              <ExplainabilityCard result={result} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}