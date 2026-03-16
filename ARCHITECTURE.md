## PRRN IndiaNext – High-Level Architecture

This document describes the high-level architecture of the PRRN IndiaNext project, with a focus on the backend pipelines under `backend/pipelines`. It is organized by major subsystems and then expanded per pipeline folder.

---

## 1. Backend Overview

- **Unified FastAPI app (`backend/main.py`)**: Central FastAPI application that loads shared ML assets (DistilBERT phishing model, ViT deepfake model) in a lifespan context and exposes a single API surface under `/api`. It mounts routers from each pipeline (phishing, URL, deepfake media, deepfake audio, prompt injection, Sentinel behavior analytics) and provides a unified health endpoint `/api/health`.
- **Shared application state**: Heavy models and processors (e.g., `model`, `tokenizer`, `vit_model`, `vit_processor`, Sentinel managers) are stored on `app.state`, so all routes reuse the same in-memory instances instead of reloading per request.
- **Error handling and performance**: Heavy CPU/GPU work is offloaded to worker threads using `anyio.to_thread.run_sync` from async endpoints, and each pipeline is expected to fail gracefully with structured HTTP errors instead of crashing the process.

---

## 2. Phishing Email Pipeline (`backend/pipelines/phishing`)

### 2.1 Purpose

Detect phishing in raw email content (HTML or plain text), return a risk score, and provide token-level explainability so the UI can highlight suspicious phrases.

### 2.2 Core Modules

- **`phishing.py`**
  - **Preprocessing**:
    - `clean_text(raw_input)` strips HTML tags with BeautifulSoup and returns normalized plain text.
    - `preprocess_email(raw_input, tokenizer)` tokenizes text with the DistilBERT tokenizer, applies a custom "head + tail" truncation strategy (first and last ~254 tokens), and produces model-ready `input_ids` plus the token list.
  - **Model inference**:
    - Uses a DistilBERT sequence classification model (`MODEL_NAME = "cybersectony/phishing-email-detection-distilbert_v2.4.1"`) that is preloaded and injected via FastAPI lifespan (held on `app.state.model` and `app.state.tokenizer`).
    - `analyze_email(raw_input, model, tokenizer)` runs a forward pass, applies `softmax` to logits, and interprets index 1 as the phishing probability \(risk\_score \in [0,1]\).
  - **Explainability**:
    - `create_custom_forward(model)` wraps the model for Captum to expose logits.
    - `LayerIntegratedGradients` over the DistilBERT embedding layer computes token-level attributions for the phishing class.
    - `get_word_attributions(attributions, tokens, tokenizer)` aggregates subword attributions into word-level scores, normalizes them, filters special tokens, and returns a sorted list of `{word, score}` pairs used by higher layers.

- **`api_routes.py`**
  - **Schemas**:
    - `ThreatRequest` – request body with `text`, representing raw HTML or text.
    - `ThreatResponse` – response with:
      - `risk_score` – numeric probability of phishing.
      - `classification` – human-readable label bucket (High/Medium/Low).
      - `highlighted_words` – list of `{word, score}` objects to drive UI highlighting.
  - **Routing**:
    - `APIRouter(prefix="/analyze", tags=["Phishing Analysis"])`.
    - `POST /analyze/text` – main phishing endpoint.
  - **Behavior**:
    - Retrieves `model` and `tokenizer` from `request.app.state`.
    - Uses `anyio.to_thread.run_sync(analyze_email, ...)` so heavy PyTorch work runs off the event loop.
    - `translate_risk_score(score)` bins the raw probability into "High Risk: Phishing Attempt Detected", "Medium Risk: Suspicious Elements Found", or "Low Risk: Looks Safe".
    - On errors (e.g., missing model or exceptions during inference), raises `HTTPException` with appropriate status codes and messages to satisfy `RULES.md` (fail gracefully).

