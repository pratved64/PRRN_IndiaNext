Phase 1: Environment & Initialization
Before writing the core logic, get the heavy lifting libraries installed and the models downloaded so you aren't waiting on gigabytes of data later.

Step 1.1: Install Dependencies. Set up your virtual environment and install the required stack: torch, transformers, captum (for explainability), beautifulsoup4 (for sanitization), and fastapi.

Step 1.2: Model Acquisition. Write a quick setup script to download and cache the cybersectony/phishing-email-detection-distilbert_v2.4.1 model and its corresponding DistilBertTokenizer from Hugging Face.

Phase 2: The Preprocessing Engine
Raw emails are incredibly noisy. This phase ensures the model only sees the semantic threat, not the formatting.

Step 2.1: HTML Sanitization. Create a clean_text(raw_input) function. Use BeautifulSoup to strip out all <div>, <br>, and <script> tags, returning only plain text.

Step 2.2: Tokenization. Pass the cleaned text to your DistilBertTokenizer.

Step 2.3: Implement the "Head + Tail" Truncation. Write the logic to check if the token length exceeds 512. If it does, slice the array to grab the first 254 tokens and the last 254 tokens, concatenate them, and add the special [CLS] and [SEP] tokens.

Phase 3: Inference & Explainability (The Core)
This is where the PyTorch magic happens. You are running the classification and extracting the "why" simultaneously.

Step 3.1: The Forward Pass. Pass your truncated token tensor into the DistilBERT model. Apply a Softmax function to the output logits to get your raw probability score (e.g., 0.98 Phishing).

Step 3.2: Initialize Captum. Set up LayerIntegratedGradients from the Captum library, pointing it directly at the embedding layer of your DistilBERT model.

Step 3.3: Calculate Attributions. Run the Captum attribution method on your input tensor. This will calculate the gradient of the output prediction with respect to each individual input token.

Step 3.4: Aggregate Word Scores. Sub-word tokens (like ##ing) need their attribution scores summed up to represent the whole word. Map the calculated attribution numbers back to the human-readable words.

Phase 4: API Construction
Wrap your PyTorch logic into a clean, asynchronous web endpoint that your Next.js dashboard can easily consume.

Step 4.1: Define Pydantic Models. Create a ThreatRequest schema (expecting a text string) and a ThreatResponse schema (outputting risk_score, classification, and a list of highlighted_words with their scores).

Step 4.2: Build the FastAPI Route. Create a @app.post("/analyze/text") endpoint.

Step 4.3: Add the Translation Layer. Map the raw probability score to a string response for the frontend (e.g., > 0.75 returns "High Risk: Phishing Attempt Detected").

Phase 5: Testing & Edge Cases
Ensure the pipeline doesn't crash before you hook it up to the UI.

Step 5.1: The Benign Test. Feed it a standard, boring corporate email. Verify the score is low and no words are heavily highlighted.

Step 5.2: The Malicious Test. Feed it a known phishing payload (e.g., "URGENT: Your account will be suspended in 24 hours. Click here to verify."). Verify the score is high and words like "URGENT" and "suspended" carry the highest attribution weights.

Step 5.3: The Overload Test. Paste 2,000 words of gibberish to ensure your Head+Tail truncation logic catches it without throwing a PyTorch tensor size error.