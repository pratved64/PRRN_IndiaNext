export interface ScanRecord {
  id: string;
  tool: "phishing" | "url" | "deepfake_media" | "deepfake_audio" | "prompt_injection" | "behavior";
  timestamp: string;
  input_preview: string;
  verdict: "MALICIOUS" | "SUSPICIOUS" | "SAFE" | "AI GENERATED" | "REAL HUMAN" | "PROMPT INJECTION";
  risk_score: number;
  classification: string;
  details: any;
}

export interface ScanStats {
  total: number;
  byTool: Record<string, number>;
  byVerdict: {
    malicious: number;
    suspicious: number;
    safe: number;
    other: number;
  };
  threatRate: number;
  mostUsedTool: string | null;
  lastScanTime: string | null;
}

const STORAGE_KEY = "abhedya_scan_history";
const MAX_RECORDS = 200;

function saveScan(record: Omit<ScanRecord, 'id' | 'timestamp'>): void {
  try {
    const history = getScanHistory();
    const newRecord: ScanRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    
    // Prepend new record (newest first)
    const updatedHistory = [newRecord, ...history].slice(0, MAX_RECORDS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Failed to save scan record:', error);
  }
}

function getScanHistory(): ScanRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load scan history:', error);
    return [];
  }
}

function clearScanHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear scan history:', error);
  }
}

function getHistoryByTool(tool: string): ScanRecord[] {
  return getScanHistory().filter(record => record.tool === tool);
}

function getRecentScans(limit: number): ScanRecord[] {
  return getScanHistory().slice(0, limit);
}

function getScanStats(): ScanStats {
  const history = getScanHistory();
  
  if (history.length === 0) {
    return {
      total: 0,
      byTool: {},
      byVerdict: {
        malicious: 0,
        suspicious: 0,
        safe: 0,
        other: 0,
      },
      threatRate: 0,
      mostUsedTool: null,
      lastScanTime: null,
    };
  }
  
  const byTool: Record<string, number> = {};
  const byVerdict = {
    malicious: 0,
    suspicious: 0,
    safe: 0,
    other: 0,
  };
  
  history.forEach(record => {
    // Count by tool
    byTool[record.tool] = (byTool[record.tool] || 0) + 1;
    
    // Count by verdict
    switch (record.verdict) {
      case 'MALICIOUS':
        byVerdict.malicious++;
        break;
      case 'SUSPICIOUS':
        byVerdict.suspicious++;
        break;
      case 'SAFE':
        byVerdict.safe++;
        break;
      default:
        byVerdict.other++;
        break;
    }
  });
  
  // Calculate threat rate (percentage of non-SAFE scans)
  const threatCount = byVerdict.malicious + byVerdict.suspicious;
  const threatRate = history.length > 0 ? (threatCount / history.length) * 100 : 0;
  
  // Find most used tool
  const mostUsedTool = Object.entries(byTool).reduce((a, b) => 
    b[1] > a[1] ? b : a
  , ['', 0])[0];
  
  // Get last scan time
  const lastScanTime = history[0]?.timestamp || null;
  
  return {
    total: history.length,
    byTool,
    byVerdict,
    threatRate,
    mostUsedTool: mostUsedTool || null,
    lastScanTime,
  };
}

function seedDemoData(): void {
  try {
    // Only seed if history is completely empty
    if (getScanHistory().length > 0) {
      return;
    }
    
    const demoRecords = [
      { tool: "phishing", 
        input_preview: "URGENT: Your PayPal account has been...",
        verdict: "MALICIOUS" as const, risk_score: 94,
        classification: "High Risk: Phishing Attempt Detected",
        daysAgo: 0 },
      { tool: "url",
        input_preview: "https://paypal-secure-login.suspicious.com",
        verdict: "MALICIOUS" as const, risk_score: 89,
        classification: "High Risk: Phishing Attempt Detected",
        daysAgo: 0 },
      { tool: "behavior",
        input_preview: "user_001 — London",
        verdict: "MALICIOUS" as const, risk_score: 92,
        classification: "IMPOSSIBLE_TRAVEL",
        daysAgo: 1 },
      { tool: "prompt_injection",
        input_preview: "Ignore all previous instructions...",
        verdict: "PROMPT INJECTION" as const, risk_score: 97,
        classification: "Prompt Injection",
        daysAgo: 1 },
      { tool: "deepfake_audio",
        input_preview: "voice_message_001.mp3",
        verdict: "AI GENERATED" as const, risk_score: 88,
        classification: "AI Generated — High",
        daysAgo: 2 },
      { tool: "url",
        input_preview: "https://google.com",
        verdict: "SAFE" as const, risk_score: 3,
        classification: "Low Risk: Looks Safe",
        daysAgo: 2 },
      { tool: "phishing",
        input_preview: "Hi, please find the meeting notes...",
        verdict: "SAFE" as const, risk_score: 8,
        classification: "Low Risk: Looks Safe",
        daysAgo: 3 },
      { tool: "deepfake_media",
        input_preview: "interview_video.mp4",
        verdict: "SUSPICIOUS" as const, risk_score: 61,
        classification: "Medium Risk: Possible Manipulation",
        daysAgo: 4 },
      { tool: "behavior",
        input_preview: "user_002 — Bangalore",
        verdict: "MALICIOUS" as const, risk_score: 78,
        classification: "CREDENTIAL_STUFFING_BURST",
        daysAgo: 5 },
      { tool: "url",
        input_preview: "https://bit.ly/3suspicious",
        verdict: "SUSPICIOUS" as const, risk_score: 54,
        classification: "Medium Risk: Suspicious Elements Found",
        daysAgo: 6 }
    ];
    
    // Generate timestamps and save
    const now = new Date();
    const records: ScanRecord[] = demoRecords.map((demo, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - demo.daysAgo);
      date.setHours(date.getHours() + Math.floor(Math.random() * 24)); // Random hour offset
      
      return {
        id: crypto.randomUUID(),
        tool: demo.tool as ScanRecord['tool'],
        timestamp: date.toISOString(),
        input_preview: demo.input_preview,
        verdict: demo.verdict,
        risk_score: demo.risk_score,
        classification: demo.classification,
        details: { demo: true }
      };
    });
    
    // Sort by timestamp (newest first) and save
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    
  } catch (error) {
    console.error('Failed to seed demo data:', error);
  }
}

export {
  saveScan,
  getScanHistory,
  clearScanHistory,
  getHistoryByTool,
  getRecentScans,
  getScanStats,
  seedDemoData,
};
