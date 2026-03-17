import torch
import requests
import numpy as np
from bs4 import BeautifulSoup
from captum.attr import LayerIntegratedGradients
from .load_prompt_model import model, tokenizer, DEVICE

def scrape_text(url: str) -> list[str]:
    headers  = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers, timeout=10)
    soup     = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "meta", "head"]):
        tag.decompose()

    chunks = []
    for tag in soup.find_all(["p", "div", "span", "a", "li",
                               "h1", "h2", "h3", "h4",
                               "input", "textarea", "form", "button"]):
        text = tag.get_text(separator=" ", strip=True)
        if text and len(text) > 10:
            chunks.append(text[:512])

    return list(set(chunks))


def predict(text: str) -> dict:
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True
    )
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

    with torch.no_grad():
        logits = model(**inputs).logits
        probs  = torch.softmax(logits, dim=-1).squeeze()

    injection_prob = probs[1].item()
    safe_prob      = probs[0].item()
    is_injection   = injection_prob >= 0.5

    return {
        "is_injection":   is_injection,
        "injection_prob": round(injection_prob, 3),
        "safe_prob":      round(safe_prob, 3),
        "label":          "INJECTION" if is_injection else "SAFE"
    }
def get_attributions(text: str) -> list[dict]:
    inputs     = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512
    )
    input_ids  = inputs["input_ids"].to(DEVICE)
    tokens     = tokenizer.convert_ids_to_tokens(input_ids[0])
    def forward_func(input_ids):
        out   = model(input_ids=input_ids)
        probs = torch.softmax(out.logits, dim=-1)
        return probs[:, 1]
    lig          = LayerIntegratedGradients(forward_func, model.deberta.embeddings.word_embeddings)
    baseline_ids = torch.zeros_like(input_ids).to(DEVICE)
    attributions, _ = lig.attribute(
        inputs=input_ids,
        baselines=baseline_ids,
        n_steps=50,
        return_convergence_delta=True
    )
    attributions = attributions.sum(dim=-1).squeeze()
    attributions = attributions / (attributions.norm() + 1e-8)
    attributions = attributions.cpu().detach().numpy()

    token_attrs = []
    for token, score in zip(tokens, attributions):
        if token in ["[CLS]", "[SEP]", "<s>", "</s>", "[PAD]"]:
            continue
        token_attrs.append({
            "token": token,
            "score": round(float(score), 4)
        })
    token_attrs.sort(key=lambda x: abs(x["score"]), reverse=True)
    return token_attrs
def explain_chunk(text: str) -> dict:
    prediction   = predict(text)
    attributions = get_attributions(text) if prediction["is_injection"] else []
    top_tokens = [t for t in attributions[:10] if t["score"] > 0]
    print(f"\n  Label      : {prediction['label']}")
    print(f"  Confidence : {prediction['injection_prob']:.1%}")
    if top_tokens:
        print(f"  Top triggers: {[t['token'] for t in top_tokens[:5]]}")
    return {
        **prediction,
        "text":        text[:150],
        "top_tokens":  top_tokens,
        "attributions": attributions
    }
def scan_url(url: str, model, tokenizer, device="cpu") -> dict:
    print(f"\nScraping: {url}")
    chunks = scrape_text(url)
    print(f"Extracted {len(chunks)} text chunks")
    results  = []
    flagged  = []
    for i, chunk in enumerate(chunks):
        # Pass model/tokenizer to inner functions if needed, or inline the logic
        inputs = tokenizer(
            chunk,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            logits = model(**inputs).logits
            probs  = torch.softmax(logits, dim=-1).squeeze()

        injection_prob = probs[1].item()
        is_injection   = injection_prob >= 0.5
        
        result = {
            "is_injection": is_injection,
            "injection_prob": round(injection_prob, 3),
            "text": chunk[:150]
        }
        results.append(result)
        if is_injection:
            flagged.append(result)
            
    threat_score = len(flagged) / len(chunks) if chunks else 0
    return {
        "url":          url,
        "total_chunks": len(chunks),
        "flagged":      len(flagged),
        "threat_score": round(threat_score, 3),
        "verdict":      "DANGEROUS" if threat_score > 0.1 else "SUSPICIOUS" if threat_score > 0.02 else "CLEAN",
        "results":      flagged[:10]
    }