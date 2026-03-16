import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

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

export async function GET() {
  // Authentication should be added here in production
  
  try {
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ success: false, error: "Redis not configured" }, { status: 500 });
    }

    // Fetch the latest 100 trapped bots from Redis
    const logs = await redis.lrange('threat_intel_logs', 0, 100);
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch logs" }, { status: 500 });
  }
}