- **`Phising Pipeline.md`**
  - Design document describing each phase of the pipeline:
    - Environment/model setup.
    - HTML sanitization and tokenization with head+tail truncation.
    - Inference and Captum explainability.
    - FastAPI API construction and translation layer.
    - Testing scenarios (benign, malicious, long-input overload).

### 2.3 Data and Control Flow

1. Client sends email content to `POST /api/analyze/text`.
2. Router fetches shared `model` and `tokenizer` from `app.state`.
3. `analyze_email` cleans text, tokenizes, truncates, runs DistilBERT inference, and computes Captum integrated gradients.
4. Response contains a phishing risk score and a sorted list of influential words that clients use to visually highlight suspicious tokens.

---

## 3. URL Phishing Pipeline (`backend/pipelines/url`)

### 3.1 Purpose

Analyze potentially malicious URLs (including shortened links), expand them through redirects, normalize them into text, and reuse the phishing email model to score risk and provide explainability.

### 3.2 Core Modules

- **`url_routes.py`**
  - **Schemas**:
    - `UrlRequest` – input URL string (`url`).
    - `UrlResponse` – response with:
      - `risk_score` and `classification` (same binning thresholds as phishing).
      - `original_url` (input) and `resolved_url` (post-redirect).
      - `highlighted_words` – token attributions from the phishing model.
  - **Routing**:
    - `APIRouter(prefix="/analyze", tags=["URL Analysis"])`.
    - `POST /analyze/url` – main URL analysis endpoint.
  - **Behavior**:
    - Fetches shared DistilBERT phishing model and tokenizer from `app.state`.
    - First calls `resolve_url(original_url)` to expand redirects and apply SSRF checks.
    - If resolution fails with validation/SSRF errors, returns `400`; if network/timeout errors occur, falls back to the original URL string.
    - `_preprocess_url_for_model(url)` converts the URL to a token sequence by replacing separators (`.`, `/`, `:`, `-`) with spaces and normalizing whitespace.
    - Uses `anyio.to_thread.run_sync(analyze_email, ...)` to reuse `phishing.analyze_email` on the normalized text, then maps to `UrlResponse`.

- **`url_resolver.py`**
  - **SSRF protection**:
    - `_INTERNAL_PATTERNS` – regex for internal/loopback/private network ranges (localhost, 127.0.0.0/8, 10.0.0.0/8, 172.16–31, 192.168.0.0/16, `::1`, `0.0.0.0`).
    - `is_internal_url(url)` – strips scheme, port, and path, then checks host against internal patterns.
  - **Resolution**:
    - `async def resolve_url(url: str) -> str`:
      - Pre-validates the URL host via `is_internal_url`; raises `ValueError` if internal.
      - Uses an `httpx.AsyncClient` with `HEAD` request, redirect following, and short timeout to get the final destination URL.
      - Post-validates the resolved URL again to prevent redirect chains into internal addresses; raises `ValueError` on violation.
      - Returns the final safe URL for downstream inference.

- **Docs and tests**:
  - `url.md` – design doc explaining resolver behavior, SSRF protections, and integration with phishing model.
  - `test_url_route.py` and `test_url_phishing.py` – pytest tests validating API responses, resolver behavior, and phishing model integration.

### 3.3 Data and Control Flow

1. Client calls `POST /api/analyze/url` with a URL.
2. Router uses `resolve_url` to expand redirects while blocking internal targets.
3. The resolved URL is normalized into tokenizable text and passed to `phishing.analyze_email`.
4. The phishing model returns `risk_score` and `highlighted_words`, which are repackaged with original and resolved URLs for the client.

---

## 4. Deepfake Video/Media Pipeline (`backend/pipelines/video_deepfake`)

### 4.1 Purpose

Detect deepfakes in images and videos by extracting faces, running a ViT-based classifier on RGB crops, and returning a risk score with attention heatmaps that highlight manipulated regions.

### 4.2 Core Modules

