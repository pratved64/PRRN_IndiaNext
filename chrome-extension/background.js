<<<<<<< HEAD
const API_BASE = 'http://localhost:8000';
=======
// URL scan endpoint: POST /api/analyze/url
// URL scan request: { url: string }
// URL scan response: { risk_score, classification, original_url, resolved_url, highlighted_words }
// Text scan endpoint: POST /api/analyze/text
// Text scan request: { text: string }
// Text scan response: { risk_score, classification, highlighted_words }

let API_BASE = 'http://localhost:8000';

// Load API_BASE from storage
chrome.storage.local.get(['api_base'], (result) => {
  if (result.api_base) {
    API_BASE = result.api_base;
  } else {
    // Set default to 8001 since 8000 might be in use
    API_BASE = 'http://localhost:8001';
    chrome.storage.local.set({ api_base: API_BASE });
  }
});
>>>>>>> a1a195e (half integration done)

(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    console.log('[abhedya] Backend ONLINE:', JSON.stringify(data));
  } catch(e) {
    console.error('[abhedya] Backend OFFLINE:', e.message);
  }
})();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sentinel_blocklist', 'api_base'], (result) => {
    if (!result.sentinel_blocklist) {
      chrome.storage.local.set({ sentinel_blocklist: [] });
    }
    if (!result.api_base) {
      chrome.storage.local.set({ api_base: 'http://localhost:8000' });
    }
  });
  setTimeout(testEndpoints, 2000);
});

let scanTimeoutId = null;
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const url = details.url;
  if (url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:')) return;
  if (scanTimeoutId) clearTimeout(scanTimeoutId);
  scanTimeoutId = setTimeout(async () => {
    await scanURL(url, details.tabId);
  }, 500);
});

