"""
deepfake_detector.py — Phase 3 & 4 of the Deepfake Detection Pipeline

Phase 3: run_inference          → ViT forward pass, averaged logits, Softmax risk_score
Phase 4: generate_attention_heatmap → CLS attention rollout → 14×14 → 224×224 COLORMAP_JET
"""
import cv2
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import ViTForImageClassification, ViTImageProcessor
from typing import Optional

TARGET_SIZE = 224
MODEL_NAME = "prithivMLmods/Deep-Fake-Detector-v2-Model"


# ---------------------------------------------------------------------------
# Phase 3: ViT Inference
# ---------------------------------------------------------------------------

def run_inference(
    face_crops: list[np.ndarray],
    model: ViTForImageClassification,
    processor: ViTImageProcessor,
) -> dict:
    """
    Step 3.2 & 3.3: Convert RGB 224×224 NumPy arrays → PIL Images → processor
    tensors → ViT forward pass. Average logits across all frames, apply Softmax.

    Returns:
        { "risk_score": float }  where 1.0 = Fake, 0.0 = Real
    Raises:
        ValueError: if face_crops list is empty.
    """
    if not face_crops:
        raise ValueError("No face crops provided for inference.")

    all_logits: list[torch.Tensor] = []

    with torch.no_grad():
        for crop in face_crops:
            # Step 3.2: NumPy (RGB uint8) → PIL → processor → tensor
            pil_img = Image.fromarray(crop)
            inputs = processor(images=pil_img, return_tensors="pt")
            outputs = model(**inputs)
            all_logits.append(outputs.logits)  # shape: [1, num_classes]

    # Step 3.3: Average logits across frames, then Softmax
    avg_logits = torch.mean(torch.cat(all_logits, dim=0), dim=0, keepdim=True)
    probabilities = F.softmax(avg_logits, dim=-1).squeeze()

    # Model label map: {0: 'Realism', 1: 'Deepfake'}  (from prithivMLmods config)
    label_map: dict = model.config.id2label
    fake_idx = next(
        (idx for idx, label in label_map.items() if "deepfake" in label.lower()),
        1,  # default to index 1 — matches prithivMLmods model
    )

    risk_score = probabilities[fake_idx].item()
    return {"risk_score": risk_score}


# ---------------------------------------------------------------------------
# Phase 4: Attention Rollout Heatmap (Refined)
# ---------------------------------------------------------------------------

def generate_attention_heatmap(
    face_crop: np.ndarray,
    model: ViTForImageClassification,
    processor: ViTImageProcessor,
) -> np.ndarray:
    """
    Steps 4.1–4.4: Extract the CLS-token attention row from the final ViT
    attention block, reshape 196 → 14×14, upscale → 224×224, apply JET
    colormap, and overlay on the original face crop.
    """
    pil_img = Image.fromarray(face_crop)
    inputs = processor(images=pil_img, return_tensors="pt")

    with torch.no_grad():
        # HF natively returns attentions here, no hooks needed!
        outputs = model(**inputs, output_attentions=True)

    # Fallback if attentions fail to generate or are an empty tuple
    if not hasattr(outputs, 'attentions') or not outputs.attentions:
        return cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)

    # Step 4.1: outputs.attentions is a tuple of all layers. Grab the last one.
    # Shape of last_layer_attn: [batch_size, num_heads, seq_len, seq_len] -> [1, 12, 197, 197]
    last_layer_attn = outputs.attentions[-1].detach().cpu()

    # Average across all 12 heads for the single batch item
    # attn becomes shape: [197, 197]
    attn = last_layer_attn[0].mean(dim=0)

    # Step 4.2: Extract the CLS token row (index 0), drop CLS itself (index 1:)
    cls_attn = attn[0, 1:]  # Shape: [196]

    # Step 4.3: Reshape 196 → 14×14
    grid_size = int(cls_attn.shape[0] ** 0.5)  # 14
    attn_map = cls_attn.reshape(grid_size, grid_size).numpy()

    # Step 4.4: Upscale 14×14 → 224×224, normalise, apply JET colormap
    attn_map = cv2.resize(attn_map, (TARGET_SIZE, TARGET_SIZE))
    attn_map = (attn_map - attn_map.min()) / (attn_map.max() - attn_map.min() + 1e-8)
    attn_map_uint8 = (attn_map * 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(attn_map_uint8, cv2.COLORMAP_JET)

    # Overlay on the original face (BGR)
    face_bgr = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)
    overlay = cv2.addWeighted(face_bgr, 0.6, heatmap, 0.4, 0)

    return overlay