import torch
import os
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

DEVICE   = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_ID = "ai4bharat/indicwav2vec-hindi"

processor = Wav2Vec2Processor.from_pretrained(MODEL_ID)
model     = Wav2Vec2ForCTC.from_pretrained(MODEL_ID, output_hidden_states=True).to(DEVICE)
model.eval()
for param in model.parameters():
    param.requires_grad = False

class LinearClassifier(torch.nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.dropout = torch.nn.Dropout(0.1)
        self.fc      = torch.nn.Linear(input_dim, 2)
    def forward(self, x):
        return self.fc(self.dropout(x))

import os
ckpt_path  = os.path.join(os.path.dirname(__file__), "classifier.pt")
ckpt       = torch.load(ckpt_path, map_location=DEVICE)
classifier = LinearClassifier(ckpt["input_dim"]).to(DEVICE)
classifier.load_state_dict(ckpt["model_state"])
classifier.eval()

print(f"Models loaded on {DEVICE}")
print(f"Classifier val acc: {ckpt['val_acc']:.2%}")