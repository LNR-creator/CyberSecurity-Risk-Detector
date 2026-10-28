import os
import random
import numpy as np
import pandas as pd

def generate_synthetic_cybersecurity_data(n_samples=500, anomaly_ratio=0.10, seed=42):
    """
    Generates realistic synthetic network traffic and security event datasets for demonstration.
    
    Fields:
    - source_ip
    - destination_ip
    - protocol
    - source_port
    - destination_port
    - packet_count
    - bytes_transferred
    - connection_duration
    - failed_connection_count
    - target_label (0 = Normal, 1 = Suspicious / Attack Indicator)
    """
    np.random.seed(seed)
    random.seed(seed)

    protocols = ['TCP', 'UDP', 'ICMP']
    internal_subnets = ['192.168.1.', '10.0.0.', '172.16.10.']
    external_ips = [
        '93.184.216.34', '151.101.1.140', '104.244.42.1', '198.51.100.45',
        '203.0.113.19', '185.199.108.153', '45.33.32.156', '8.8.8.8'
    ]
    common_normal_ports = [80, 443, 53, 123, 8080]
    suspicious_ports = [4444, 1337, 3389, 22, 445, 31337]

    n_anomalies = int(n_samples * anomaly_ratio)
    n_normal = n_samples - n_anomalies

    records = []

    # 1. Normal traffic generation
    for _ in range(n_normal):
        src_subnet = random.choice(internal_subnets)
        src_ip = f"{src_subnet}{random.randint(2, 250)}"
        dst_ip = random.choice(external_ips)
        proto = random.choices(['TCP', 'UDP'], weights=[0.8, 0.2])[0]
        src_port = random.randint(30000, 65000)
        dst_port = random.choice(common_normal_ports)

        # Realistic normal metrics
        duration = round(float(np.random.exponential(scale=2.5) + 0.1), 2)
        packet_count = int(np.random.negative_binomial(10, 0.3) + 5)
        bytes_transferred = int(packet_count * np.random.uniform(200, 1400))
        failed_conns = int(np.random.choice([0, 1, 2], p=[0.92, 0.06, 0.02]))

        records.append({
            'source_ip': src_ip,
            'destination_ip': dst_ip,
            'protocol': proto,
            'source_port': src_port,
            'destination_port': dst_port,
            'packet_count': packet_count,
            'bytes_transferred': bytes_transferred,
            'connection_duration': duration,
            'failed_connection_count': failed_conns,
            'target_label': 0
        })

    # 2. Anomalous / Suspicious patterns generation
    attack_types = ['brute_force', 'exfiltration', 'reverse_shell', 'syn_flood', 'recon_scan']
    for i in range(n_anomalies):
        atype = attack_types[i % len(attack_types)]
        src_ip = f"192.168.1.{random.randint(100, 240)}"
        dst_ip = random.choice(external_ips)
        proto = 'TCP'
        src_port = random.randint(40000, 65000)

        if atype == 'brute_force':
            # RDP / SSH repeated failures
            dst_port = random.choice([22, 3389])
            duration = round(float(np.random.uniform(45.0, 180.0)), 2)
            packet_count = random.randint(150, 600)
            bytes_transferred = packet_count * random.randint(80, 250)
            failed_conns = random.randint(12, 45)

        elif atype == 'exfiltration':
            # Sudden high data volume
            dst_port = random.choice([443, 8080, 8443])
            duration = round(float(np.random.uniform(60.0, 300.0)), 2)
            packet_count = random.randint(5000, 18000)
            bytes_transferred = random.randint(8_000_000, 35_000_000) # 8MB - 35MB
            failed_conns = random.randint(0, 1)

        elif atype == 'reverse_shell':
            # Suspicious port, long duration, low periodic bytes
            dst_port = random.choice([4444, 1337, 31337])
            duration = round(float(np.random.uniform(300.0, 1200.0)), 2)
            packet_count = random.randint(40, 150)
            bytes_transferred = packet_count * random.randint(40, 120)
            failed_conns = 0

        elif atype == 'syn_flood':
            # Very short duration, huge packet count, high failed conns
            dst_port = 80
            duration = round(float(np.random.uniform(0.5, 3.0)), 2)
            packet_count = random.randint(800, 3500)
            bytes_transferred = packet_count * 54
            failed_conns = random.randint(50, 200)

        else: # recon_scan
            # Rapid port scanning
            dst_port = random.choice(suspicious_ports)
            duration = round(float(np.random.uniform(0.1, 1.2)), 2)
            packet_count = random.randint(5, 15)
            bytes_transferred = packet_count * 60
            failed_conns = random.randint(5, 12)

        records.append({
            'source_ip': src_ip,
            'destination_ip': dst_ip,
            'protocol': proto,
            'source_port': src_port,
            'destination_port': dst_port,
            'packet_count': packet_count,
            'bytes_transferred': bytes_transferred,
            'connection_duration': duration,
            'failed_connection_count': failed_conns,
            'target_label': 1
        })

    # Shuffle records
    random.shuffle(records)
    df = pd.DataFrame(records)
    return df

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    os.makedirs(data_dir, exist_ok=True)

    # 1. Generate full labeled dataset
    df_labeled = generate_synthetic_cybersecurity_data(n_samples=600, anomaly_ratio=0.12, seed=42)
    labeled_path = os.path.join(data_dir, 'sample_labeled_dataset.csv')
    df_labeled.to_csv(labeled_path, index=False)
    print(f"Generated labeled sample dataset: {labeled_path} ({len(df_labeled)} rows)")

    # 2. Generate unsupervised dataset (without target_label column)
    df_unsupervised = df_labeled.drop(columns=['target_label'])
    unsupervised_path = os.path.join(data_dir, 'sample_dataset.csv')
    df_unsupervised.to_csv(unsupervised_path, index=False)
    print(f"Generated unsupervised sample dataset: {unsupervised_path} ({len(df_unsupervised)} rows)")