- **`video_processor.py`**
  - Implements the **Smart Extraction Engine** for faces from images and videos.
  - **Model setup**:
    - Uses MediaPipe Tasks `FaceDetector` with a BlazeFace model (`models/blaze_face_short_range.tflite`), downloaded on first use by `_ensure_face_model`.
    - Falls back to classic OpenCV Haar-cascade detection (`haarcascade_frontalface_default.xml`) if MediaPipe is unavailable or fails.
  - **Face extraction from video**:
    - `extract_faces_from_video(video_path, target_face_count=500, padding=0.15)`:
      - Opens the video with OpenCV, scans frames at a fixed interval (max 100 frames) to balance speed and coverage.
      - For each frame, detects a face via MediaPipe or Haar cascade.
      - Converts normalized or pixel bounding boxes to pixel coordinates, applies configurable padding, and clamps boxes to frame bounds using `_safe_crop`.
      - Maintains a `last_known_box` so when detection fails on a glitch frame, it reuses the last bounding box to still capture anomalies.
      - Crops and resizes faces to 224×224 RGB arrays required by ViT, returning up to `target_face_count` crops.
  - **Face extraction from images**:
    - `extract_face_from_image(image_bytes, padding=0.20)`:
      - Decodes uploaded image bytes with OpenCV, converts to RGB.
      - Runs MediaPipe or Haar-cascade detection once, applies padding and `_safe_crop`, then resizes to 224×224.
      - Returns a list with a single RGB crop (or an empty list if no face is detected).

- **`deepfake_detector.py`**
  - **Model configuration**:
    - Uses `ViTForImageClassification` and `ViTImageProcessor` from HuggingFace with `MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-v2-Model"`.
  - **Inference**:
    - `run_inference(face_crops, model, processor)`:
      - Converts each 224×224 RGB NumPy array to a PIL image, processes via the ViT image processor into tensors, and runs the model.
      - Collects logits for all frames, averages them, and applies `softmax` to obtain a probability distribution.
      - Identifies the deepfake class index from `model.config.id2label` (falling back to index 1) and returns a single `risk_score` for fake likelihood.
  - **Attention heatmaps**:
    - `generate_attention_heatmap(face_crop, model, processor)`:
      - Runs the model with `output_attentions=True` to obtain transformer attention maps.
      - Takes the last layer’s attention, averages across heads, and uses the CLS token’s attention row to get a 196-element vector.
      - Reshapes to a 14×14 grid, upsamples to 224×224, normalizes, and applies OpenCV `COLORMAP_JET` to create a heatmap.
      - Overlays the heatmap on the original face crop (RGB→BGR) for visual explanation and returns a BGR image.

- **`video_routes.py`**
  - An alternative router (not currently mounted in `main.py`) that exposes a richer deepfake media analysis endpoint:
    - `APIRouter(prefix="/analyze", tags=["Media Deepfake Analysis"])` with `POST /analyze/media`.
  - **Schemas**:
    - `MediaResponse` – includes:
      - `risk_score` and textual `classification` (High/Medium/Low risk for deepfakes).
      - `heatmap_base64` – base64-encoded JPEG of the attention heatmap.
      - `frames_analyzed` – number of face crops processed.
  - **Helpers**:
    - `_run_ml_pipeline(face_crops, model, processor)` – orchestrates inference and heatmap generation.
    - `_run_video_pipeline(video_path, model, processor)` – runs face extraction on videos then `_run_ml_pipeline`.
    - `_run_image_pipeline(image_bytes, model, processor)` – runs extraction on images then `_run_ml_pipeline`.
  - **Endpoint behavior**:
    - Infers MIME type from `file.content_type` and filename extension.
    - For images, reads into memory and dispatches `_run_image_pipeline` in a thread.
    - For videos, streams to a temporary file and runs `_run_video_pipeline` in a thread, then deletes the temp file.
    - Returns a detailed `MediaResponse` or appropriate HTTP errors (422 for unsupported media / no faces, 500 for unexpected failures).

