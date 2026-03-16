import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
DEVICE   = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = AutoTokenizer.from_pretrained("protectai/deberta-v3-base-prompt-injection")
model = AutoModelForSequenceClassification.from_pretrained("protectai/deberta-v3-base-prompt-injection")
print(f"Model loaded on {DEVICE}")
