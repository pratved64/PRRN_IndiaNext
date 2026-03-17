export interface ThreatResult {
  threatType: string;
  riskLevel: "None" | "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  explanations: string[];
  recommendation: string;
  heatmapBase64?: string;
  attentionMap?: number[];
  resolvedUrl?: string; // For URL scanner
  originalUrl?: string; // For URL scanner
  timelineMarkers?: { time: number; label: string }[]; // For Media scanner
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Maps risk scores and classifications from the backend to the frontend's RiskLevel type.
 */
function mapRiskLevel(classification: string, riskScore: number): "None" | "Low" | "Medium" | "High" | "Critical" {
  const lowerClass = classification.toLowerCase();
  if (lowerClass.includes("high") || riskScore >= 0.8) return "Critical";
  if (lowerClass.includes("medium") || riskScore >= 0.6) return "High";
  if (lowerClass.includes("low") || riskScore >= 0.4) return "Medium";
  if (riskScore >= 0.2) return "Low";
  return "None";
}

/**
 * Analyzes phishing text using the backend API.
 */
export async function analyzePhishingText(text: string): Promise<ThreatResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Phishing analysis failed");
  }

  const data = await response.json();
  
  return {
    threatType: "Phishing Analysis",
    riskLevel: mapRiskLevel(data.classification, data.risk_score),
    confidence: Math.round(data.risk_score * 100),
    explanations: (data.highlighted_words || []).map(
      (hw: { word: string; score: float }) => `Suspicious term detected: "${hw.word}" (Impact: ${Math.round(hw.score * 100)}%)`
    ),
    recommendation: data.risk_score > 0.5 
      ? "Do not click any links or provide personal information. Delete this message immediately."
      : "No significant threats detected, but always remain cautious with unsolicited messages.",
  };
}

/**
 * Analyzes a URL using the backend API.
 */
export async function analyzeUrl(url: string): Promise<ThreatResult> {
  const response = await fetch(`${API_BASE_URL}/api/analyze/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "URL analysis failed");
  }

  const data = await response.json();

  return {
    threatType: "URL Reputation Scan",
    riskLevel: mapRiskLevel(data.classification || "", data.risk_score || 0),
    confidence: Math.round((data.risk_score || 0) * 100),
    explanations: data.explanations || ["Heuristic analysis completed."],
    recommendation: data.recommendation || "Verify the source before proceeding.",
    resolvedUrl: data.resolved_url,
    originalUrl: url,
  };
}

/**
 * Processes media (audio/video/image) for deepfake detection.
 */
export async function processDeepfakeMedia(file: File): Promise<ThreatResult> {
  const formData = new FormData();
  formData.append("file", file);

  // Determine endpoint based on file type
  let endpoint = "/api/analyze/media"; // Default for image/video (ViT)
  if (file.type.startsWith("audio/")) {
    endpoint = "/api/deepfake-audio/predict"; // For audio (wav2vec)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Media analysis failed");
  }

  const data = await response.json();

  return {
    threatType: file.type.startsWith("audio/") ? "Audio Deepfake Detection" : "Visual Deepfake Detection",
    riskLevel: mapRiskLevel(data.classification || "", data.risk_score || 0),
    confidence: Math.round((data.risk_score || 0) * 100),
    explanations: data.explanations || ["Spectral/pixel analysis completed."],
    recommendation: data.recommendation || "Use caution with synthetic-looking media.",
    heatmapBase64: data.heatmap,
    attentionMap: data.attention_map,
  };
}
