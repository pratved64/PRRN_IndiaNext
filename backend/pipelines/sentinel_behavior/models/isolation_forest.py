"""
models/isolation_forest.py — Per-User Isolation Forest for SENTINEL AI

This module trains a separate scikit-learn Isolation Forest model for each
user using their normal (baseline) session data. At inference time, it scores
a feature vector against the per-user model and returns a 0-1 anomaly score
(higher = more anomalous). It also creates SHAP TreeExplainer instances for
each model to provide feature-level explanations.
"""

import sys
import os
import numpy as np
import shap
from sklearn.ensemble import IsolationForest
from typing import Callable, Dict, List, Optional

# Make sure parent package imports resolve when running standalone
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class UserIsolationForest:
    """
    Manages per-user Isolation Forest models and their SHAP explainers.

    One model is trained per user on their normal (non-attack) session
    feature vectors. An optional global fallback model is trained on all
    users' data for users whose model hasn't been trained yet.
    """

    def __init__(self) -> None:
        """
        Initialize empty model and explainer stores.
        """
        self.models: Dict[str, IsolationForest] = {}       # user_id -> fitted IsolationForest
        self.explainers: Dict[str, shap.Explainer] = {}  # user_id -> SHAP Explainer
        self._global_model: Optional[IsolationForest] = None
        self._global_explainer: Optional[shap.Explainer] = None
        self._all_feature_vectors: List[List[float]] = []

    def train_all_users(
        self,
        user_sessions: Dict[str, List[dict]],
        feature_fn: Callable[[dict, List[dict]], List[float]],
    ) -> None:
        """
        Train one Isolation Forest and SHAP TreeExplainer per user.

        For each user, the feature extraction function is called with each
        event in their session list and all prior events as history. The
        resulting feature matrix is used to fit the model.

        Args:
            user_sessions: Dict mapping user_id -> list of session event dicts.
                           These should be normal (non-attack) sessions only.
            feature_fn: Function with signature (event, prior_events) -> list[float]
                        used to produce a feature vector for each event.
        """
        for user_id, sessions in user_sessions.items():
            print(f"  Training Isolation Forest for {user_id}...", end=" ", flush=True)

            feature_matrix: List[List[float]] = []
            for idx, event in enumerate(sessions):
                history = sessions[:idx]  # all events prior to this one
                vec = feature_fn(event, history)
                feature_matrix.append(vec)

            if len(feature_matrix) < 10:
                print(f"skipped (only {len(feature_matrix)} samples)")
                continue

            X = np.array(feature_matrix, dtype=np.float32)
            self._all_feature_vectors.extend(feature_matrix)

            model = IsolationForest(
                n_estimators=100,
                contamination=0.05,  # type: ignore
                random_state=42,
            )
            model.fit(X)
            self.models[user_id] = model

            explainer = shap.Explainer(model, feature_perturbation="interventional")
            self.explainers[user_id] = explainer

            print(f"done ({len(feature_matrix)} sessions)")

        # Train global fallback model
        if self._all_feature_vectors:
            print("  Training global fallback Isolation Forest...", end=" ", flush=True)
            X_global = np.array(self._all_feature_vectors, dtype=np.float32)
            self._global_model = IsolationForest(
                n_estimators=100,
                contamination=0.05,  # type: ignore
                random_state=42,
            )
            self._global_model.fit(X_global)
            self._global_explainer = shap.Explainer(self._global_model, feature_perturbation="interventional")
            print(f"done ({len(self._all_feature_vectors)} total samples)")

    def _get_model_and_explainer(
        self, user_id: str
    ):
        """
        Return the (model, explainer) pair for the given user.
        Falls back to the global model if the user has no dedicated model.

        Args:
            user_id: The user identifier.

        Returns:
            Tuple of (IsolationForest, shap.Explainer).
        """
        if user_id in self.models:
            return self.models[user_id], self.explainers[user_id]
        if self._global_model is not None:
            return self._global_model, self._global_explainer
        raise RuntimeError("No models trained yet. Call train_all_users() first.")

    def score(self, user_id: str, feature_vector: List[float]) -> float:
        """
        Compute an anomaly score for a feature vector against the given user's
        Isolation Forest model (or the global fallback).

        The raw decision_function score (more negative = more anomalous) is
        normalized to a [0, 1] scale where 1.0 = maximally anomalous.

        Normalization: maps [-0.5, 0.5] -> [1, 0], clipped to [0, 1].

        Args:
            user_id: The user identifier to look up the model.
            feature_vector: The 7-element feature list from feature_engineer.

        Returns:
            Float in [0, 1]. Higher = more anomalous.
        """
        model, _ = self._get_model_and_explainer(user_id)
        X = np.array([feature_vector], dtype=np.float32)
        raw = model.decision_function(X)[0]  # negative = anomalous
        # Map [-0.5, 0.5] -> [1.0, 0.0]
        normalized = (0.5 - raw) / 1.0
        return float(np.clip(normalized, 0.0, 1.0))

    def get_shap_values(
        self,
        user_id: str,
        feature_vector: List[float],
        feature_names: List[str],
    ) -> List[dict]:
        """
        Compute per-feature SHAP values for the given feature vector.

        Uses TreeExplainer for the per-user model (or global fallback).
        Returns all 7 features sorted by descending absolute SHAP value.

        Args:
            user_id: The user identifier.
            feature_vector: The 7-element feature list.
            feature_names: The 7 feature name strings (from get_feature_names()).

        Returns:
            List of dicts, each with:
                "feature"    (str): feature name
                "shap_value" (float): SHAP attribution value
                "direction"  (str): "risk" if positive (pushes toward anomaly),
                                    "safe" if negative.
            Sorted by abs(shap_value) descending. All 7 features included.
        """
        _, explainer = self._get_model_and_explainer(user_id)
        X = np.array([feature_vector], dtype=np.float32)
        explanation = explainer(X)
        values = explanation.values[0]  # shape (n_features,)

        result = []
        for name, val in zip(feature_names, values):
            result.append({
                "feature": name,
                "shap_value": float(val),
                "direction": "risk" if val < 0 else "safe",
            })

        result.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        return result
