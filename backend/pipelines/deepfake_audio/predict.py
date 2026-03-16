import torch
import torchaudio
import torchaudio.functional as F
import soundfile as sf
import numpy as np
import io
from pydub import AudioSegment
from .load_audio_model import processor, model, classifier, DEVICE

TARGET_SR = 16000

def predict_audio(audio_path: str) -> dict:
    audio = None
    sr = None

    # 1) Try torchaudio (can handle many codecs, may decode mp3 without ffmpeg)
    try:
        waveform, sr = torchaudio.load(audio_path)
        # torchaudio returns [channels, time]
        audio = waveform.mean(dim=0).numpy() if waveform.ndim > 1 else waveform.squeeze(0).numpy()
    except Exception:
        pass

    # 2) Try soundfile (great for wav/flac)
    if audio is None:
        try:
            audio, sr = sf.read(audio_path)
        except Exception:
            pass

    # 3) Try pydub (requires ffmpeg for mp3)
    if audio is None:
        try:
            audio_seg  = AudioSegment.from_file(audio_path)
            wav_buffer = io.BytesIO()
            audio_seg.export(wav_buffer, format="wav")
            wav_buffer.seek(0)
            audio, sr  = sf.read(wav_buffer)
        except Exception as e:
            raise ValueError(
                "Could not decode audio file. "
                "If uploading MP3, ensure ffmpeg is installed, or upload WAV instead. "
                f"Details: {e}"
            ) from e
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    audio_tensor = torch.tensor(audio).float()
    if sr != TARGET_SR:
        audio_tensor = F.resample(audio_tensor, sr, TARGET_SR)
    input_values = processor(
        audio_tensor.numpy(),
        sampling_rate=TARGET_SR,
        return_tensors="pt"
    ).input_values.to(DEVICE)
    with torch.no_grad():

        outputs = model(input_values, output_hidden_states=True, output_attentions=True)
        embedding = outputs.hidden_states[-1].mean(dim=1).squeeze()
        logits = classifier(embedding.unsqueeze(0))
        probs = torch.softmax(logits, dim=1).squeeze()
        # Extract attention weights from the last layer
        attentions = outputs.attentions[-1] if hasattr(outputs, 'attentions') and outputs.attentions is not None else None
        # Reduce attention to a 1D array for visualization (mean over heads)
        if attentions is not None:
            # attentions shape: (batch, num_heads, seq_len, seq_len)
            attn_map = attentions.mean(dim=1).squeeze().mean(dim=0).cpu().numpy().tolist()
        else:
            attn_map = None
    real_prob = round(probs[0].item(), 3)
    fake_prob = round(probs[1].item(), 3)
    label = "AI Generated" if fake_prob >= 0.5 else "Real Human"
    confidence = fake_prob if fake_prob >= 0.5 else real_prob
    return {
        "label": label,
        "confidence": confidence,
        "real_prob": real_prob,
        "fake_prob": fake_prob,
        "severity": ("Critical" if fake_prob > 0.9 else
                     "High"     if fake_prob > 0.7 else
                     "Medium"   if fake_prob > 0.4 else "Low"),
        "attention_map": attn_map
    }
