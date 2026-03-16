document.addEventListener('DOMContentLoaded', () => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url') || 'Unknown URL';
    const score = params.get('score') || '--';
    const verdict = params.get('verdict') || 'MALICIOUS';
    const explanation = params.get('explanation') || 'This site has been flagged as highly malicious by the abhedya.sec defense system.';

    // Populate DOM
    document.getElementById('blocked-url').textContent = url;
    document.getElementById('blocked-verdict').textContent = verdict;
    document.getElementById('blocked-score').textContent = `${score}/100`;
    document.getElementById('blocked-explanation').textContent = explanation;

    // Handlers
    document.getElementById('go-back-btn').addEventListener('click', () => {
        window.history.back();
        // Fallback for no history
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 500);
    });

    document.getElementById('proceed-link').addEventListener('click', (e) => {
        e.preventDefault();
        
        // Log bypass if needed, then redirect
        if (url !== 'Unknown URL') {
            window.location.href = url;
        }
    });
});
