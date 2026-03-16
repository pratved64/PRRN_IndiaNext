# abhedya.sec — Cyber Threat Shield (Chrome Extension)

This extension provides real-time URL and phishing detection powered by the abhedya.sec AI engine. It automatically scans every website you visit and blocks malicious content before it loads.

## Installation Guide
1. Open Chrome and navigate to \`chrome://extensions\`
2. Enable "**Developer mode**" (top right toggle)
3. Click "**Load unpacked**"
4. Select the \`chrome-extension/\` folder
5. Pin the extension to your toolbar for easy access!
6. Ensure the abhedya.sec backend is running at \`http://localhost:8000\`
7. Browse any website — the extension will automatically scan and show a badge.

## Configuration for Production API
To change the backend URL for production:
1. Open \`background.js\`
2. Change \`API_BASE\` at the top of the file to your deployed backend URL.
3. Save the file.
4. Go back to \`chrome://extensions\` and click the reload icon (↻) on the abhedya.sec extension.

## Testing Your Extension
### Feature 1: Automatic URL Checking
- Visit a normal site (e.g., \`example.com\`) → It should show a green **SAFE** badge.
- When you visit a known phishing or malicious URL, a full-screen red \`THREAT BLOCKED\` warning overlay will trigger and block the page.
- Note: URL results are cached for 60 minutes to improve performance.

### Feature 2: Phishing Text Scanner
- Open the extension popup by clicking the icon.
- Click the **TEXT SCAN** tab.
- Paste suspicious sms/email text and click **ANALYZE**.
- It returns a verdict, confidence, and highlighted suspicious phrasing.

### Feature 3: Scanned URL History / Blocklist
- Click the **BLOCKLIST** tab in the popup to see a history of all flagged/scanned URLs.
- You can clear the history at any time.

## Permissions Explained
- \`activeTab\`: Allows reading the URL of the tab you click the extension on.
- \`tabs\`: Needed to monitor tab navigation asynchronously.
- \`storage\`: Saves scan results, cache, and the blocklist history on your device locally.
- \`notifications\`: Used to alert you instantly when a high-risk URL is detected and blocked.
- \`webNavigation\`: Required to detect background page loads and iframe navigations.
- \`host_permissions <all_urls>\`: Allows the extension to scan *any* URL across the internet via the backend pipeline.
