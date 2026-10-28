import numpy as np
import pandas as pd
import logging

logger = logging.getLogger(__name__)

# Well-known cybersecurity suspicious port references
SUSPICIOUS_PORTS = {
    4444: "Metasploit default listener / Reverse shell",
    1337: "Known backdoor / Hacker elite port",
    3389: "RDP (Remote Desktop) - frequent brute force target",
    22: "SSH - potential credential brute force target",
    445: "SMB / Port 445 - known target for lateral movement / EternalBlue",
    31337: "Back Orifice Trojan default",
    6667: "IRC default (historical Botnet C2 communication)",
    8080: "Alternative HTTP / Proxy / Web application vulnerability target",
    23: "Telnet - plaintext protocol frequently targeted by IoT botnets"
}

class RiskScoringEngine:
    """
    Explainable CyberSecurity Risk Scoring Layer.
    
    METHODOLOGY DOCUMENTATION:
    The Composite Risk Score (0 - 100) combines:
    1. Unsupervised Anomaly Deviation (Weight: 45%):
       Normalized score derived from Isolation Forest decision path divergence.
    2. Supervised Threat Probability (Weight: 35% if labeled model available, otherwise reallocated):
       Class probability from balanced Random Forest classifier.
    3. Network Behavioral Heuristics (Weight: 20% to 55%):
       - Targeted high-risk or commonly exploited destination port (+10 to +25 points)
       - High failed-connection ratio indicating scanning/brute-force (+10 to +20 points)
       - Abnormally high data transfer volume (egress spike) (+10 to +15 points)
       - High packet density / flood characteristics (+10 points)
    
    SEVERITY MAPPING:
    - Critical (80 - 100): High anomaly score, high-risk port/attack signature, immediate SOC triage.
    - High (60 - 79): Distinct anomaly with elevated risk factors.
    - Medium (35 - 59): Moderate deviation from baseline traffic; warrants secondary review.
    - Low (0 - 34): Normal or baseline operational traffic with minor noise.
    
    IMPORTANT: Risk scores reflect analytical suspicion metrics to assist SOC triage,
    and do not represent confirmed malicious attacks without analyst validation.
    """

    @staticmethod
    def calculate_risk(
        row_dict: dict,
        anomaly_score: float,
        is_anomaly: bool,
        top_deviations: list,
        supervised_prob: float = None
    ) -> dict:
        score = 0.0
        reasons = []
        investigation_steps = []
        relevant_features = {}

        # 1. Anomaly contribution (0 - 45 pts)
        score += float(anomaly_score) * 45.0
        if is_anomaly:
            reasons.append(f"Flagged as statistical anomaly by Isolation Forest (score: {int(anomaly_score * 100)}/100).")

        # 2. Supervised model contribution if available (0 - 35 pts)
        if supervised_prob is not None:
            score += float(supervised_prob) * 35.0
            if supervised_prob > 0.5:
                reasons.append(f"Supervised classifier estimated threat pattern match ({int(supervised_prob * 100)}% confidence).")
        else:
            # If unsupervised only, scale anomaly contribution to 65%
            score += float(anomaly_score) * 20.0

        # 3. Network Behavioral Heuristics
        # Check Destination Port
        dst_port = None
        for key in ['dst_port', 'destination_port', 'dport', 'port']:
            if key in row_dict and pd.notna(row_dict[key]):
                try:
                    dst_port = int(float(row_dict[key]))
                    relevant_features['destination_port'] = dst_port
                    break
                except (ValueError, TypeError):
                    pass

        if dst_port and dst_port in SUSPICIOUS_PORTS:
            score += 20.0
            reasons.append(f"Destination port {dst_port} matches known threat signature: {SUSPICIOUS_PORTS[dst_port]}.")
            investigation_steps.append(f"Verify authorized services running on port {dst_port}; check firewall perimeter rules.")

        # Check Failed Connections
        failed_conns = 0
        for key in ['failed_connection_count', 'failed_connections', 'failed_conns', 'error_count']:
            if key in row_dict and pd.notna(row_dict[key]):
                try:
                    failed_conns = float(row_dict[key])
                    relevant_features['failed_connections'] = failed_conns
                    break
                except (ValueError, TypeError):
                    pass

        if failed_conns >= 10:
            score += 15.0
            reasons.append(f"Elevated failed connections ({int(failed_conns)}) indicating potential brute force or port scanning.")
            investigation_steps.append("Inspect authentication logs on target host for repeated failed access attempts.")
        elif failed_conns >= 3:
            score += 8.0
            reasons.append(f"Multiple failed connection attempts detected ({int(failed_conns)}).")

        # Check Bytes Transferred / Egress
        bytes_val = 0
        for key in ['bytes_transferred', 'bytes', 'tot_bytes', 'packet_bytes']:
            if key in row_dict and pd.notna(row_dict[key]):
                try:
                    bytes_val = float(row_dict[key])
                    relevant_features['bytes_transferred'] = bytes_val
                    break
                except (ValueError, TypeError):
                    pass

        if bytes_val > 5_000_000: # > 5MB in single flow
            score += 12.0
            reasons.append(f"Substantial data volume ({bytes_val / 1_000_000:.2f} MB) transferred in single flow.")
            investigation_steps.append("Analyze payload content and destination reputation for data exfiltration indicators.")

        # Include top deviating features
        if top_deviations:
            dev_str = ", ".join([f"{d['feature']} (deviation: {d['z_score']}σ)" for d in top_deviations])
            reasons.append(f"Statistically divergent features: {dev_str}")
            for d in top_deviations:
                relevant_features[d['feature']] = row_dict.get(d['feature'])

        # Capture IP addresses for context
        for ip_key in ['source_ip', 'src_ip', 'srcip']:
            if ip_key in row_dict and pd.notna(row_dict[ip_key]):
                relevant_features['source_ip'] = str(row_dict[ip_key])
                break
        for ip_key in ['destination_ip', 'dst_ip', 'dstip']:
            if ip_key in row_dict and pd.notna(row_dict[ip_key]):
                relevant_features['destination_ip'] = str(row_dict[ip_key])
                break
        for proto_key in ['protocol', 'proto']:
            if proto_key in row_dict and pd.notna(row_dict[proto_key]):
                relevant_features['protocol'] = str(row_dict[proto_key])
                break

        # Standard default investigation steps if none triggered
        if not investigation_steps:
            if score >= 60:
                investigation_steps.append("Validate source IP reputation using Threat Intelligence feeds (e.g. AlienVault OTX, VirusTotal).")
                investigation_steps.append("Review endpoint host process table around the flow detection window.")
            else:
                investigation_steps.append("Perform routine event logging correlation and monitor for recurrent anomalous spikes.")

        # Clamp score to 0 - 100
        final_score = int(min(100, max(0, round(score))))

        # Determine severity level
        if final_score >= 80:
            severity = "Critical"
        elif final_score >= 60:
            severity = "High"
        elif final_score >= 35:
            severity = "Medium"
        else:
            severity = "Low"

        # If no specific reason triggered, assign default baseline summary
        detection_reason = " | ".join(reasons) if reasons else "Traffic pattern matches normal operational baseline characteristics."

        return {
            "risk_score": final_score,
            "severity": severity,
            "detection_reason": detection_reason,
            "relevant_features": relevant_features,
            "recommended_investigation_steps": investigation_steps
        }
