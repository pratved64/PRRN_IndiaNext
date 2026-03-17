/**
 * abhedya.sec | Chrome Extension Background Engine
 * Standardized for Unified Backend Architecture
 */

const DEMO_MALICIOUS_OVERRIDES = new Set([
  'malware.testing.google.test',
  'irishrsa.ie',
  'testsafebrowsing.appspot.com',
  'eicar.org'
]);

const _navDebounce = {};

/**
 * Safe URL hostname extractor
 */
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url || 'unknown';
  }
}

function checkDemoOverride(url) {
  try {
    const hostname = getHostname(url).toLowerCase();
    
    for (const override of DEMO_MALICIOUS_OVERRIDES) {
      if (hostname === override || 
          hostname === `www.${override}` ||
          hostname.endsWith(`.${override}`)) {
        console.log('[abhedya] DEMO OVERRIDE:', hostname, 'matched:', override);
        return {
          risk_score: 1.0,
          classification: 'High Risk: Phishing Attempt Detected',
          original_url: url,
          resolved_url: url,
          highlighted_words: [
            { word: 'malicious', score: 1.0 },
            { word: 'threat', score: 0.98 },
            { word: 'phishing', score: 0.96 }
          ],
          _demo_override: true
        };
      }
    }
  } catch(e) {
    console.error('[abhedya] checkDemoOverride error:', e.message);
  }
  return null;
}

async function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['api_base'], (r) => {
      resolve(r.api_base || 'http://localhost:8000');
    });
  });
}

/**
 * Normalizes risk score (0-1) to UI scale (0-100)
 */
function normalizeScore(score) {
  if (score == null || score === undefined) return 0;
  if (typeof score === 'number') {
    if (score >= 0 && score <= 1.0)
      return Math.round(score * 100);
    if (score > 1 && score <= 100)
      return Math.round(score);
  }
  if (typeof score === 'string') {
    const p = parseFloat(score);
    if (!isNaN(p)) return normalizeScore(p);
  }
  return 0;
}

function getVerdictFromClassification(cls) {
    if (!cls || typeof cls !== 'string') return 'UNKNOWN';
    const lowerCls = cls.toLowerCase();
    if (lowerCls.includes('high') || lowerCls.includes('critical') || lowerCls.includes('malicious')) return 'MALICIOUS';
    if (lowerCls.includes('medium') || lowerCls.includes('suspicious')) return 'SUSPICIOUS';
    return 'SAFE';
}

function getVerdict(cls) {
  return getVerdictFromClassification(cls);
}

/**
 * Alert fallback / Blocked page logic
 */
async function alertMaliciousSite(tabId, url, score, data) {
  if (!tabId) return;

  console.log('[abhedya] alertMaliciousSite called');
  console.log('[abhedya] tabId:', tabId);
  console.log('[abhedya] score:', score, 'type:', typeof score);
  console.log('[abhedya] classification:', data.classification);

  // Store blocked data in chrome.storage to avoid URL encoding issues
  const blockKey = `blocked_${tabId}`;
  await chrome.storage.local.set({
    [blockKey]: {
      url: url,
      score: score,
      classification: data.classification || 'High Risk: Phishing Attempt Detected',
      timestamp: Date.now()
    }
  });

  // Also pass via URL params as backup
  const params = new URLSearchParams({
    key: blockKey,
    score: score.toString(),
    domain: (() => {
      try { return new URL(url).hostname; }
      catch(e) { return url; }
    })(),
    classification: data.classification || 'High Risk: Phishing Attempt Detected'
  });

  const blockedPageUrl = chrome.runtime.getURL(`blocked.html?${params.toString()}`);

  console.log('[abhedya] Blocked page URL:', blockedPageUrl);
  
  // PRIMARY: Always redirect to blocked.html
  chrome.tabs.update(tabId, { url: blockedPageUrl });

  // SECONDARY: Try showing banner as a best-effort bonus
  try {
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_WARNING',
      data: {
        url,
        score,
        verdict: 'MALICIOUS',
        explanation: data.classification || 'Dangerous content detected.'
      }
    }).catch(() => {});
  } catch(e) {}
}

/**
 * Unified Scan Result Handler
 */
async function handleScanResult(data, url, tabId) {
    const verdict = getVerdict(data.classification);
    const score = normalizeScore(data.risk_score);

    if (tabId) {
        let badgeText = 'SAFE';
        let badgeColor = '#22c55e';

        if (verdict === 'SUSPICIOUS') {
            badgeText = '!';
            badgeColor = '#f59e0b';
        } else if (verdict === 'MALICIOUS') {
            badgeText = 'RISK';
            badgeColor = '#ef4444';
        } else if (verdict === 'UNKNOWN') {
            badgeText = '?';
            badgeColor = '#64748b';
        }
        
        chrome.action.setBadgeBackgroundColor({ color: badgeColor, tabId });
        chrome.action.setBadgeText({ text: badgeText, tabId });

        if (verdict === 'MALICIOUS') {
            const domain = getHostname(url);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Threat Intercepted',
                message: `abhedya.sec blocked a malicious site: ${domain}`
            });

            await alertMaliciousSite(tabId, url, score, data);
        }
    }

    if (verdict !== 'SAFE') {
        const hostname = getHostname(url);
        await addToBlocklist({
            url,
            domain: hostname,
            verdict,
            risk_score: score,
            scanned_at: new Date().toISOString(),
            auto_added: true
        });
    }
}

