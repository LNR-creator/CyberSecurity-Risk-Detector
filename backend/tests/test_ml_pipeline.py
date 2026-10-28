import os
import pandas as pd
import numpy as np
import pytest
from app.ml.preprocessor import MLPreprocessor
from app.ml.anomaly_detector import IsolationForestDetector
from app.ml.classifier import RandomForestSecurityClassifier
from app.ml.risk_engine import RiskScoringEngine

@pytest.fixture
def sample_data():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_path = os.path.join(base_dir, 'data', 'sample_labeled_dataset.csv')
    assert os.path.exists(data_path), f"Sample dataset not found at {data_path}"
    return pd.read_csv(data_path)

def test_ml_preprocessor(sample_data):
    preprocessor = MLPreprocessor()
    X, y, feature_names = preprocessor.fit_transform(sample_data, custom_label_col='target_label')

    assert X.shape[0] == len(sample_data)
    assert X.shape[1] > 0
    assert y is not None
    assert len(y) == len(sample_data)
    assert len(feature_names) == X.shape[1]
    assert np.all(np.isfinite(X)), "Preprocessed feature matrix contains infinite or NaN values"

def test_isolation_forest_anomaly_detection(sample_data):
    preprocessor = MLPreprocessor()
    X, _, feature_names = preprocessor.fit_transform(sample_data)

    contamination = 0.10
    detector = IsolationForestDetector(contamination=contamination, random_state=42)
    results = detector.fit_predict(X, feature_names=feature_names)

    assert "is_anomaly" in results
    assert "anomaly_scores" in results
    assert len(results["is_anomaly"]) == len(sample_data)
    assert results["anomaly_count"] > 0
    assert np.all((results["anomaly_scores"] >= 0.0) & (results["anomaly_scores"] <= 1.0))
    # Check explainable deviations exist
    assert len(results["top_deviations"]) == len(sample_data)

def test_random_forest_supervised_classification(sample_data):
    preprocessor = MLPreprocessor()
    X, y, feature_names = preprocessor.fit_transform(sample_data, custom_label_col='target_label')

    classifier = RandomForestSecurityClassifier(random_state=42)
    res = classifier.fit_evaluate(X, y, feature_names=feature_names)

    metrics = res["metrics"]
    assert "accuracy" in metrics
    assert "precision" in metrics
    assert "recall" in metrics
    assert "f1_score" in metrics
    assert "confusion_matrix" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0
    assert len(res["threat_probabilities"]) == len(sample_data)

def test_risk_scoring_engine():
    # Test High-risk anomaly case
    suspicious_row = {
        "source_ip": "192.168.1.105",
        "destination_ip": "198.51.100.45",
        "destination_port": 4444, # Metasploit port
        "failed_connection_count": 25, # High failures
        "bytes_transferred": 15_000_000, # Large egress
        "protocol": "TCP"
    }

    risk_result = RiskScoringEngine.calculate_risk(
        row_dict=suspicious_row,
        anomaly_score=0.92,
        is_anomaly=True,
        top_deviations=[{"feature": "bytes_transferred", "z_score": 4.5}],
        supervised_prob=0.88
    )

    assert 0 <= risk_result["risk_score"] <= 100
    assert risk_result["severity"] in ["Critical", "High"]
    assert "Metasploit" in risk_result["detection_reason"] or "4444" in risk_result["detection_reason"]
    assert len(risk_result["recommended_investigation_steps"]) > 0

    # Test Normal benign case
    normal_row = {
        "source_ip": "192.168.1.20",
        "destination_ip": "8.8.8.8",
        "destination_port": 53,
        "failed_connection_count": 0,
        "bytes_transferred": 250,
        "protocol": "UDP"
    }

    normal_result = RiskScoringEngine.calculate_risk(
        row_dict=normal_row,
        anomaly_score=0.05,
        is_anomaly=False,
        top_deviations=[]
    )

    assert normal_result["risk_score"] <= 35
    assert normal_result["severity"] in ["Low", "Medium"]
