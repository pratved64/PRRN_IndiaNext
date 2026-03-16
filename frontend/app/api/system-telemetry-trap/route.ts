import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Initialize Redis client carefully so it doesn't crash if env vars are placeholders
const getRedisClient = () => {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token && url !== "your_upstash_url_here") {
      return new Redis({ url, token });
    }
  } catch (e) {
    // Ignore
  }
  return null;
};

export async function GET(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const botIp = forwardedFor ? forwardedFor.split(",")[0] : (realIp || "127.0.0.1");

    // Extract enriched telemetry data
    const userAgent = req.headers.get('user-agent') || 'Unknown Scraper';
    const country = req.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = req.headers.get('x-vercel-ip-city') || 'Unknown';
    const timestamp = new Date().toISOString();

    console.log(`[TRIPWIRE ALERT] Scraping bot detected. IP: ${botIp}`);

    // Attempt to log to Redis if configured
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.set(`flagged_ip:${botIp}`, "malicious_scraper", { ex: 86400 });
        
        // Save the rich telemetry data to a list for our dashboard
        const threatData = JSON.stringify({ ip: botIp, userAgent, country, city, timestamp });
        await redis.lpush('threat_intel_logs', threatData);
        // Keep only the last 1000 logs to avoid running out of storage
        await redis.ltrim('threat_intel_logs', 0, 999);
      } catch (e) {
        console.log("Tripwire: Failed to log to Redis", e);
      }
    }

    // Return dummy payload but also set a poisoned tracker cookie
    const response = NextResponse.json({
      status: "success",
      admin_node: "active",
      telemetry_data: {
        session_tokens: [],
        debug_info: "No active admin sessions found."
      }
    }, { status: 200 });

    // 24 hour expiration for the cookie
    response.cookies.set('honeypot_triggered', 'true', {
      path: '/',
      maxAge: 86400,
      httpOnly: true,
      sameSite: 'strict',
    });

    return response;

  } catch (error) {
    console.error("Tripwire Error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
