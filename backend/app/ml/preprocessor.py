import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, RobustScaler
import logging

logger = logging.getLogger(__name__)

IP_COLUMN_HINTS = {'src_ip', 'source_ip', 'dst_ip', 'destination_ip', 'srcip', 'dstip', 'source_address', 'destination_address'}
PORT_COLUMN_HINTS = {'src_port', 'source_port', 'dst_port', 'destination_port', 'sport', 'dport', 'port'}
PROTOCOL_COLUMN_HINTS = {'protocol', 'proto', 'service'}
LABEL_COLUMN_HINTS = {'target_label', 'label', 'attack', 'is_attack', 'class', 'malicious', 'threat_label'}
IGNORE_COLUMN_HINTS = {'id', '_id', 'timestamp', 'time', 'flow_id', 'record_id', 'session_id', 'date'}

class MLPreprocessor:
    def __init__(self):
        self.scaler = RobustScaler()
        self.numerical_cols = []
        self.categorical_cols = []
        self.ip_cols = []
        self.port_cols = []
        self.protocol_col = None
        self.label_col = None
        self.id_cols = []
        self.feature_names = []
        self.categories_map = {}

    def analyze_schema(self, df: pd.DataFrame, custom_label_col: str = None):
        """Analyzes dataframe columns and categorizes them according to security domain types."""
        self.numerical_cols = []
        self.categorical_cols = []
        self.ip_cols = []
        self.port_cols = []
        self.id_cols = []
        self.protocol_col = None
        self.label_col = None

        col_lower_map = {col.lower().strip(): col for col in df.columns}

        # Check for user-specified label column or known hint
        if custom_label_col and custom_label_col in df.columns:
            self.label_col = custom_label_col
        else:
            for hint in LABEL_COLUMN_HINTS:
                if hint in col_lower_map:
                    self.label_col = col_lower_map[hint]
                    break

        for col in df.columns:
            if col == self.label_col:
                continue

            col_lower = col.lower().strip()

            if col_lower in IGNORE_COLUMN_HINTS:
                self.id_cols.append(col)
                continue

            if col_lower in IP_COLUMN_HINTS or 'ip' in col_lower:
                self.ip_cols.append(col)
                continue

            if col_lower in PORT_COLUMN_HINTS or 'port' in col_lower:
                self.port_cols.append(col)
                # Ports are numeric but discrete; we treat them as numeric features
                self.numerical_cols.append(col)
                continue

            if col_lower in PROTOCOL_COLUMN_HINTS:
                self.protocol_col = col
                self.categorical_cols.append(col)
                continue

            # Check data type
            if pd.api.types.is_numeric_dtype(df[col]):
                self.numerical_cols.append(col)
            elif pd.api.types.is_string_dtype(df[col]) or pd.api.types.is_object_dtype(df[col]):
                # If unique values are small, treat as categorical
                if df[col].nunique() < 50:
                    self.categorical_cols.append(col)
                else:
                    self.id_cols.append(col)

        logger.info(f"ML Preprocessor schema analysis: numerical={len(self.numerical_cols)}, "
                    f"categorical={len(self.categorical_cols)}, ip={self.ip_cols}, label={self.label_col}")

        return {
            "numerical_features": self.numerical_cols,
            "categorical_features": self.categorical_cols,
            "ip_columns": self.ip_cols,
            "port_columns": self.port_cols,
            "protocol_column": self.protocol_col,
            "label_column": self.label_col,
            "ignored_columns": self.id_cols
        }

    def fit_transform(self, df: pd.DataFrame, custom_label_col: str = None):
        """Preprocesses dataset into a clean scaled numeric feature matrix for ML algorithms."""
        self.analyze_schema(df, custom_label_col=custom_label_col)

        if not self.numerical_cols and not self.categorical_cols:
            raise ValueError("No suitable numerical or categorical features found in the dataset for machine learning analysis.")

        processed_parts = []
        feature_names = []

        # 1. Process numerical features
        if self.numerical_cols:
            num_df = df[self.numerical_cols].copy()
            # Replace inf, -inf with NaN
            num_df = num_df.replace([np.inf, -np.inf], np.nan)
            # Impute NaN with column median, or 0 if all NaN
            for col in self.numerical_cols:
                median_val = num_df[col].median()
                if pd.isna(median_val):
                    median_val = 0.0
                num_df[col] = num_df[col].fillna(median_val)
                feature_names.append(col)

            scaled_num = self.scaler.fit_transform(num_df.values)
            processed_parts.append(scaled_num)

        # 2. Process categorical features with one-hot encoding
        if self.categorical_cols:
            cat_df = df[self.categorical_cols].copy()
            cat_df = cat_df.fillna("UNKNOWN").astype(str)
            dummies = pd.get_dummies(cat_df, drop_first=False, dtype=float)
            if not dummies.empty:
                for col in dummies.columns:
                    feature_names.append(f"cat_{col}")
                processed_parts.append(dummies.values)

        if not processed_parts:
            raise ValueError("Feature transformation yielded an empty feature matrix.")

        X = np.hstack(processed_parts)
        self.feature_names = feature_names

        # 3. Extract label if present
        y = None
        if self.label_col and self.label_col in df.columns:
            y_raw = df[self.label_col]
            # Convert binary or string labels to 0/1 or categorical codes
            if pd.api.types.is_numeric_dtype(y_raw):
                y = y_raw.values
            else:
                y = (y_raw.astype(str).str.lower().isin(['attack', 'malicious', '1', 'true', 'anomaly', 'threat', 'suspicious'])).astype(int).values

        return X, y, self.feature_names
