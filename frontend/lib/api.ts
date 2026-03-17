// centralized API calls for Next.js frontend to FastAPI backend

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${BASE_URL.replace(/\/$/, "")}/api`;

export interface ThreatResult {
  threatType: string;
  riskLevel: "None" | "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  explanations: string[];
  recommendation: string;
  timelineMarkers?: { time: number; label: string }[];
  heatmapBase64?: string;
  framesAnalyzed?: number;
  realProb?: number;
  fakeProb?: number;
  rawLabel?: string;
  severity?: string;
  classification?: string;
  attentionMap?: number[];
  resolvedUrl?: string;
  originalUrl?: string;
  // Sentinel specifics
  verdict?: string;
  severityScore?: number;
  rulesFired?: string[];
  highestSeverityRule?: string;
  shapFeatures?: any[];
  autoencoderFeatureErrors?: any[];
  narrative?: string;
  fusionBreakdown?: any;
  processingTimeMs?: number;
}

export interface BackendResponse {
  risk_score: number;
  classification: string;
  highlighted_words?: { word: string; score: number }[];
  original_url?: string;
  resolved_url?: string;
  // Adjust for any deepfake-specific fields you might return later on
}

function mapBackendToUI(response: BackendResponse, type: "phishing" | "url" | "deepfake" = "phishing"): ThreatResult {
  let riskLevel: ThreatResult["riskLevel"] = "None";
  let threatType = "Unknown";
  let recommendation = "No action required.";
  const confidence = Math.round(response.risk_score * 100);

  if (response.risk_score >= 0.7) {
    riskLevel = "High";
  } else if (response.risk_score >= 0.4) {
    riskLevel = "Medium";
  } else {
    riskLevel = "Low";
  }

  const explanations = response.highlighted_words
    ? response.highlighted_words.map(hw => `Suspicious term detected: "${hw.word}" (Score: ${hw.score.toFixed(2)})`)
    : [];

  if (type === "phishing") {
    if (riskLevel === "High" || (riskLevel as string) === "Critical") {
      threatType = "Spear Phishing / Credential Harvesting";
      riskLevel = "High"; // Maintain type safety with ThreatResult["riskLevel"]
      recommendation = "Quarantine email across all organizational inboxes. Block sender IP. Do not click links.";
    } else if (riskLevel === "Medium") {
      threatType = "Suspicious Communication";
      recommendation = "Review carefully. Potential phishing indicators found. Verification required.";
    } else {
      threatType = "Standard Communication";
      riskLevel = "None";
      recommendation = "No action required. Communication appears benign.";
      // Clean up low-risk explanations
      explanations.length = 0;
    }
} else if (type === "url") {
    if (riskLevel === "High" || (riskLevel as string) === "Critical") {
      threatType = "Malicious URL Detected";
      if (response.original_url !== response.resolved_url) {
        explanations.push(`URL Redirect detected: '${response.original_url}' resolves to '${response.resolved_url}'`);
      }
      recommendation = "Block domain at the firewall level. Add to internal DNS sinkhole. Do not proceed to the site.";
    } else if (riskLevel === "Medium") {
      threatType = "Suspicious URL";
      recommendation = "Proceed with caution. Domain has suspicious characteristics.";
    } else {
      threatType = "Verified Safe URL";
      riskLevel = "None";
      recommendation = "No action required. Domain is safe to access.";
      explanations.length = 0;
    }
  }

  return {
    threatType,
    riskLevel,
    confidence,
    explanations,
    recommendation,
    originalUrl: response.original_url,
    resolvedUrl: response.resolved_url,
  };
}

export async function analyzePhishingText(text: string): Promise<ThreatResult> {
  const response = await fetch(`${API_BASE}/analyze/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Phishing API error: ${response.statusText}`);
  }

  const data: BackendResponse = await response.json();
  return mapBackendToUI(data, "phishing");
}

export async function analyzeUrl(url: string): Promise<ThreatResult> {
  const response = await fetch(`${API_BASE}/analyze/url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`URL API error: ${response.statusText}`);
  }

  const data: BackendResponse = await response.json();
  return mapBackendToUI(data, "url");
}

interface AudioDeepfakeResponse {
  label: string;
  confidence: number;
  real_prob?: number;
  fake_prob?: number;
  severity?: string;
  attention_map?: number[];
}

interface VideoDeepfakeResponse {
  risk_score: number;
  classification?: string;
  heatmap_base64?: string;
  frames_analyzed?: number;
}

