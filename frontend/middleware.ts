import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client carefully
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

// Routes that we want the middleware to inspect
export const config = {
  matcher: [
    '/((?!api/system-telemetry-trap|_next/static|_next/image|favicon.ico).*)',
  ],
};

export async function middleware(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : (realIp || '127.0.0.1');

    // DEV BYPASS: Never block localhost during development!
    if (ip === '127.0.0.1' || ip === '::1') {
      return NextResponse.next();
    }

    let isFlagged = false;

    // 1. Primary Check: Poisoned Tracker Cookie (Great for local testing & stopping bots that cycle IPs)
    const hasPoisonCookie = req.cookies.get('honeypot_triggered');
    if (hasPoisonCookie && hasPoisonCookie.value === 'true') {
      isFlagged = true;
    }

    // 2. Secondary Check: Redis Edge IP Blocklist (Stops scrapers clearing cookies)
    if (!isFlagged) {
      const redis = getRedisClient();
      if (redis) {
        const flaggedInRedis = await redis.get(`flagged_ip:${ip}`);
        if (flaggedInRedis) isFlagged = true;
      }
    }

    // 3. If flagged by either system, intercept and block them
    if (isFlagged) {
      console.log(`[DEFENSIVE HONEYPOT] Intercepted malicious request from blocked entity (IP: ${ip})`);
      
      const blockHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 - Access Denied | KAWACH</title>
  <style>
    body {
      background-color: #000;
      color: #ff3333;
      font-family: 'Courier New', Courier, monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      overflow: hidden;
    }
    .container {
      text-align: center;
      border: 1px solid #ff3333;
      padding: 40px;
      background: rgba(255, 0, 0, 0.05);
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.2);
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 5px;
      animation: glitch 1s linear infinite;
    }
    p {
      font-size: 1.2rem;
      margin-bottom: 20px;
    }
    .ip {
      color: #fff;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      font-size: 0.8rem;
      color: #666;
    }
    @keyframes glitch {
      2%, 64% { transform: translate(2px,0) skew(0deg); }
      4%, 60% { transform: translate(-2px,0) skew(0deg); }
      62% { transform: translate(0,0) skew(5deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Access Denied</h1>
    <p>KAWACH Active Defense System Triggered.</p>
    <p>Your connection (<span class="ip">${ip}</span>) has been permanently blocked.</p>
    <p>Reason: Unauthorized Scraping / Telemetry Trap Triggered.</p>
    <div class="footer">abhedya.sec Security Operations Center</div>
  </div>
</body>
</html>
      `;

      return new NextResponse(blockHtml, { 
        status: 403, 
        headers: { 'content-type': 'text/html' } 
      });
    }

    // 4. If innocent, proceed normally
    return NextResponse.next();
    
  } catch (error) {
    console.error("Middleware security check failed:", error);
    return NextResponse.next();
  }
}