- **`api_routes.py`**
  - A simpler media-analysis router currently mounted in the unified backend:
    - `APIRouter(prefix="/analyze", tags=["Deepfake Media Analysis"])` with `POST /analyze/media`.
    - Focuses on counting extracted faces and confirming pipeline success without running ViT inference yet.
  - **Schemas**:
    - `MediaAnalysisResponse` – `status`, `faces_extracted`, and a human-readable `message`.
  - **Behavior**:
    - For image MIME types, reads bytes and calls `extract_face_from_image` in a thread.
    - For video MIME types, writes to a temp file, calls `extract_faces_from_video` in a thread with a target of 30 faces, and cleans up.
    - Returns success messages with counts or graceful error messages when no faces are found or unsupported MIME types are uploaded.

- **`video.md`**
  - Narrative design doc explaining:
    - Bounding box padding and clamp logic.
    - State machine behavior for `last_known_box`.
    - Rationale for frame sampling and the link between ViT attention and visual heatmaps.

### 4.3 Data and Control Flow

1. Client uploads an image or video to `POST /api/analyze/media`.
2. Router determines MIME type and dispatches to image or video path.
3. `video_processor` extracts one or more 224×224 RGB face crops using MediaPipe or OpenCV with padding and fallback.
4. In the richer `video_routes.py` version, crops are fed to ViT for deepfake scoring and attention heatmap generation; the simpler `api_routes.py` currently only counts faces and returns pipeline-level feedback.

---

## 5. Deepfake Audio Pipeline (`backend/pipelines/deepfake_audio`)

### 5.1 Purpose

Classify audio clips as human or AI-generated and provide probability-based confidence and severity levels, with optional attention information over the audio timeline.

### 5.2 Core Modules

- **`load_audio_model.py`**
  - Loads a pre-trained Wav2Vec2 model and processor:
    - `MODEL_ID = "ai4bharat/indicwav2vec-hindi"`.
    - `processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)`.
    - `model = Wav2Vec2ForCTC.from_pretrained(MODEL_ID, output_hidden_states=True)` moved to `DEVICE` (CPU or CUDA), set to eval mode, and frozen.
  - Defines a small `LinearClassifier` head (`input_dim → 2`) to map embeddings to binary real/fake logits.
  - Loads a trained classifier checkpoint from `classifier.pt` with validation accuracy metadata and constructs a ready-to-use `classifier` on the chosen `DEVICE`.

- **`predict.py`**
  - `predict_audio(audio_path: str) -> dict`:
    - Handles audio input normalization:
      - If the file is `.mp3`, uses `pydub.AudioSegment` to decode to WAV in-memory; otherwise uses `soundfile` to read directly.
      - Converts to mono by averaging channels if needed.
      - Resamples to `TARGET_SR = 16000` using `torchaudio.functional.resample`.
    - Uses the Wav2Vec2 processor to tokenize raw waveform into model input tensors on `DEVICE`.
    - Runs the Wav2Vec2 model with `output_hidden_states=True` and `output_attentions=True`:
      - Creates an embedding by averaging the final hidden state across time.
      - Passes the embedding into the linear `classifier` to obtain logits.
      - Computes `softmax` probabilities for real vs fake.
      - Optionally aggregates attention weights across heads and sequence length into a 1D `attention_map` for explainability.
    - Returns:
      - `label` – `"AI Generated"` or `"Real Human"`.
      - `confidence` – max of real/fake probability.
      - `real_prob`, `fake_prob` – rounded probabilities.
      - `severity` – one of `"Low"`, `"Medium"`, `"High"`, `"Critical"` based on thresholds.
      - `attention_map` – optional per-timestep importance values.

- **`audio_api_routes.py`**
  - **Schemas**:
    - `AudioPredictionResponse` – `label`, `confidence`, `real_prob`, `fake_prob`, `severity`.
  - **Routing**:
    - `APIRouter(prefix="/deepfake-audio", tags=["Deepfake Audio Detection"])`.
    - `POST /deepfake-audio/predict` – multipart file upload endpoint.
  - **Behavior**:
    - Accepts an `UploadFile`, writes it to a temporary file path in the backend process, and calls `predict_audio(temp_path)`.
    - Deletes the temp file and returns the prediction dict as the response model.
    - Wraps the whole pipeline in try/except and surfaces errors as `HTTPException(500)`.

