from bs4 import BeautifulSoup
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
from captum.attr import LayerIntegratedGradients

MODEL_NAME = "cybersectony/phishing-email-detection-distilbert_v2.4.1"

# The global model and tokenizer are now managed by FastAPI's lifespan in main.py

def clean_text(raw_input: str) -> str:
    """
    Step 2.1: HTML Sanitization
    Use BeautifulSoup to strip out HTML tags and return plain text.
    """
    if not raw_input:
        return ""
    
    soup = BeautifulSoup(raw_input, "html.parser")
    clean_str = soup.get_text(separator=" ", strip=True)
    return clean_str


def preprocess_email(raw_input: str, tokenizer) -> tuple[torch.Tensor, list[str]]:
    """
    Step 2.2 & 2.3: Tokenization and Head + Tail Truncation
    Returns:
        input_ids tensor (shape: [1, seq_len])
        tokens list (for captum attribution mapping)
    """
    if tokenizer is None:
        raise RuntimeError("Tokenizer is not initialized.")

    cleaned_text = clean_text(raw_input)
    tokens = tokenizer.tokenize(cleaned_text)
    
    max_content_len = 510
    if len(tokens) > max_content_len:
        head_tokens = tokens[:254]
        tail_tokens = tokens[-254:]
        truncated_tokens = head_tokens + tail_tokens
    else:
        truncated_tokens = tokens

    final_tokens = [tokenizer.cls_token] + truncated_tokens + [tokenizer.sep_token]
    input_ids = tokenizer.convert_tokens_to_ids(final_tokens)
    input_tensor = torch.tensor([input_ids])
    
    return input_tensor, final_tokens


# --- Phase 3: Inference & Explainability ---

# We need a closure to pass the dynamic model instance to Captum
def create_custom_forward(model):
    def custom_forward(inputs: torch.Tensor):
        """
        Custom forward function for Captum.
        We pass input_ids directly, and return the logits for the positive class.
        """
        # inputs is input_ids of shape [batch, seq_len]
        outputs = model(input_ids=inputs)
        # Return the logits for the positive class (phishing = index 1)
        return outputs.logits
    return custom_forward

def get_word_attributions(attributions: torch.Tensor, tokens: list[str], tokenizer) -> list[dict]:
    """
    Step 3.4: Aggregate Word Scores
    Attributions come in as shape [1, seq_len, embed_dim].
    We sum across the embed_dim, normalize, and then merge subwords (##).
    """
    # Sum over the embedding dimension to get a single score per token
    token_attributions = attributions.sum(dim=-1).squeeze(0)
    
    # Normalize token attributions by dividing by the L2 norm
    attr_norm = torch.norm(token_attributions)
    if attr_norm > 0:
        token_attributions = token_attributions / attr_norm

    word_scores = []
    current_word = ""
    current_score = 0.0

    # Stop words to filter out from explanations (keep the list manageable)
    STOP_WORDS = {
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "in", "on", "at", "to", "for", "of", "by", "with", "and", "or", "but",
        "this", "that", "it", "they", "we", "he", "she", "you", "my", "your",
        "is", "it", "as", "if"
    }

    # Aggregate scores for subword tokens (##)
    for token, score in zip(tokens, token_attributions.tolist()):
        # Skip special tokens typically
        if token in [tokenizer.cls_token, tokenizer.sep_token, tokenizer.pad_token]:
            continue
            
        if token.startswith("##"):
            current_word += token[2:]
            current_score += score
        else:
            # Save the previous word if it exists
            if current_word:
                # Filter: skip stopwords, single char punctuation, or very low impact noise
                w_lower = current_word.lower()
                is_punc = all(not c.isalnum() for c in current_word)
                if w_lower not in STOP_WORDS and not is_punc and abs(current_score) > 0.01:
                    word_scores.append({"word": current_word, "score": current_score})
            current_word = token
            current_score = score
            
    # Add the last word
    if current_word:
        w_lower = current_word.lower()
        is_punc = all(not c.isalnum() for c in current_word)
        if w_lower not in STOP_WORDS and not is_punc and abs(current_score) > 0.01:
            word_scores.append({"word": current_word, "score": current_score})
        
    # Sort by absolute impact (highest positive or negative influence on 'phishing' classification)
    word_scores.sort(key=lambda x: abs(x["score"]), reverse=True)
    return word_scores


def analyze_email(raw_input: str, model, tokenizer):
    """
    Step 3.1, 3.2, 3.3: The Forward Pass and Calculate Attributions
    Now abstract enough to be used by both Text and URL pipelines.
    """
    if model is None or tokenizer is None:
        raise RuntimeError("Model or Tokenizer not initialized.")

    # 1. Preprocess
    input_tensor, tokens = preprocess_email(raw_input, tokenizer)
    
    # 2. Forward pass for prediction
    with torch.no_grad():
        outputs = model(input_ids=input_tensor)
        probabilities = F.softmax(outputs.logits, dim=-1)
        # Class 1 is typically Phishing/Spam in these models.
        # Ensure we capture index 1 as the risk score.
        risk_score = probabilities[0][1].item()
        
    # 3. Explainability (Captum)
    # Step 3.2: Initialize LayerIntegratedGradients pointing at the word embeddings layer
    # We use a closure so custom_forward binds to our specific model instance
    lig = LayerIntegratedGradients(create_custom_forward(model), model.distilbert.embeddings.word_embeddings)
    
    # We pass the input_ids (input_tensor) directly. The baseline is a tensor of zeros, 
    # which usually corresponds to the [PAD] token in HuggingFace tokenizers.
    baseline = torch.zeros_like(input_tensor)
    
    # Step 3.3: Calculate Attributions
    # Target=1 means we want attribution relative to predicting "Phishing"
    attributions, delta = lig.attribute(
        inputs=input_tensor,
        baselines=baseline,
        target=1,
        return_convergence_delta=True
    )
    
    # 4. Step 3.4 Aggregate word scores
    highlighted_words = get_word_attributions(attributions, tokens, tokenizer)
    
    return {
        "risk_score": risk_score,
        "highlighted_words": highlighted_words
    }