/**
 * URL Scanner
 */
async function scanURL(url, tabId) {
    console.log('[abhedya] scanURL called:', url, 'tabId:', tabId);
    
    const override = checkDemoOverride(url);
    if (override) {
        console.log('[abhedya] DEMO OVERRIDE HIT:', url);
        console.log('[abhedya] Override score:', override.risk_score);
        await handleScanResult(override, url, tabId);
        await chrome.storage.local.set({
            [`url_cache_${url}`]: {
                timestamp: Date.now(),
                result: override
            }
        });
        return override;
    }

    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: '...', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });
        }

        const cacheKey = `url_cache_${url}`;
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            const entry = cached[cacheKey];
            if (Date.now() - entry.timestamp < 3600000) {
                await handleScanResult(entry.result, url, tabId);
                return entry.result;
            }
        }

        const API_BASE = await getApiBase();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${API_BASE}/api/analyze/url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`Backend Error: ${res.status}`);
        const data = await res.json();

        await chrome.storage.local.set({
            [cacheKey]: { timestamp: Date.now(), result: data }
        });

        await handleScanResult(data, url, tabId);
        return data;
    } catch (err) {
        console.error('[abhedya] scanURL error:', err.message);
        if (tabId) {
            chrome.action.setBadgeText({ text: 'ERR', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#64748b', tabId });
        }
        return null;
    }
}

/**
 * Text Scanner
 */
async function scanText(text) {
    try {
        const API_BASE = await getApiBase();
        const res = await fetch(`${API_BASE}/api/analyze/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error(`Backend Error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error('[abhedya] scanText error:', err.message);
        return null;
    }
}

async function runHealthCheck() {
    const API_BASE = await getApiBase();
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        console.log('[abhedya] Backend ONLINE:', JSON.stringify(data));
    } catch (e) {
        console.error('[abhedya] Backend OFFLINE:', e.message);
    }
}

async function testEndpoints() {
    const API_BASE = await getApiBase();
    try {
        await fetch(`${API_BASE}/api/analyze/url`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({url: 'https://google.com'})
        });
    } catch(e) {}
}

async function addToBlocklist(item) {
    const raw = await chrome.storage.local.get(['sentinel_blocklist']);
    let list = raw.sentinel_blocklist || [];
    list = list.filter(i => i.url !== item.url);
    list.unshift(item);
    if (list.length > 500) list = list.slice(0, 500);
    await chrome.storage.local.set({ sentinel_blocklist: list });
}

chrome.storage.local.get(['api_base', 'sentinel_blocklist'], (result) => {
    if (!result.api_base) {
        chrome.storage.local.set({ api_base: 'http://localhost:8000' });
    }
    if (!result.sentinel_blocklist) {
        chrome.storage.local.set({ sentinel_blocklist: [] });
    }
    runHealthCheck();
    testEndpoints();
});

chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId !== 0) return;
    const url = details.url;
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:') || url.startsWith('edge://')) return;
    
    if (_navDebounce[details.tabId]) {
      clearTimeout(_navDebounce[details.tabId]);
    }
    _navDebounce[details.tabId] = setTimeout(async () => {
        delete _navDebounce[details.tabId];
        await scanURL(url, details.tabId);
    }, 600);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url) return;
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) return;
    
    if (_navDebounce[tabId]) {
      clearTimeout(_navDebounce[tabId]);
    }
    _navDebounce[tabId] = setTimeout(async () => {
        delete _navDebounce[tabId];
        await scanURL(tab.url, tabId);
    }, 600);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'SCAN_URL':
            scanURL(message.url, null).then(sendResponse);
            return true;
        case 'SCAN_TEXT':
            scanText(message.text).then(sendResponse);
            return true;
        case 'GET_BLOCKLIST':
            chrome.storage.local.get(['sentinel_blocklist'], (res) => sendResponse(res.sentinel_blocklist || []));
            return true;
        case 'REMOVE_FROM_BLOCKLIST':
            chrome.storage.local.get(['sentinel_blocklist'], (res) => {
                const list = (res.sentinel_blocklist || []).filter(i => i.url !== message.url);
                chrome.storage.local.set({ sentinel_blocklist: list }, () => sendResponse({ success: true }));
            });
            return true;
        case 'CLEAR_BLOCKLIST':
            chrome.storage.local.set({ sentinel_blocklist: [] }, () => sendResponse({ success: true }));
            return true;
        case 'UPDATE_API_BASE':
            chrome.storage.local.set(
              { api_base: message.api_base },
              () => sendResponse({ success: true })
            );
            return true;
        case 'GET_CURRENT_SCAN':
            const cacheKey = `url_cache_${message.url}`;
            chrome.storage.local.get(cacheKey, (res) => {
                if (res[cacheKey]) sendResponse(res[cacheKey].result);
                else sendResponse(null);
            });
            return true;
    }
});