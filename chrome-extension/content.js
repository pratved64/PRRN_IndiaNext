// Content Script for abhedya.sec Extension

// Ensure we don't duplicate styles
if (!document.getElementById('abhedya-styles')) {
    const style = document.createElement('style');
    style.id = 'abhedya-styles';
    style.textContent = `
      #abhedya-threat-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 999999;
        background: rgba(10, 0, 0, 0.97);
        color: #f1f5f9;
        font-family: system-ui, -apple-system, monospace;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        
        background-color: #0a0f1e;
        background-size: 40px 40px;
        background-image: linear-gradient(
          to right, rgba(255,0,0,0.05) 1px, 
          transparent 1px),
          linear-gradient(
          to bottom, rgba(255,0,0,0.05) 1px, 
          transparent 1px);
      }
      .abhedya-overlay-content {
        max-width: 600px;
        padding: 40px;
        background: #111827;
        border: 1px solid #ef4444;
        border-radius: 12px;
        box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);
        animation: abhedyaFadeIn 0.3s ease-out;
      }
      
      @keyframes abhedyaFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
      }
      
      .abhedya-shield-icon {
        font-size: 64px;
        color: #ef4444;
        margin-bottom: 20px;
        filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.6));
      }
      
      .abhedya-overlay-content h1 {
        color: #ef4444;
        font-size: 32px;
        margin: 0 0 16px;
        letter-spacing: 2px;
        font-family: 'Courier New', monospace;
      }
      
      .abhedya-url-display {
        font-size: 18px;
        color: #94a3b8;
        word-break: break-all;
        margin-bottom: 24px;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
      }
      
      .abhedya-verdict-badge {
        display: inline-block;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        color: #ef4444;
        padding: 8px 16px;
        border-radius: 4px;
        font-weight: bold;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      
      .abhedya-risk-score {
        font-size: 48px;
        font-weight: 900;
        color: #ef4444;
        margin-bottom: 16px;
      }
      
      .abhedya-explanation {
        color: #f1f5f9;
        margin-bottom: 32px;
        line-height: 1.6;
      }
      
      .abhedya-button-row {
        display: flex;
        gap: 16px;
        justify-content: center;
        margin-bottom: 24px;
      }
      
      .abhedya-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-family: monospace;
        font-size: 14px;
        cursor: pointer;
        text-transform: uppercase;
        font-weight: bold;
        transition: all 0.2s;
      }
      
      #go-back-btn {
        background: #6366f1;
        color: white;
      }
      #go-back-btn:hover {
        background: #4f46e5;
        box-shadow: 0 0 15px rgba(99,102,241,0.5);
      }
      
      #proceed-btn {
        background: transparent;
        color: #94a3b8;
        border: 1px solid #94a3b8;
      }
      #proceed-btn:hover {
        background: rgba(255,255,255,0.05);
        color: #ef4444;
        border-color: #ef4444;
      }
      
      .abhedya-powered-by {
        color: #64748b;
        font-size: 12px;
        font-family: monospace;
      }
    `;
    
    // Inject styles as soon as document head exists
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
             document.head.appendChild(style);
        });
    }
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_WARNING') {
        if (document.body) {
            showWarningOverlay(message.data);
        } else {
            // Use MutationObserver for high-performance body detection
            const observer = new MutationObserver((mutations, obs) => {
                if (document.body) {
                    showWarningOverlay(message.data);
                    obs.disconnect();
                }
            });
            observer.observe(document.documentElement, { childList: true });
            
            // Fallback timeout
            setTimeout(() => observer.disconnect(), 10000);
        }
    }
    if (message.type === 'HIDE_WARNING') {
        hideWarningOverlay();
    }
});

function showWarningOverlay(data) {
    if (document.getElementById('abhedya-threat-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'abhedya-threat-overlay';
    
    overlay.innerHTML = `
      <div class="abhedya-overlay-content">
        <div class="abhedya-shield-icon">🛡️</div>
        <h1>THREAT DETECTED</h1>
        <div class="abhedya-url-display">${data.url}</div>
        <div class="abhedya-verdict-badge">${data.verdict}</div>
        <div class="abhedya-risk-score">${data.score}/100</div>
        <div class="abhedya-explanation">${data.explanation}</div>
        <div class="abhedya-button-row">
          <button id="go-back-btn" class="abhedya-btn">← GO BACK</button>
          <button id="proceed-btn" class="abhedya-btn">PROCEED ANYWAY (UNSAFE)</button>
        </div>
        <div class="abhedya-powered-by">Protected by abhedya.sec</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Block scrolling
    document.body.style.overflow = 'hidden';
    
    document.getElementById('go-back-btn').addEventListener('click', () => {
        window.history.back();
        // Failsafe if history.back doesn't work (e.g. no history)
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 500);
    });
    
    document.getElementById('proceed-btn').addEventListener('click', () => {
        // Remove overlay
        hideWarningOverlay();
    });
}

function hideWarningOverlay() {
    const overlay = document.getElementById('abhedya-threat-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}
