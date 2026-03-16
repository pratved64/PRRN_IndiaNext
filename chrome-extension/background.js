const API_BASE = 'http://localhost:8000';

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
  chrome.storage.local.get(['sentinel_blocklist'], (result) => {
    if (!result.sentinel_blocklist) {
      chrome.storage.local.set({ sentinel_blocklist: [] });
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
  try {
    if (tabId) {
      chrome.action.setBadgeBackgroundColor({color: '#6366f1', tabId});
      chrome.action.setBadgeText({text: '...', tabId});
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
}

setTimeout(testEndpoints, 3000);