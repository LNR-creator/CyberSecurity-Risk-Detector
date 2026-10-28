import numpy as np
from sklearn.ensemble import IsolationForest
import logging

logger = logging.getLogger(__name__)

class IsolationForestDetector:
    """
    Unsupervised Anomaly Detector using Isolation Forest.
    
    Technical Interpretation:
    - Isolation Forest isolates observations by randomly selecting a feature and then randomly
      selecting a split value between the maximum and minimum values of the selected feature.
    - Since recursive partitioning can be represented by a tree structure, the number of splittings
      required to isolate a sample is equivalent to the path length from the root node to the terminating leaf node.
    - Anomalies require fewer splits (shorter path lengths) to isolate than normal instances.
    
    IMPORTANT NOTE:
    - Anomaly scores are relative statistical divergence measures.
    - They MUST NOT be interpreted as calibrated probabilities of a malicious attack.
    """
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=100,
            n_jobs=-1
        )
        self.is_fitted = False

    def fit_predict(self, X: np.ndarray, feature_names: list = None):
        """
        Trains Isolation Forest and predicts anomaly scores for the dataset.
        
        Returns:
            is_anomaly: boolean array where True = detected anomaly (Isolation Forest label == -1)
            anomaly_scores: normalized continuous score from 0.0 (very normal) to 1.0 (most anomalous)
            raw_scores: sklearn decision function output (negative = anomaly, positive = normal)
            top_deviations: list of top deviating features per record
        """
        self.model.fit(X)
        self.is_fitted = True

        raw_scores = self.model.decision_function(X) # lower is more abnormal
        predictions = self.model.predict(X)          # -1 for anomalies, 1 for normal

        is_anomaly = (predictions == -1)

        # Normalize decision function to [0.0, 1.0] anomaly score
        # In sklearn, decision_function returns negative values for anomalies and positive for normal.
        # We invert it: min raw_score -> 1.0, max raw_score -> 0.0
        min_s = float(np.min(raw_scores))
        max_s = float(np.max(raw_scores))
        if max_s > min_s:
            normalized_scores = (max_s - raw_scores) / (max_s - min_s)
        else:
            normalized_scores = np.zeros(len(raw_scores))

        # Compute feature deviations for explainability
        # Feature z-scores or distance from median
        medians = np.median(X, axis=0)
        stds = np.std(X, axis=0)
        stds[stds == 0] = 1.0 # avoid div zero

        z_scores = np.abs((X - medians) / stds)
        top_deviations = []

        if feature_names and len(feature_names) == X.shape[1]:
            for row_idx in range(X.shape[0]):
                if is_anomaly[row_idx]:
                    # Find top 3 features with highest absolute deviation
                    row_z = z_scores[row_idx]
                    top_indices = np.argsort(row_z)[-3:][::-1]
                    deviations = [
                        {
                            "feature": feature_names[i],
                            "z_score": round(float(row_z[i]), 2)
                        }
                        for i in top_indices if row_z[i] > 1.2
                    ]
                    top_deviations.append(deviations)
                else:
                    top_deviations.append([])
        else:
            top_deviations = [[] for _ in range(X.shape[0])]

        return {
            "is_anomaly": is_anomaly,
            "anomaly_scores": np.round(normalized_scores, 4),
            "raw_scores": np.round(raw_scores, 4),
            "top_deviations": top_deviations,
            "anomaly_count": int(np.sum(is_anomaly)),
            "contamination_used": self.contamination
        }