### 5.3 Data and Control Flow

1. Client uploads an audio clip to `POST /api/deepfake-audio/predict`.
2. Backend persists the upload to a temporary file and calls `predict_audio`.
3. `predict_audio` decodes, normalizes, and resamples the waveform, embeds it via Wav2Vec2, applies the binary classifier, and derives final label, probabilities, and severity.
4. Response is a structured JSON payload ready to be rendered in dashboards or UIs.

---

## 6. Prompt Injection Website Pipeline (`backend/pipelines/prompt_injection_website`)

### 6.1 Purpose

Detect prompt injection content in arbitrary text (and, via a CLI helper, in scraped website content) and provide model-based verdicts plus token-level attributions for explainability.

### 6.2 Core Modules

- **`load_prompt_model.py`**
  - Loads a transformer classification model and tokenizer dedicated to prompt injection detection and sets a `DEVICE` (CPU or GPU).
  - Exposes global `tokenizer`, `model`, and `DEVICE` used by both API routes and offline scripts.

- **`api_routes.py`**
  - **Schemas**:
    - `PromptRequest` – body with `text` field.
    - `PromptResponse` – `label`, `confidence`, and raw `logits` for further analysis.
  - **Routing**:
    - `APIRouter(prefix="/prompt-injection", tags=["Prompt Injection Detection"])`.
    - `POST /prompt-injection/predict` – main backend endpoint.
  - **Behavior**:
    - Tokenizes input text with the global tokenizer, sends to `DEVICE`, and runs the classification model.
    - Computes `softmax` probabilities and labels as `"Prompt Injection"` or `"Safe"` based on a 0.5 threshold.
    - Returns logits, label, and confidence; on error, raises `HTTPException(500)`.

- **`prompt_predict.py`**
  - Provides more advanced offline utilities around the same model:
    - `scrape_text(url)` – fetches HTML, strips non-text tags with BeautifulSoup, and extracts text chunks from semantic elements like `p`, `div`, `a`, `input`, etc.
    - `predict(text)` – model inference helper that returns probabilities and label for a single text chunk.
    - `get_attributions(text)` – uses Captum `LayerIntegratedGradients` over the DeBERTa embeddings to get token-level attributions, normalized and sorted by importance.
    - `explain_chunk(text)` – combines prediction and attribution, highlighting top-positive tokens that drove an injection verdict.
    - `scan_url(url)` – orchestrates scraping, per-chunk analysis, and aggregates a `threat_score` over all chunks; prints a console report and returns structured results.

### 6.3 Data and Control Flow

1. Client calls `POST /api/prompt-injection/predict` with a text body.
2. API route tokenizes and runs the transformer model to get logits and probabilities.
3. Verdict and confidence are computed and returned; offline tools can further compute token-level attributions or scan entire websites with `scan_url`.

---

## 7. Sentinel Behavior Analytics Pipeline (`backend/pipelines/sentinel_behavior`)

### 7.1 Purpose

Provide SOC-style anomalous login detection for multiple users, combining synthetic behavioral baselines, feature engineering, rule-based checks, per-user Isolation Forests, a reconstruction-based autoencoder, SHAP explanations, and LLM-generated narratives into a unified verdict.

### 7.2 Core Modules

