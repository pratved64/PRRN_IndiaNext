import asyncio
from pipelines.phishing.phishing import analyze_email
import json
import traceback
def run_tests():
    print("--- Starting Phase 5 Tests ---")

    # Step 5.1: The Benign Test
    print("\n[Test 1: Benign Email]")
    benign_text = """
    Hi Team,
    
    Just a reminder that we have our sprint planning meeting at 10 AM tomorrow in the main conference room. 
    Please make sure to update your JIRA tickets before the meeting.
    
    Thanks,
    Sarah
    """
    try:
        res1 = analyze_email(benign_text)
        print(f"Risk Score: {res1['risk_score']:.4f}")
        print(f"Top 3 Attributions: {res1['highlighted_words'][:3]}")
    except Exception as e:
        print(f"Failed Test 1:")
        traceback.print_exc()

    # Step 5.2: The Malicious Test
    print("\n[Test 2: Malicious Email]")
    malicious_text = """
    <div>
        <b>URGENT ACTION REQUIRED</b><br>
        Your corporate account will be suspended in 24 hours due to suspicious activity. <br>
        <a href="http://evil-phishing-site.com/login">Click here to verify your identity immediately</a> or lose access.
    </div>
    """
    try:
        res2 = analyze_email(malicious_text)
        print(f"Risk Score: {res2['risk_score']:.4f}")
        print(f"Top 3 Attributions: {res2['highlighted_words'][:3]}")
    except Exception as e:
        print(f"Failed Test 2:")
        traceback.print_exc()

    # Step 5.3: The Overload Test
    print("\n[Test 3: Overload Email (> 512 tokens)]")
    # Generate a massive string of gibberish
    overload_text = "urgent " * 600 + " suspended " * 600
    try:
        res3 = analyze_email(overload_text)
        print(f"Risk Score: {res3['risk_score']:.4f}")
        print("Success: Truncation logic worked without index/tensor errors.")
        print(f"Top 3 Attributions: {res3['highlighted_words'][:3]}")
    except Exception as e:
        print(f"Failed Test 3:")
        traceback.print_exc()

if __name__ == "__main__":
    run_tests()
