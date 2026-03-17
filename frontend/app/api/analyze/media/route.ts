import { NextRequest, NextResponse } from "next/server";

// Prefer explicit BACKEND_URL, fall back to the same base used client-side.
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

// Forward the raw multipart request to the FastAPI backend to avoid losing the file.
export async function POST(request: NextRequest) {
  try {
    const fetchInit: RequestInit = {
      method: "POST",
      headers: {
        // preserve content-type boundary so the backend sees the file
        "content-type": request.headers.get("content-type") || "",
      },
      body: request.body,
    };
    // duplex:"half" is required by Node 18+ fetch for streaming bodies but is
    // not yet in TypeScript's RequestInit definition — use Object.assign to avoid TS error.
    const backendResponse = await fetch(
      `${BACKEND_URL}/api/analyze/media`,
      Object.assign(fetchInit, { duplex: "half" })
    );

    const contentType = backendResponse.headers.get("content-type") || "application/json";
    const text = await backendResponse.text();

    return new NextResponse(text, {
      status: backendResponse.status,
      headers: { "content-type": contentType },
    });
  } catch (error) {
    console.error("Media analysis API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