- **`data_generator.py`**
  - Defines **user profiles** (`USER_PROFILES`) for `user_001`, `user_002`, and `user_003`, including typical cities, countries, login windows, and IP prefixes.
  - Generates synthetic **normal sessions**:
    - `_generate_normal_sessions(user_id)` builds 200 baseline login events per user, spread across 90 days and within the user’s typical login hours.
    - `_make_normal_event(user_id, timestamp)` constructs each event with geolocation, device, browser, success/failure flags, session duration, and VPN usage.
  - Injects **attack scenarios**:
    - ATTACK_1: impossible travel (Mumbai→London within 28 minutes).
    - ATTACK_2: credential stuffing burst (many failed logins in 90 seconds).
    - ATTACK_3: new country, new device at abnormal hour.
    - ATTACK_4: dormant account reactivation from a new region.
    - ATTACK_5: contextual anomaly with VPN, Tor browser, and failures.
  - Maintains:
    - `_ALL_SESSIONS` – in-memory store aggregating normal sessions and attack events.
    - `get_all_sessions()` – returns all sessions per user.
    - `get_user_normal_sessions(user_id)` – filters out attack events and returns only baseline sessions used for model training.

- **`feature_engineer.py`**
  - Defines a canonical **7-dimensional feature vector** for each login event, based on the event and its history:
    1. `hour_deviation` – deviation of login hour from user’s historical mean (normalized).
    2. `geo_velocity` – travel speed from last successful login (km/h capped and normalized).
    3. `is_new_device` – binary flag for unseen (OS, browser) combinations.
    4. `burst_score` – density of failed logins in the last 5 minutes.
    5. `is_new_country` – binary flag for unobserved country codes.
    6. `days_since_last_login` – inactivity duration normalized over 90 days.
    7. `failure_ratio` – normalized failure count on this event.
  - Uses:
    - `haversine_km(...)` – geodesic distance helper.
    - `_parse_ts(...)` – tolerant ISO-8601 parser that supports various formats and falls back cleanly on bad data.
  - Public API:
    - `get_feature_names()` – returns the ordered list of feature names.
    - `extract_features(event, user_history)` – builds the 7-element feature vector and returns zeros on failure for robustness.

- **`models/isolation_forest.py`**
  - `UserIsolationForest` manages per-user and global **Isolation Forest** models and SHAP explainers:
    - `train_all_users(user_sessions, feature_fn)`:
      - For each user, applies `feature_fn(event, history)` across their normal sessions.
      - Trains an `IsolationForest` on the resulting matrix (if enough samples), stores both the model and a SHAP `Explainer`.
      - Aggregates all feature vectors to train a global fallback model for users without dedicated models.
    - `score(user_id, feature_vector)`:
      - Uses `decision_function` output (negative is anomalous) and maps \([-0.5, 0.5]\) to a \([1, 0]\) anomaly score, clipped to \([0,1]\).
    - `get_shap_values(user_id, feature_vector, feature_names)`:
      - Computes SHAP values for each feature via the per-user or global explainer.
      - Returns a sorted list of features with SHAP value and direction (`risk` or `safe`).

- **`models/autoencoder.py`**
  - `LoginAutoencoder` – shallow PyTorch autoencoder for 7-d feature vectors (7→16→8→4→8→16→7) with ReLU activations.
  - `AutoencoderManager` – trains and evaluates autoencoders:
    - `train(normal_feature_vectors)`:
      - Computes per-feature mean/std for normalization.
      - Trains for 100 epochs with Adam and MSE loss on normalized data.
      - Computes per-feature and global reconstruction error distributions and establishes thresholds (mean + 2×std).
    - `score(feature_vector)`:
      - Normalizes input, runs reconstruction, and computes MSE.
      - Normalizes error by the global threshold to yield a \([0,1]\) anomaly score.
    - `get_feature_errors(feature_vector, feature_names)`:
      - Returns per-feature squared reconstruction errors as explainability artifacts, sorted by error magnitude.

