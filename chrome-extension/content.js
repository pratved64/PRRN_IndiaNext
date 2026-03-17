// content.js — abhedya.sec warning overlay
// Listener must be at TOP LEVEL for MV3

chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
    if (message.type === 'SHOW_WARNING') {
      showWarningBanner(message.data);
      sendResponse({ received: true });
    }
    return true;
  }
);

function showWarningBanner(data) {
  // Remove any existing banner
  const existing = document.getElementById(
    'abhedya-sec-warning'
  );
  if (existing) existing.remove();

  // Extract display values safely
  const domain = (() => {
    try { return new URL(data.url).hostname; }
    catch(e) { return data.url || 'this site'; }
  })();
  
  const score = data.score || 0;
  const explanation = data.explanation || 
    'Malicious content detected';

  // Create banner with all inline styles
  // (no external CSS — works on any page)
  const banner = document.createElement('div');
  banner.id = 'abhedya-sec-warning';
  
  // Use all:initial to reset any page styles
  banner.setAttribute('style', [
    'all:initial',
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:2147483647',
    'background:#0a0a0a',
    'border-bottom:2px solid #ef4444',
    'padding:14px 20px',
    'font-family:monospace',
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'box-shadow:0 4px 40px rgba(239,68,68,0.35)',
    'box-sizing:border-box',
    'gap:12px'
  ].join(';'));

  banner.innerHTML = `
    <div style="
      display:flex;
      align-items:center;
      gap:12px;
      font-family:monospace;
      flex:1;
      min-width:0
    ">
      <span style="
        background:#ef4444;
        color:#ffffff;
        padding:5px 12px;
        border-radius:4px;
        font-size:11px;
        font-weight:bold;
        letter-spacing:1px;
        white-space:nowrap;
        font-family:monospace
      ">⚠ THREAT DETECTED</span>
      <div style="
        font-family:monospace;
        min-width:0;
        flex:1
      ">
        <div style="
          color:#ef4444;
          font-weight:bold;
          font-size:14px;
          font-family:monospace;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis
        ">${domain}</div>
        <div style="
          color:#94a3b8;
          font-size:11px;
          margin-top:3px;
          font-family:monospace;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis
        ">
          Risk Score: ${score}/100 
          &nbsp;·&nbsp; 
          ${explanation}
        </div>
      </div>
    </div>
    <div style="
      display:flex;
      gap:8px;
      flex-shrink:0
    ">
      <button id="abhedya-leave-btn" style="
        all:initial;
        background:#ef4444;
        color:#ffffff;
        border:none;
        padding:9px 18px;
        border-radius:4px;
        cursor:pointer;
        font-family:monospace;
        font-size:12px;
        font-weight:bold;
        white-space:nowrap;
        display:inline-block
      ">← Leave Site</button>
      <button id="abhedya-dismiss-btn" style="
        all:initial;
        background:transparent;
        color:#475569;
        border:1px solid rgba(255,255,255,0.12);
        padding:9px 14px;
        border-radius:4px;
        cursor:pointer;
        font-family:monospace;
        font-size:11px;
        white-space:nowrap;
        display:inline-block
      ">Dismiss</button>
    </div>
  `;

  // Push body content down
  try {
    document.body.style.marginTop = '64px';
    document.body.style.transition = 
      'margin-top 200ms ease';
  } catch(e) {}

  try {
    document.body.insertBefore(
      banner, 
      document.body.firstChild
    );
  } catch(e) {
    // If body not ready, append to documentElement
    try {
      document.documentElement.appendChild(banner);
    } catch(e2) {
      console.error('[abhedya] Cannot inject banner');
    }
  }

  // Wire up buttons after DOM insertion
  setTimeout(() => {
    const leaveBtn = document.getElementById(
      'abhedya-leave-btn'
    );
    const dismissBtn = document.getElementById(
      'abhedya-dismiss-btn'
    );
    
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        window.history.back();
      });
    }
    
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        const b = document.getElementById(
          'abhedya-sec-warning'
        );
        if (b) b.remove();
        try {
          document.body.style.marginTop = '0';
        } catch(e) {}
      });
    }
  }, 0);
}