export async function processDeepfakeMedia(file: File): Promise<ThreatResult> {
  const formData = new FormData();
  formData.append("file", file);

  const isAudio = file.type.startsWith("audio/");
  const endpoint = isAudio ? "/deepfake-audio/predict" : "/analyze/media";

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    // try to surface backend detail for easier debugging
    try {
      const errBody = await response.json();
      const detail = (errBody && (errBody.detail || errBody.message)) ?? "";
      throw new Error(`Media API error: ${response.statusText}${detail ? ` — ${detail}` : ""}`);
    } catch {
      throw new Error(`Media API error: ${response.statusText}`);
    }
  }

  const data = await response.json();

  let riskLevel: ThreatResult["riskLevel"] = "None";
  let threatType = "Unknown";
  let recommendation = "No action required.";
  let confidence = 0;
  const explanations: string[] = [];

  if (isAudio) {
    const audio = data as AudioDeepfakeResponse;
    confidence = Math.round((audio.confidence ?? 0) * 100);
    const label = (audio.label || "").toUpperCase();
    const fakeProb = audio.fake_prob ?? null;
    const realProb = audio.real_prob ?? null;
    const severity = audio.severity ?? undefined;
    const fakeP = fakeProb ?? 0;

    // Risk mapping driven by fake probability
    if (fakeP >= 0.9) riskLevel = "Critical";
    else if (fakeP >= 0.7) riskLevel = "High";
    else if (fakeP >= 0.4) riskLevel = "Medium";
    else if (fakeP >= 0.2) riskLevel = "Low";
    else riskLevel = "None";

    threatType = fakeP >= 0.4 ? "AI-Generated Audio (Deepfake)" : "Authentic Audio Verified";
    recommendation = fakeP >= 0.4
      ? "Flag this audio as synthetic. Verify speaker identity through another channel."
      : "Audio passed authenticity checks.";

    explanations.push(`Fake prob: ${(fakeP * 100).toFixed(1)}%, Real prob: ${((realProb ?? 0) * 100).toFixed(1)}%.`);
    if (label) explanations.push(`Backend label: ${label}`);

    return {
      threatType,
      riskLevel,
      confidence,
      explanations,
      recommendation,
      realProb: realProb ?? undefined,
      fakeProb: fakeProb ?? undefined,
      rawLabel: audio.label,
      severity,
      attentionMap: audio.attention_map,
    };
  } else {
    const video = data as VideoDeepfakeResponse;
    const score = video.risk_score ?? 0;
    confidence = Math.round(score * 100);

    // Risk mapping driven by risk score (1.0 = Fake)
    if (score >= 0.7) {
      riskLevel = "High";
      threatType = "High Risk Visual Media (Possible Deepfake)";
      recommendation = "Treat as potentially synthetic: quarantine and escalate for manual review.";
      explanations.push(`Model risk score ${confidence}% exceeds high-risk threshold (>= 70%).`);
    } else if (score >= 0.4) {
      riskLevel = "Medium";
      threatType = "Medium Risk Visual Media";
      recommendation = "Proceed with caution. Consider secondary verification before trust.";
      explanations.push(`Model risk score ${confidence}% falls in medium-risk band (40%-70%).`);
    } else {
      riskLevel = "Low";
      threatType = "Authentic Visual Media";
      recommendation = "Media appears authentic with low deepfake risk.";
      explanations.push(`Model risk score ${confidence}% is below suspicious thresholds.`);
    }

    if (video.classification) {
      explanations.unshift(video.classification);
    }

    return {
      threatType,
      riskLevel,
      confidence,
      explanations,
      recommendation,
      heatmapBase64: video.heatmap_base64,
      framesAnalyzed: video.frames_analyzed,
      classification: video.classification,
    };
  }
}

// Sentinel AI behavior analytics
export async function getSentinelHealth() {
  const res = await fetch(`${BASE_URL}/api/sentinel/health`);
  return res.json();
}

export async function getSentinelDemoScenarios() {
  const res = await fetch(`${BASE_URL}/api/sentinel/demo-scenarios`);
  return res.json();
}

export async function runSentinelAnalyze(event: any) {
  const res = await fetch(`${BASE_URL}/api/sentinel/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return res.json();
}

export async function runSentinelDemo(scenarioId: string) {
  const res = await fetch(`${BASE_URL}/api/sentinel/demo/${scenarioId}`, {
    method: "POST"
  });
  return res.json();
}

export async function getSentinelUserHistory(userId: string) {
  const res = await fetch(`${BASE_URL}/api/sentinel/user/${userId}/history`);
  return res.json();
}