- **Other important modules (not fully reproduced here but conceptually key)**:
  - `rule_engine.py` – deterministic security rules (impossible travel, new device/country, high failure bursts, VPN usage, etc.), returning which rules fired and their severities.
  - `scorer.py` – fuses Isolation Forest score, autoencoder score, and rule engine outputs into:
    - `severity_score`, `verdict`, `confidence`, and per-source contributions.
  - `explainability/shap_explainer.py` – formats raw SHAP data into display-friendly structures.
  - `explainability/narrative.py` – generates LLM-based SOC narratives, with a local fallback narrative generator and timeout protection.
  - `demo_scenarios.py` – wraps canonical demo attacks into higher-level scenarios (with IDs) to be used by `/demo-scenarios` and `/demo/{scenario_id}`.
  - `schemas.py` – Pydantic models for:
    - Input events (`LoginEvent`).
    - Outputs (`ExplanationPayload`, `FusionBreakdown`, `ShapFeature`, `HistorySummaryItem`, `DemoScenario`).

- **`main.py`**
  - Exposes:
    - `async def startup_sentinel(app)` – called from the unified backend lifespan:
      - Loads all synthetic sessions into `app.state.all_sessions`.
      - Trains per-user Isolation Forest models with SHAP explainers.
      - Trains per-user autoencoders (when enough normal data) and stores them in `app.state.ae_managers`.
      - Stores feature names in `app.state.feature_names` and logs readiness.
    - `router = APIRouter()` – mounted at `/api/sentinel` by the unified backend.
  - **Core analysis pipeline**:
    - `_run_analysis_pipeline(event, app_state)` – orchestrates the 12-step anomaly detection process:
      1. Derive user history from `app_state.all_sessions` up to the event timestamp.
      2. Extract the 7-d feature vector from the event and history.
      3. Run deterministic rules for immediate red flags.
      4. Compute Isolation Forest anomaly score for the user.
      5. Compute autoencoder anomaly score and per-feature reconstruction errors (if a model exists).
      6. Fuse scores and rules into overall severity and verdict.
      7. Compute SHAP feature attributions for the Isolation Forest.
      8. Generate an LLM narrative (with timeout and fallback).
      9. Derive recommended action based on verdict.
      10. Measure processing latency in milliseconds.
      11. Persist event to `app_state.all_sessions`.
      12. Append a compact summary to a `_history_store` for `/user/{user_id}/history`.
  - **Endpoints**:
    - `POST /analyze` – main real-time login analysis endpoint.
    - `POST /analyze/test` – hardcoded impossible-travel test event to validate the full pipeline.
    - `GET /demo-scenarios` – lists all demo attack scenarios.
    - `POST /demo/{scenario_id}` – runs a specific scenario through the full pipeline.
    - `GET /user/{user_id}/history` – returns up to 20 recent login verdict summaries.
    - `GET /health` – reports models_loaded and users_trained, used by the unified health check.

### 7.3 Data and Control Flow

1. At startup, the unified backend calls `startup_sentinel(app)` during its lifespan; this trains and initializes Isolation Forests, autoencoders, and session stores.
2. A client calls `POST /api/sentinel/analyze` with a `LoginEvent`.
3. The router invokes `_run_analysis_pipeline`, which:
   - Derives history, features, rule hits, IF/AE scores, SHAP attributions, narrative, and recommended actions.
4. The pipeline returns a rich `ExplanationPayload` suitable for detailed SOC dashboards and audit trails.

---

## 8. Cross-Pipeline Notes

- **Shared models and reuse**:
  - The DistilBERT phishing model (`MODEL_NAME` in `phishing.py`) is reused across both the phishing email and URL analysis pipelines.
  - The ViT deepfake model and processor are shared for image and video deepfake detection through `app.state.vit_model` / `vit_processor`.
- **Explainability patterns**:
  - Text pipelines (phishing, prompt injection) use Captum `LayerIntegratedGradients` to attribute predictions to tokens.
  - Sentinel uses SHAP explainers for Isolation Forests and per-feature reconstruction errors from the autoencoder.
  - Deepfake video uses transformer attention heatmaps to visually indicate suspicious regions in face crops.
- **Async and resource management**:
  - All heavy ML calls are run in background threads (`anyio.to_thread.run_sync`) from async endpoints, and long-running resources (models, detectors) are created once and reused.
  - Temporary files for media (videos, audio) are created with safe naming and always cleaned up in `finally` blocks.

