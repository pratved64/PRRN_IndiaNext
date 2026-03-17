document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const blockedUrl = params.get('url') || '';
    const score = parseInt(params.get('score')) || 0;
    const classification = params.get('classification') || 'High Risk: Phishing Attempt Detected';

    let domain = blockedUrl;
    try { domain = new URL(blockedUrl).hostname; }
    catch(e) {}

    // Populate DOM
    document.getElementById('blocked-url').textContent = domain;
    document.getElementById('blocked-verdict').textContent = classification;
    document.getElementById('blocked-score').textContent = `${score}/100`;
    document.getElementById('blocked-explanation').textContent = classification;

    // Handlers
    document.getElementById('go-back-btn').addEventListener('click', () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });

    document.getElementById('proceed-link').addEventListener('click', (e) => {
        e.preventDefault();
        
        // Step 1 — Show confirmation logic
        const buttonRow = document.querySelector('.button-row');
        buttonRow.innerHTML = `
            <div style="flex-direction:column; gap:16px; width:100%; display:flex; align-items:center">
                <p style="color:#f59e0b; font-weight:bold; font-size:14px; margin-bottom:12px; text-align:center">
                    ⚠ You are about to visit a site flagged as malicious. abhedya.sec is not responsible for harm caused.
                </p>
                <div style="display:flex; gap:12px">
                    <button id="confirm-cancel" class="btn" style="background:#64748b">Cancel — Take Me Back</button>
                    <button id="confirm-proceed" class="btn primary" style="background:#ef4444">I Accept the Risk — Continue</button>
                </div>
            </div>
        `;

        document.getElementById('confirm-cancel').addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        });

        document.getElementById('confirm-proceed').addEventListener('click', () => {
            if (blockedUrl) {
                window.location.href = blockedUrl;
            }
        });
    });
});

