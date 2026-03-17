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
}

/**
 * Unified fetch wrapper to handle ngrok headers and JSON serialization
 */
async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath.replace(/^\/api/, "")}`;

  // Merge ngrok header with any existing headers
  const headers = {
    ...(options.headers || {}),
    'ngrok-skip-browser-warning': 'true',
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} — ${text}`);
  }

  return res.json();
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
      riskLevel = "High";
      recommendation = "Quarantine email across all organizational inboxes. Block sender IP. Do not click links.";
    } else if (riskLevel === "Medium") {
      threatType = "Suspicious Communication";
      recommendation = "Review carefully. Potential phishing indicators found. Verification required.";
    } else {
      threatType = "Standard Communication";
      riskLevel = "None";
      recommendation = "No action required. Communication appears benign.";
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
  const data = await apiFetch('/analyze/text', {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return mapBackendToUI(data, "phishing");
}

export async function analyzeUrl(url: string): Promise<ThreatResult> {
  const data = await apiFetch('/analyze/url', {
    method: "POST",
    body: JSON.stringify({ url }),
  });
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

  const data = await apiFetch(endpoint, {
    method: "POST",
    body: formData,
  });

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
  return apiFetch('/sentinel/health');
}

export async function getSentinelDemoScenarios() {
  return apiFetch('/sentinel/demo-scenarios');
}

export async function runSentinelAnalyze(event: any) {
  return apiFetch('/sentinel/analyze', {
    method: "POST",
    body: JSON.stringify(event),
  });
}

export async function runSentinelDemo(scenarioId: string) {
  return apiFetch(`/sentinel/demo/${scenarioId}`, {
    method: "POST"
  });
}

export async function getSentinelUserHistory(userId: string) {
  return apiFetch(`/sentinel/user/${userId}/history`);
}

export async function analyzePromptInjection(text: string): Promise<ThreatResult> {
  const data = await apiFetch('/prompt-injection/predict', {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  
  let riskLevel: ThreatResult["riskLevel"] = "None";
  let threatType = "Unknown";
  let recommendation = "No action required.";
  const confidence = Math.round((data.confidence ?? 0) * 100);
  const label = (data.label || "").toUpperCase();

  if (label === "PROMPT INJECTION") {
    riskLevel = "High";
    threatType = "Prompt Injection Attack";
    recommendation = "Block this prompt. Do not execute or respond to this input.";
  } else {
    riskLevel = "Low";
    threatType = "Safe Prompt";
    recommendation = "Prompt appears safe to process.";
  }

  return {
    threatType,
    riskLevel,
    confidence,
    explanations: [`Backend classification: ${label}`, `Confidence: ${confidence}%`],
    recommendation,
    classification: label,
  };
}
