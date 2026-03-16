// URL scan endpoint: POST /api/analyze/url
// URL scan request: { url: string }
// URL scan response: { risk_score, classification, original_url, resolved_url, highlighted_words }
// Text scan endpoint: POST /api/analyze/text
// Text scan request: { text: string }
// Text scan response: { risk_score, classification, highlighted_words }

const API_BASE = 'http://localhost:8000';

// Initialize defaults in storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sentinel_blocklist'], (result) => {
    if (!result.sentinel_blocklist) {
      chrome.storage.local.set({ sentinel_blocklist: [] });
    }
  });
});

// SECTION B — URL Auto-Scanning
let scanTimeoutId = null;
chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    // Only scan main frame navigations
    if (details.frameId !== 0) return;
    
    const url = details.url;
    
    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') ||
        url.startsWith('about:')) return;
        
    // Debounce rapid navigation
    if (scanTimeoutId) clearTimeout(scanTimeoutId);
    
    scanTimeoutId = setTimeout(async () => {
        await scanURL(url, details.tabId);
    }, 500);
  }
);

async function scanURL(url, tabId) {
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
        
        const response = await fetch(`${API_BASE}/api/analyze/url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Non-200 response');
        
        const data = await response.json();
        
        // Save to cache
        await chrome.storage.local.set({
            [cacheKey]: {
                timestamp: new Date().getTime(),
                result: data
            }
        });
        
        // Add to blocklist / history
        await addToBlocklist({
            url: url,
            domain: new URL(url).hostname,
            verdict: getVerdictFromClassification(data.classification),
            risk_score: Math.round(data.risk_score * 100),
            scanned_at: new Date().toISOString(),
            auto_added: true
        });

        handleScanResult(data, url, tabId);
        return data;
        
    } catch (err) {
        console.error("Scan failed config", err);
        if (tabId) {
            chrome.action.setBadgeBackgroundColor({color: '#64748b', tabId});
            chrome.action.setBadgeText({text: 'ERR', tabId});
        }
        
        return { error: err.message };
    }
}

function getVerdictFromClassification(cls) {
    if (cls.includes('High')) return 'MALICIOUS';
    if (cls.includes('Medium')) return 'SUSPICIOUS';
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
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Threat Detected',
              message: `abhedya.sec blocked a malicious site: ${new URL(url).hostname}`
            });
            
            chrome.tabs.sendMessage(tabId, {
                type: 'SHOW_WARNING',
                data: {
                    url: url,
                    score: Math.round(data.risk_score * 100),
                    verdict: verdict,
                    explanation: data.classification
                }
            });
        }
    }
}


// SECTION C — Blocklist management
async function addToBlocklist(urlData) {
    const listRaw = await chrome.storage.local.get(['sentinel_blocklist']);
    let list = listRaw.sentinel_blocklist || [];
    
    // Dedup
    list = list.filter(item => item.url !== urlData.url);
    list.unshift(urlData);
    
    // Max size 500
    if (list.length > 500) {
        list = list.slice(0, 500);
    }
    
    await chrome.storage.local.set({ sentinel_blocklist: list });
}

async function getBlocklist() {
    const listRaw = await chrome.storage.local.get(['sentinel_blocklist']);
    return listRaw.sentinel_blocklist || [];
}

async function removeFromBlocklist(url) {
    let list = await getBlocklist();
    list = list.filter(item => item.url !== url);
    await chrome.storage.local.set({ sentinel_blocklist: list });
}

async function clearBlocklist() {
    await chrome.storage.local.set({ sentinel_blocklist: [] });
}


// SECTION D — Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    }
});


// SECTION E — Text phishing scan
async function scanText(text) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API_BASE}/api/analyze/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Non-200 response');
        
        return await response.json();
    } catch (err) {
        console.error("Text scan failed", err);
        return { error: err.message };
    }
}
