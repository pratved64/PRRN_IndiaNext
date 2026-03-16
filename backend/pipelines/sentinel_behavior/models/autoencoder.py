"""
models/autoencoder.py — PyTorch Autoencoder for SENTINEL AI

This module defines a 7->4->7 autoencoder neural network and an AutoencoderManager
that handles training, normalization, threshold calibration, and scoring. At
inference time, high reconstruction error indicates an anomalous feature pattern.

The AutoencoderManager normalizes inputs using per-feature mean/std from the
training set and computes anomaly scores by comparing reconstruction error
against the training error distribution.
"""

import sys
import os
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ---------------------------------------------------------------------------
# Autoencoder Architecture
# ---------------------------------------------------------------------------

class LoginAutoencoder(nn.Module):
    """
    Shallow autoencoder for 7-dimensional login feature vectors.

    Architecture:
        Encoder: Linear(7,16) -> ReLU -> Linear(16,8) -> ReLU -> Linear(8,4)
        Decoder: Linear(4,8)  -> ReLU -> Linear(8,16) -> ReLU -> Linear(16,7)
    """

    def __init__(self) -> None:
        """Initialize encoder and decoder layer stacks."""
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(7, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 4),
        )
        self.decoder = nn.Sequential(
            nn.Linear(4, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, 7),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Encode then decode the input tensor.

        Args:
            x: Input tensor of shape (batch_size, 7).

        Returns:
            Reconstructed tensor of the same shape as x.
        """
        encoded = self.encoder(x)
        return self.decoder(encoded)


# ---------------------------------------------------------------------------
# Autoencoder Manager
# ---------------------------------------------------------------------------

class AutoencoderManager:
    """
    Manages the lifecycle of a LoginAutoencoder: training, normalization,
    threshold computation, and anomaly scoring.

    After calling train(), the manager holds:
        - A trained LoginAutoencoder (eval mode)
        - Per-feature mean and std for input normalization
        - A per-feature reconstruction error threshold (mean + 2*std)
    """

    def __init__(self) -> None:
        """Initialize with no trained model."""
        self.model: LoginAutoencoder = None
        self._feature_mean: np.ndarray = None
        self._feature_std: np.ndarray = None
        self._error_threshold: float = None
        self._per_feature_thresholds: np.ndarray = None

    def train(self, normal_feature_vectors: List[List[float]]) -> None:
        """
        Train the autoencoder on normal session feature vectors.

        Uses:
            - Adam optimizer with lr=0.001
            - MSELoss
            - 100 epochs, batch_size=32
            - Per-feature mean/std normalization

        After training, computes reconstruction error thresholds from the
        training set: threshold = mean_error + 2 * std_error per feature.

        Args:
            normal_feature_vectors: List of 7-element float lists from
                                     extract_features(); should be normal
                                     (non-attack) sessions only.
        """
        if len(normal_feature_vectors) < 2:
            raise ValueError("Need at least 2 samples to train autoencoder.")

        X = np.array(normal_feature_vectors, dtype=np.float32)

        # Compute per-feature normalization stats
        self._feature_mean = X.mean(axis=0)
        self._feature_std = X.std(axis=0)
        # Avoid division by zero for constant features
        self._feature_std = np.where(self._feature_std < 1e-8, 1.0, self._feature_std)

        X_norm = (X - self._feature_mean) / self._feature_std
        tensor = torch.FloatTensor(X_norm)
        dataset = TensorDataset(tensor, tensor)
        loader = DataLoader(dataset, batch_size=32, shuffle=True)

        self.model = LoginAutoencoder()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.001)
        criterion = nn.MSELoss()

        self.model.train()
        for _ in range(100):
            for X_batch, y_batch in loader:
                optimizer.zero_grad()
                output = self.model(X_batch)
                loss = criterion(output, y_batch)
                loss.backward()
                optimizer.step()

        # Compute per-sample reconstruction errors on training data
        self.model.eval()
        with torch.no_grad():
            recon = self.model(tensor)
            per_sample_mse = ((recon - tensor) ** 2).numpy()  # shape (n, 7)

        # Per-feature thresholds: mean + 2*std across all training samples
        self._per_feature_thresholds = per_sample_mse.mean(axis=0) + 2 * per_sample_mse.std(axis=0)
        # Global threshold: mean per-sample MSE + 2*std
        sample_mse = per_sample_mse.mean(axis=1)
        self._error_threshold = float(sample_mse.mean() + 2 * sample_mse.std())

    def _normalize(self, feature_vector: List[float]) -> torch.Tensor:
        """
        Normalize a raw feature vector using training-time mean/std.

        Args:
            feature_vector: 7-element list of raw feature floats.

        Returns:
            1D FloatTensor of shape (7,) after normalization.
        """
        x = np.array(feature_vector, dtype=np.float32)
        x_norm = (x - self._feature_mean) / self._feature_std
        return torch.FloatTensor(x_norm).unsqueeze(0)  # shape (1, 7)

    def score(self, feature_vector: List[float]) -> float:
        """
        Compute an anomaly score for a single feature vector.

        Process:
            1. Normalize using training mean/std.
            2. Compute MSE reconstruction error.
            3. Normalize error against the calibrated threshold (error / threshold).
            4. Clip to [0, 1].

        Args:
            feature_vector: 7-element list of raw feature floats.

        Returns:
            Float in [0, 1]. Higher = more anomalous.
        """
        if self.model is None:
            raise RuntimeError("Autoencoder not trained. Call train() first.")

        self.model.eval()
        with torch.no_grad():
            x_tensor = self._normalize(feature_vector)
            recon = self.model(x_tensor)
            mse = float(nn.MSELoss()(recon, x_tensor).item())

        if self._error_threshold <= 0:
            return 0.0

        normalized_score = mse / self._error_threshold
        return float(np.clip(normalized_score, 0.0, 1.0))

    def get_feature_errors(
        self,
        feature_vector: List[float],
        feature_names: List[str],
    ) -> List[dict]:
        """
        Compute per-feature squared reconstruction error for a single event.

        Returns feature-level breakdown of which inputs the autoencoder
        struggled to reconstruct, serving as built-in explanations.

        Args:
            feature_vector: 7-element list of raw feature floats.
            feature_names: 7 feature name strings in canonical order.

        Returns:
            List of dicts sorted by reconstruction_error descending:
                {"feature": str, "reconstruction_error": float}
        """
        if self.model is None:
            raise RuntimeError("Autoencoder not trained. Call train() first.")

        self.model.eval()
        with torch.no_grad():
            x_tensor = self._normalize(feature_vector)
            recon = self.model(x_tensor)
            per_feature_sq_err = ((recon - x_tensor) ** 2).squeeze(0).numpy()

        result = [
            {"feature": name, "reconstruction_error": float(err)}
            for name, err in zip(feature_names, per_feature_sq_err)
        ]
        result.sort(key=lambda x: x["reconstruction_error"], reverse=True)
        return result
