import os
import sys

# Optional: Disable symlinks if Windows HF cache sometimes has issues
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
except ImportError as e:
    print(f"Error importing transformers: {e}. Are dependencies installed?")
    sys.exit(1)

MODEL_NAME = "cybersectony/phishing-email-detection-distilbert_v2.4.1"

def download_and_cache_model():
    print(f"Downloading and caching tokenizer for '{MODEL_NAME}'...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    
    print(f"Downloading and caching model for '{MODEL_NAME}'...")
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    
    print("Download complete! Model and tokenizer are successfully cached.")

if __name__ == "__main__":
    download_and_cache_model()
