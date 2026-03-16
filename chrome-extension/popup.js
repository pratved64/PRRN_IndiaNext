const API_BASE = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', async () => {
    // Check backend health
    checkBackendHealth();

    // Setup Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Initial load for current URL
    await loadCurrentTabStatus();
    
    // Initial load for blocklist
    await updateBlocklistUI();

    // Event Listeners
    document.getElementById('scan-url-btn').addEventListener('click', handleManualUrlScan);
    document.getElementById('scan-text-btn').addEventListener('click', handleTextScan);
    document.getElementById('clear-blocklist-btn').addEventListener('click', handleClearBlocklist);
});

async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health`);
        const statusEl = document.getElementById('backend-status');
        const dotEl = document.getElementById('status-dot');
        
        if (res.ok) {
            statusEl.textContent = 'CONNECTED';
            statusEl.style.color = 'var(--safe)';
            dotEl.className = 'status-indicator connected';
        } else {
            throw new Error('Not OK');
        }
    } catch (e) {
        const statusEl = document.getElementById('backend-status');
        const dotEl = document.getElementById('status-dot');
        statusEl.textContent = 'OFFLINE';
        statusEl.style.color = 'var(--malicious)';
        dotEl.className = 'status-indicator disconnected';
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
}

function formatVerdict(verdictRaw) {
    let cls = 'SAFE';
    let label = 'SAFE';
    
    if (verdictRaw && (verdictRaw.includes('Medium') || verdictRaw === 'SUSPICIOUS')) {
        cls = 'SUSPICIOUS';
        label = 'SUSPICIOUS';
    } else if (verdictRaw && (verdictRaw.includes('High') || verdictRaw === 'MALICIOUS')) {
        cls = 'MALICIOUS';
        label = 'MALICIOUS';
    }
    
    return `<div class="verdict-banner verdict-${cls}">${label}</div>`;
}

function formatScore(score) {
    if (score === '--') return '--';
    let color = 'var(--safe)';
    if (score >= 40) color = 'var(--suspicious)';
    if (score >= 70) color = 'var(--malicious)';
    return `<span style="color: ${color}">${score}/100</span>`;
}

function truncateUrl(url, maxLen = 40) {
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
}

function timeAgo(isoString) {
    const min = Math.round((new Date() - new Date(isoString)) / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min} min ago`;
    const form = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' });
    return form.format(new Date(isoString));
}

async function loadCurrentTabStatus() {
    const urlTextEl = document.getElementById('current-url-text');
    const bannerEl = document.getElementById('verdict-banner');
    const scoreEl = document.getElementById('risk-score');
    const expEl = document.getElementById('explanation-text');

    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tabs || tabs.length === 0) return;
    const currentUrl = tabs[0].url;

    if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('about:')) {
        urlTextEl.textContent = 'System Page — Not Scanned';
        bannerEl.innerHTML = '';
        scoreEl.innerHTML = '--';
        expEl.textContent = '';
        return;
    }

    urlTextEl.textContent = truncateUrl(currentUrl, 50);
    bannerEl.innerHTML = '<div class="spinner"></div> SCANNING...';

    // Check Chrome Storage for current URL result
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_SCAN', url: currentUrl }, (response) => {
        if (response) {
             renderScanResult(response, bannerEl, scoreEl, expEl);
        } else {
             // Request scan
             chrome.runtime.sendMessage({ type: 'SCAN_URL', url: currentUrl }, (res) => {
                 if (res && res.error) {
                     bannerEl.innerHTML = '<div class="verdict-banner" style="background:#64748b;color:white">SCAN FAILED</div>';
                     expEl.textContent = 'Could not scan this URL. Check that backend is running.';
                     scoreEl.innerHTML = '--';
                 } else if (res) {
                     renderScanResult(res, bannerEl, scoreEl, expEl);
                     updateBlocklistUI(); // Update count
                 }
             });
        }
    });
}

function renderScanResult(data, bannerEl, scoreEl, expEl) {
    const riskScore = Math.round(data.risk_score * 100);
    bannerEl.innerHTML = formatVerdict(data.classification);
    scoreEl.innerHTML = formatScore(riskScore);
    
    let html = data.classification + '<br><br>';
    if (data.highlighted_words && data.highlighted_words.length > 0) {
        html += '<b>Key Suspicious Elements:</b> ' + data.highlighted_words.map(w => w.word).join(', ');
    }
    expEl.innerHTML = html;
}