async function scanURL(url, tabId) {
<<<<<<< HEAD
  try {
    if (tabId) {
      chrome.action.setBadgeBackgroundColor({color: '#6366f1', tabId});
      chrome.action.setBadgeText({text: '...', tabId});
=======
    try {
        // Set scanning badge dynamically if tabId exists
        if (tabId) {
            chrome.action.setBadgeBackgroundColor({color: '#6366f1', tabId});
            chrome.action.setBadgeText({text: '...', tabId});
        }
        
        // Check Cache first
        const cacheKey = `url_cache_${url}`;
        const cachedStr = await chrome.storage.local.get(cacheKey);
        
        if (cachedStr[cacheKey]) {
            const cachedData = cachedStr[cacheKey];
            const now = new Date().getTime();
            // Cache valid for 60 minutes
            if (now - cachedData.timestamp < 60 * 60 * 1000) {
               handleScanResult(cachedData.result, url, tabId);
               return cachedData.result;
            }
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        console.log(`Scanning URL: ${url} with API: ${API_BASE}`);
        const response = await fetch(`${API_BASE}/api/analyze/url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Save to cache
        await chrome.storage.local.set({
            [cacheKey]: {
                timestamp: new Date().getTime(),
                result: data
            }
        });
        
        // Safety check for classification
        const classification = data.classification || 'Unknown';
        const hostname = new URL(url).hostname || url;

        // Add to blocklist / history
        await addToBlocklist({
            url: url,
            domain: hostname,
            verdict: getVerdictFromClassification(classification),
            risk_score: Math.round((data.risk_score || 0) * 100),
            scanned_at: new Date().toISOString(),
            auto_added: true
        });
        
        handleScanResult(data, url, tabId);
        return data;
        
    } catch (err) {
        console.error("Scan failed:", err);
        
        // Create error result
        const errorResult = { 
            error: err.message || 'Scan failed',
            classification: 'ERROR',
            risk_score: 0
        };
        
        if (tabId) {
            chrome.action.setBadgeBackgroundColor({color: '#64748b', tabId});
            chrome.action.setBadgeText({text: 'ERR', tabId});
            
            // Show error notification
            try {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Scan Failed',
                    message: `Failed to scan ${new URL(url).hostname}: ${err.message}`
                });
            } catch (e) {
                console.warn("Could not show error notification", e);
            }
        }
        
        return errorResult;
    }
}

        handleScanResult(data, url, tabId);
        return data;
        
    } catch (err) {
        console.error("Scan failed:", err);
        if (tabId) {
            chrome.action.setBadgeBackgroundColor({color: '#64748b', tabId});
            chrome.action.setBadgeText({text: 'ERR', tabId});
        }
        
        return { error: err.message || 'Scan failed' };
>>>>>>> a1a195e (half integration done)
    }
    const cacheKey = `url_cache_${url}`;
    const cached = await chrome.storage.local.get(cacheKey);
    if (cached[cacheKey]) {
      const entry = cached[cacheKey];
      if (Date.now() - entry.timestamp < 3600000) {
        handleScanResult(entry.result, url, tabId);
        return entry.result;
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE}/analyze/url`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const body = await response.text();
      console.error('[abhedya] URL scan failed:', response.status, body);
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
    const data = await response.json();
    console.log('[abhedya] URL scan success:', JSON.stringify(data));
    await chrome.storage.local.set({
      [cacheKey]: { timestamp: Date.now(), result: data }
    });
    const score = normalizeScore(data.risk_score);
    if (score >= 90) {
      await addToBlocklist({
        url,
        domain: new URL(url).hostname,
        verdict: getVerdict(data.classification),
        risk_score: score,
        scanned_at: new Date().toISOString(),
        auto_added: true
      });
    }
    handleScanResult(data, url, tabId);
    return data;
  } catch(err) {
    console.error('[abhedya] scanURL error:', err.message);
    if (tabId) {
      chrome.action.setBadgeBackgroundColor({color: '#64748b', tabId});
      chrome.action.setBadgeText({text: 'ERR', tabId});
    }
    return { error: err.message };
  }
}

<<<<<<< HEAD
async function scanText(text) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE}/analyze/text`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ text }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const body = await response.text();
      console.error('[abhedya] Text scan failed:', response.status, body);
      throw new Error(`HTTP ${response.status}: ${body}`);
    }
    const data = await response.json();
    console.log('[abhedya] Text scan success:', JSON.stringify(data));
    return data;
  } catch(err) {
    console.error('[abhedya] scanText error:', err.message);
    return { error: err.message };
  }
}

function normalizeScore(score) {
  if (score == null) return 0;
  if (score <= 1.0) return Math.round(score * 100);
  return Math.round(score);
}

function getVerdict(cls) {
  if (!cls) return 'SAFE';
  const c = cls.toLowerCase();
  if (c.includes('high') || c.includes('malicious') ||
      c.includes('phishing') || c.includes('dangerous'))
    return 'MALICIOUS';
  if (c.includes('medium') || c.includes('suspicious') ||
      c.includes('warn'))
    return 'SUSPICIOUS';
  return 'SAFE';
}

function handleScanResult(data, url, tabId) {
  const verdict = getVerdict(data.classification);
  if (!tabId) return;
  const colors = {SAFE:'#22c55e', SUSPICIOUS:'#f59e0b', MALICIOUS:'#ef4444'};
  const labels = {SAFE:'SAFE', SUSPICIOUS:'!', MALICIOUS:'RISK'};
  chrome.action.setBadgeBackgroundColor(
    {color: colors[verdict] || '#64748b', tabId}
  );
  chrome.action.setBadgeText(
    {text: labels[verdict] || '?', tabId}
  );
  if (verdict === 'MALICIOUS') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Threat Detected',
      message: `abhedya.sec: malicious site: ${new URL(url).hostname}`
    });
    chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_WARNING',
      data: {
        url,
        score: normalizeScore(data.risk_score),
        verdict,
        explanation: data.classification
      }
    }).catch(() => {});
  }
=======
function getVerdictFromClassification(cls) {
    if (!cls || typeof cls !== 'string') return 'SAFE';
    if (cls.includes('High') || cls.includes('highly')) return 'MALICIOUS';
    if (cls.includes('Medium') || cls.includes('suspicious')) return 'SUSPICIOUS';
    return 'SAFE';
}

function handleScanResult(data, url, tabId) {
    const verdict = getVerdictFromClassification(data.classification);
    
    if (tabId) {
        if (verdict === 'SAFE') {
            chrome.action.setBadgeBackgroundColor({color: '#22c55e', tabId});
            chrome.action.setBadgeText({text: 'SAFE', tabId});
        } else if (verdict === 'SUSPICIOUS') {
            chrome.action.setBadgeBackgroundColor({color: '#f59e0b', tabId});
            chrome.action.setBadgeText({text: '!', tabId});
        } else if (verdict === 'MALICIOUS') {
            chrome.action.setBadgeBackgroundColor({color: '#ef4444', tabId});
            chrome.action.setBadgeText({text: 'RISK', tabId});
            
            // Notify and block
            try {
                const domain = new URL(url).hostname;
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'icons/icon128.png',
                  title: 'Threat Detected',
                  message: `abhedya.sec blocked a malicious site: ${domain}`
                });
            } catch (e) {
                console.warn("Invalid URL for notification", url);
            }
            
            chrome.tabs.sendMessage(tabId, {
                type: 'SHOW_WARNING',
                data: {
                    url: url,
                    score: Math.round((data.risk_score || 0) * 100),
                    verdict: verdict,
                    explanation: data.classification || 'Dangerous content detected.'
                }
            }).catch(err => {
                // Content script might not be ready, let's try to inject it or handle gracefully
                console.log("Could not send warning to tab:", tabId);
            });
        }
    }
>>>>>>> a1a195e (half integration done)
}

async function addToBlocklist(item) {
  const raw = await chrome.storage.local.get(['sentinel_blocklist']);
  let list = raw.sentinel_blocklist || [];
  list = list.filter(i => i.url !== item.url);
  list.unshift(item);
  if (list.length > 500) list = list.slice(0, 500);
  await chrome.storage.local.set({ sentinel_blocklist: list });
}

async function getBlocklist() {
  const raw = await chrome.storage.local.get(['sentinel_blocklist']);
  return raw.sentinel_blocklist || [];
}

async function removeFromBlocklist(url) {
  let list = await getBlocklist();
  list = list.filter(i => i.url !== url);
  await chrome.storage.local.set({ sentinel_blocklist: list });
}

async function clearBlocklist() {
  await chrome.storage.local.set({ sentinel_blocklist: [] });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
<<<<<<< HEAD
  switch(message.type) {
    case 'SCAN_URL':
      scanURL(message.url, null).then(sendResponse);
      return true;
    case 'SCAN_TEXT':
      scanText(message.text).then(sendResponse);
      return true;
    case 'GET_BLOCKLIST':
      getBlocklist().then(sendResponse);
      return true;
    case 'REMOVE_FROM_BLOCKLIST':
      removeFromBlocklist(message.url)
        .then(() => sendResponse({success: true}));
      return true;
    case 'CLEAR_BLOCKLIST':
      clearBlocklist()
        .then(() => sendResponse({success: true}));
      return true;
    case 'GET_CURRENT_SCAN':
      const key = `url_cache_${message.url}`;
      chrome.storage.local.get(key).then(res => {
        sendResponse(res[key]?.result || null);
      });
      return true;
  }
});

async function testEndpoints() {
  console.log('[abhedya] === Testing endpoints ===');
  try {
    const r = await fetch(`${API_BASE}/analyze/url`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url: 'https://google.com'})
    });
    const d = await r.text();
    console.log('[abhedya] URL endpoint:', r.status, d.substring(0, 200));
  } catch(e) {
    console.error('[abhedya] URL endpoint error:', e.message);
  }
  try {
    const r = await fetch(`${API_BASE}/analyze/text`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text: 'urgent click now'})
    });
    const d = await r.text();
    console.log('[abhedya] Text endpoint:', r.status, d.substring(0, 200));
  } catch(e) {
    console.error('[abhedya] Text endpoint error:', e.message);
  }
=======
    switch(message.type) {
        case 'SCAN_URL':
            scanURL(message.url, null).then(res => sendResponse(res));
            return true;
        case 'SCAN_TEXT':
            scanText(message.text).then(res => sendResponse(res));
            return true;
        case 'GET_BLOCKLIST':
            getBlocklist().then(res => sendResponse(res));
            return true;
        case 'REMOVE_FROM_BLOCKLIST':
            removeFromBlocklist(message.url).then(() => sendResponse({success: true}));
            return true;
        case 'CLEAR_BLOCKLIST':
            clearBlocklist().then(() => sendResponse({success: true}));
            return true;
        case 'GET_CURRENT_SCAN':
            const cacheKey = `url_cache_${message.url}`;
            chrome.storage.local.get(cacheKey).then(res => {
                if (res[cacheKey]) sendResponse(res[cacheKey].result);
                else sendResponse(null);
            });
            return true;
        case 'UPDATE_API_BASE':
            API_BASE = message.api_base;
            sendResponse({success: true});
            return true;
    }
});


// SECTION E — Text phishing scan
async function scanText(text) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        console.log(`Scanning text with API: ${API_BASE}`);
        const response = await fetch(`${API_BASE}/api/analyze/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    } catch (err) {
        console.error("Text scan failed", err);
        return { 
            error: err.message || 'Text scan failed',
            classification: 'ERROR',
            risk_score: 0
        };
    }
>>>>>>> a1a195e (half integration done)
}

setTimeout(testEndpoints, 3000);