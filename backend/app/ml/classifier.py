import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_recall_fscore_support, accuracy_score, confusion_matrix
import logging

logger = logging.getLogger(__name__)

class RandomForestSecurityClassifier:
    """
    Supervised Random Forest Classifier for labeled cybersecurity datasets.
    
    Trained only when the dataset contains a valid target column with at least 2 distinct classes.
    Maintains strict separation between:
    - Hold-out test set evaluation metrics (Precision, Recall, F1, Confusion Matrix)
    - Full-dataset predictions and probabilities.
    """
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            class_weight='balanced', # Handles security class imbalance
            random_state=random_state,
            n_jobs=-1
        )
        self.is_trained = False
        self.metrics = None
        self.feature_importances = {}

    def fit_evaluate(self, X: np.ndarray, y: np.ndarray, feature_names: list = None):
        """
        Splits data into stratified train/test partitions, trains the model, and calculates metrics.
        """
        unique_classes, counts = np.unique(y, return_counts=True)
        if len(unique_classes) < 2:
            raise ValueError(f"Supervised classification requires at least 2 classes. Found only: {unique_classes}")

        # Check if smallest class has at least 2 samples for stratification
        stratify_opt = y if np.min(counts) >= 2 else None

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=self.random_state, stratify=stratify_opt
        )

        self.model.fit(X_train, y_train)
        self.is_trained = True

        # Test set evaluation
        y_pred_test = self.model.predict(X_test)
        y_prob_test = self.model.predict_proba(X_test)

        acc = accuracy_score(y_test, y_pred_test)
        prec, rec, f1, _ = precision_recall_fscore_support(y_test, y_pred_test, average='weighted', zero_division=0)
        cm = confusion_matrix(y_test, y_pred_test).tolist()

        # Feature importances
        if feature_names and len(feature_names) == len(self.model.feature_importances_):
            imp_pairs = sorted(
                zip(feature_names, self.model.feature_importances_),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            self.feature_importances = [
                {"feature": f, "importance": round(float(imp), 4)} for f, imp in imp_pairs
            ]
        else:
            self.feature_importances = []

        self.metrics = {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "confusion_matrix": cm,
            "classes": [str(c) for c in unique_classes],
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "top_features": self.feature_importances
        }

        # Predict full dataset probabilities
        full_probs = self.model.predict_proba(X)
        # Class 1 (attack/malicious) probability if binary, or max probability
        if full_probs.shape[1] >= 2:
            threat_probs = full_probs[:, 1]
        else:
            threat_probs = full_probs[:, 0]

        return {
            "metrics": self.metrics,
            "predictions": self.model.predict(X),
            "threat_probabilities": np.round(threat_probs, 4)
        }
