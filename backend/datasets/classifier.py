import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, classification_report
X_real = torch.load("X_real_hindi.pt")
y_real = torch.load("y_real_hindi.pt")
X_fake = torch.load("X_fake_hindi.pt")
y_fake = torch.load("y_fake_hindi.pt")
X = torch.cat([X_real, X_fake], dim=0)
y = torch.cat([y_real, y_fake], dim=0)
idx = torch.randperm(len(X))
X   = X[idx]
y   = y[idx]

print(f"X : {X.shape}")
print(f"y : {y.shape}")
print(f"Real (0) : {(y==0).sum().item()}")
print(f"Fake (1) : {(y==1).sum().item()}")

DEVICE     = "cuda" if torch.cuda.is_available() else "cpu"
EPOCHS     = 1000
LR         = 1e-3
BATCH_SIZE = 64
SAVE_PATH  = "classifier.pt"
INPUT_DIM  = X.shape[1]
print(f"Device    : {DEVICE}")
print(f"Input dim : {INPUT_DIM}")
X_train, X_test, y_train, y_test = train_test_split(
    X.numpy(), y.numpy(), test_size=0.2, random_state=42, stratify=y.numpy())
X_train, X_val, y_train, y_val   = train_test_split(
    X_train, y_train, test_size=0.1, random_state=42, stratify=y_train)
class FeatureDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.long)
    def __len__(self):
        return len(self.y)
    def __getitem__(self, i):
        return self.X[i], self.y[i]

train_loader = DataLoader(FeatureDataset(X_train, y_train), batch_size=BATCH_SIZE, shuffle=True)
val_loader   = DataLoader(FeatureDataset(X_val,   y_val),   batch_size=BATCH_SIZE)
test_loader  = DataLoader(FeatureDataset(X_test,  y_test),  batch_size=BATCH_SIZE)

print(f"Train : {len(X_train)} | Val : {len(X_val)} | Test : {len(X_test)}")

class LinearClassifier(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.dropout = nn.Dropout(0.1)
        self.fc      = nn.Linear(input_dim, 2)
    def forward(self, x):
        return self.fc(self.dropout(x))

model     = LinearClassifier(INPUT_DIM).to(DEVICE)
optimizer = torch.optim.Adam(model.parameters(), lr=LR)
criterion = nn.CrossEntropyLoss()
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

print(f"Trainable params : {sum(p.numel() for p in model.parameters()):,}")
print("\nTraining...\n")

best_val_acc = 0.0

for epoch in range(EPOCHS):
    model.train()
    train_loss = 0.0
    for feats, labels in train_loader:
        feats, labels = feats.to(DEVICE), labels.to(DEVICE)
        optimizer.zero_grad()
        loss = criterion(model(feats), labels)
        loss.backward()
        optimizer.step()
        train_loss += loss.item()

    model.eval()
    val_preds, val_true = [], []
    with torch.no_grad():
        for feats, labels in val_loader:
            preds = model(feats.to(DEVICE)).argmax(dim=1)
            val_preds.extend(preds.cpu().numpy())
            val_true.extend(labels.numpy())

    val_acc = accuracy_score(val_true, val_preds)
    scheduler.step()

    if val_acc >= best_val_acc:
        best_val_acc = val_acc
        torch.save({
            "model_state": model.state_dict(),
            "val_acc":     best_val_acc,
            "input_dim":   INPUT_DIM,
            "label_map":   {0: "Real Human", 1: "AI Generated"}
        }, SAVE_PATH)

    saved = " <- saved" if val_acc >= best_val_acc else ""
    print(f"Epoch {epoch+1:02d}/{EPOCHS} | Loss: {train_loss/len(train_loader):.4f} | Val: {val_acc:.2%} | Best: {best_val_acc:.2%}{saved}")

print(f"\nBest val accuracy: {best_val_acc:.2%}")

ckpt = torch.load(SAVE_PATH)
model.load_state_dict(ckpt["model_state"])
model.eval()

test_preds, test_true = [], []
with torch.no_grad():
    for feats, labels in test_loader:
        preds = model(feats.to(DEVICE)).argmax(dim=1)
        test_preds.extend(preds.cpu().numpy())
        test_true.extend(labels.numpy())

print("\nTEST RESULTS")
print(f"Accuracy  : {accuracy_score(test_true, test_preds):.2%}")
print(f"F1        : {f1_score(test_true, test_preds):.4f}")
print(f"Precision : {precision_score(test_true, test_preds):.4f}")
print(f"Recall    : {recall_score(test_true, test_preds):.4f}")
print()
print(classification_report(test_true, test_preds, target_names=["Real Human", "AI Generated"]))