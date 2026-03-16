Phase 1: Shared State & Initialization
Since both the /analyze/text and /analyze/url endpoints will use the same model, we need to ensure FastAPI loads the model into memory exactly once when the server starts, rather than loading it on every request.

Step 1.1: The Lifespan Manager. Use FastAPI's lifespan context manager (or startup events) to load the cybersectony/phishing-email-detection-distilbert_v2.4.1 model and tokenizer globally.

Step 1.2: Shared Inference Function. Create a core PyTorch inference function that accepts a string, runs the DistilBERT forward pass, runs Captum, and returns the JSON. Both your text and URL API endpoints will call this exact same function.

Phase 2: The URL-Specific Preprocessing Engine
This is where the URL pipeline diverges from the text pipeline. You cannot just pass a raw URL straight into the model if it's hidden behind a shortener.

Step 2.1: The Async Resolver. Write an asynchronous function using httpx (do not use the synchronous requests library, or it will block your FastAPI event loop). This function needs to send an HTTP HEAD request to follow redirects (e.g., expanding https://bit.ly/3xyz into its true destination).

Step 2.2: Loopback Protection. Add a quick regex or string check to ensure the resolved URL isn't pointing to localhost, 127.0.0.1, or an internal network IP. Attackers will sometimes feed your API internal IPs to try and scan your hackathon server's open ports (Server-Side Request Forgery).

Step 2.3: Tokenization. Pass the fully resolved URL into the shared DistilBertTokenizer. Since URLs rarely exceed 512 tokens, you can safely skip the complex Head+Tail truncation logic here.

Phase 3: Inference & Explainability (The Subword Challenge)
The model execution is identical to the text pipeline, but interpreting the XAI output requires a specific fix for the Next.js dashboard.

Step 3.1: The Forward Pass. Pass the tokenized URL tensor into the shared DistilBERT model to get the confidence score.

Step 3.2: Integrated Gradients. Run Captum to get the attribution weights for the URL's tokens.

Step 3.3: The Subword Reconstructor (Crucial). DistilBERT uses WordPiece tokenization. If it sees netflix-billing-update, it will chop it into tokens like net, ##flix, -, bill, ##ing, -, update. If you send those raw tokens back to the frontend, the UI will look broken. Write a quick loop to stitch the ## tokens back together while maintaining their combined attribution scores.

Phase 4: API Construction
Build the dedicated endpoint to handle the UI's URL requests.

Step 4.1: Define Pydantic Models. Create a UrlRequest schema.

Step 4.2: Build the Route. Create an @app.post("/analyze/url") endpoint.

Step 4.3: The Execution Flow. Inside the route:

Call the async resolver.

Pass the resolved string to the shared inference function.

Return a standardized JSON payload: risk_score, original_url, resolved_url, and the highlighted_tokens array.

Phase 5: Testing & Edge Cases
URLs fail in different ways than text blocks. Test these specifically.

Step 5.1: The Shortener Test. Input a tinyurl.com link that redirects to a safe site, and one that redirects to a malicious site. Ensure the resolver unmasks both and the model scores the destination, not the shortener.

Step 5.2: The Timeout Test. Pass a URL to a server that doesn't exist. Your httpx resolver needs a strict timeout=3.0 setting so it fails gracefully and returns an error to the user, rather than hanging your API forever.

Step 5.3: The Obfuscation Test. Input a raw IP address URL (e.g., http://192.168.1.1/login). Verify if the DistilBERT model inherently flags this as suspicious, as it lacks standard domain semantics.