// Handlers
async function handleManualUrlScan() {
    const input = document.getElementById('manual-url-input');
    const url = input.value.trim();
    if (!url) return;
    
    // Switch UI temporarily to current card
    const urlTextEl = document.getElementById('current-url-text');
    const bannerEl = document.getElementById('verdict-banner');
    const scoreEl = document.getElementById('risk-score');
    const expEl = document.getElementById('explanation-text');
    
    urlTextEl.textContent = truncateUrl(url, 50);
    bannerEl.innerHTML = '<div class="spinner"></div> SCANNING...';
    scoreEl.innerHTML = '--';
    expEl.textContent = '';
    
    chrome.runtime.sendMessage({ type: 'SCAN_URL', url: url }, (res) => {
        if (res && res.error) {
            bannerEl.innerHTML = '<div class="verdict-banner" style="background:#64748b;color:white">SCAN FAILED</div>';
            expEl.textContent = 'Could not scan this URL. Check that backend is running.';
            scoreEl.innerHTML = '--';
        } else if (res) {
            renderScanResult(res, bannerEl, scoreEl, expEl);
            updateBlocklistUI();
        }
    });
}

async function handleTextScan() {
    const text = document.getElementById('text-input').value.trim();
    if (!text) return;
    
    const btn = document.getElementById('scan-text-btn');
    btn.innerHTML = '<div class="spinner"></div> ANALYZING...';
    
    chrome.runtime.sendMessage({ type: 'SCAN_TEXT', text: text }, (res) => {
        btn.innerHTML = 'ANALYZE FOR PHISHING';
        const resultCard = document.getElementById('text-result-card');
        
        if (res && res.error) {
            resultCard.style.display = 'block';
            document.getElementById('text-verdict').innerHTML = '<div style="color:var(--malicious)">FAILED</div>';
            document.getElementById('text-confidence').innerHTML = '';
            document.getElementById('text-explanation').textContent = 'Could not scan this text. Check that backend is running.';
            return;
        }
        
        resultCard.style.display = 'block';
        document.getElementById('text-verdict').innerHTML = formatVerdict(res.classification);
        document.getElementById('text-confidence').innerHTML = `Confidence: ${Math.round(res.risk_score * 100)}%`;
        
        let html = res.classification;
        if (res.highlighted_words) {
            html += '<br><br><b>Suspect Phrases:</b> ' + res.highlighted_words.map(w => w.word).join(', ');
        }
        document.getElementById('text-explanation').innerHTML = html;
    });
}

async function updateBlocklistUI() {
    chrome.runtime.sendMessage({ type: 'GET_BLOCKLIST' }, (items) => {
        document.getElementById('blocklist-count').textContent = items.length;
        
        const container = document.getElementById('blocklist-container');
        const empty = document.getElementById('blocklist-empty');
        
        container.innerHTML = '';
        
        if (items.length === 0) {
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = `blocklist-item ${item.verdict}`;
            
            el.innerHTML = `
               <div class="item-domain">${item.domain}</div>
               <div class="item-url">${truncateUrl(item.url, 40)}</div>
               <div class="item-meta">
                   <span class="item-badge ${item.verdict}">${item.verdict}</span>
                   <span class="score-value" style="font-size:12px">${formatScore(item.risk_score)}</span>
                   <span class="item-time">${timeAgo(item.scanned_at)}</span>
               </div>
               <button class="remove-btn" title="Remove">✕</button>
            `;
            
            el.querySelector('.remove-btn').addEventListener('click', () => {
                chrome.runtime.sendMessage({ type: 'REMOVE_FROM_BLOCKLIST', url: item.url }, () => {
                    updateBlocklistUI();
                });
            });
            
            container.appendChild(el);
        });
    });
}

async function handleClearBlocklist() {
    if (confirm("Clear all scanned URLs?")) {
        chrome.runtime.sendMessage({ type: 'CLEAR_BLOCKLIST' }, () => {
            updateBlocklistUI();
        });
    }
}
