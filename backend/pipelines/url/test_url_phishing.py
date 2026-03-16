r"""
Phase 5: URL Pipeline - Testing & Edge Cases
Run from backend/ with:
  $env:PYTHONPATH='c:\Users\vedpr\Workspace\PRRN_IndiaNext\backend'
  .\.venv\Scripts\python.exe .\pipelines\url\test_url_phishing.py
"""
import asyncio
import traceback
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from pipelines.url.url_resolver import resolve_url, is_internal_url
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pipelines.phishing.phishing import analyze_email

MODEL_NAME = "cybersectony/phishing-email-detection-distilbert_v2.4.1"

# Load model once for local testing
print("Loading model for tests...")
_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
_model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
_model.eval()
print("Model loaded.\n")


async def run_tests():
    print("=== Phase 5: URL Pipeline Tests ===\n")

    # --- Step 5.1: The Shortener Test ---
    print("[Test 5.1: Shortener Test]")
    # A known safe TinyURL redirect (points to https://www.google.com)
    test_short_url = "https://tinyurl.com/2p8yef4n"
    try:
        resolved = await resolve_url(test_short_url)
        print(f"  Original:  {test_short_url}")
        print(f"  Resolved:  {resolved}")
        result = analyze_email(resolved, _model, _tokenizer)
        print(f"  Risk Score: {result['risk_score']:.4f}")
        print(f"  Top 3 Attributions: {result['highlighted_words'][:3]}")
    except Exception:
        print("  Failed:")
        traceback.print_exc()

    print()

    # --- Step 5.2: The Timeout Test ---
    print("[Test 5.2: Timeout Test]")
    # Non-routable IP — will hang without timeout, should fail gracefully in 3s
    timeout_url = "http://10.255.255.1/login"
    try:
        # First check SSRF protection catches it pre-request
        if is_internal_url(timeout_url):
            print(f"  SSRF block triggered for: {timeout_url}")
        else:
            resolved = await resolve_url(timeout_url)
            print(f"  Unexpectedly resolved: {resolved}")
    except ValueError as e:
        print(f"  SSRF blocked (expected): {e}")
    except Exception as e:
        print(f"  Timeout/Error (expected): {type(e).__name__}: {e}")

    print()

    # --- Step 5.3: The Obfuscation Test (raw IP URL) ---
    print("[Test 5.3: Obfuscation Test (Raw IP)]")
    # Raw IP URL — not localhost, so passes SSRF. Model should flag it as suspicious.
    raw_ip_url = "http://185.220.101.50/login?user=admin"
    try:
        resolved = await resolve_url(raw_ip_url)
        print(f"  Resolved: {resolved}")
        result = analyze_email(resolved, _model, _tokenizer)
        print(f"  Risk Score: {result['risk_score']:.4f}")
        print(f"  Top 3 Attributions: {result['highlighted_words'][:3]}")
    except Exception:
        print("  Failed:")
        traceback.print_exc()

    print("\n=== All tests complete ===")


if __name__ == "__main__":
    asyncio.run(run_tests())
