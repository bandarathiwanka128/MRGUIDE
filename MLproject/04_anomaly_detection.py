"""
ML Enhancement 4 — Real-Time Anomaly Detection for Booking Fraud
=================================================================
Uses Isolation Forest (unsupervised) to flag unusual booking patterns
without needing labelled fraud data.

WSO2 / ML interview talking point:
  "I trained an Isolation Forest on trip features (distance, fare, time
   between bookings, tourist history). Anomaly scores are served via a
   lightweight Flask endpoint that the booking route calls before creating
   a trip — if the score crosses the threshold, the request is flagged for
   manual review rather than hard-blocked, reducing false positives."

Dataset:
  Synthetic trip data generated to mimic realistic booking distributions
  for Sri Lanka tour distances (1–150 km) and fares (LKR 500–15 000).

Usage:
  python 04_anomaly_detection.py          # train + evaluate
  python 04_anomaly_detection.py --serve  # start Flask API on :5001

API (when --serve):
  POST /detect
  Body: { "distance_km": 12.5, "base_fare": 2400, "tourist_id": 42,
          "hour_of_day": 14, "bookings_last_hour": 1 }
  Response: { "anomaly": false, "score": -0.12, "threshold": -0.15 }
"""

import argparse
import json
import os
import pickle
import warnings
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report

warnings.filterwarnings('ignore')

RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results', 'figures')
os.makedirs(RESULTS_DIR, exist_ok=True)

# ─── 1. Generate synthetic trip dataset ───────────────────────────────────────
np.random.seed(42)

def generate_trip_data(n_normal=1000, n_anomaly=50):
    """Simulate realistic + fraudulent booking patterns."""

    # Normal bookings — realistic Sri Lanka distances & fares
    normal = pd.DataFrame({
        'distance_km':         np.random.lognormal(mean=2.3, sigma=0.7, size=n_normal).clip(1, 120),
        'base_fare':           np.random.lognormal(mean=7.8, sigma=0.5, size=n_normal).clip(500, 12000),
        'hour_of_day':         np.random.randint(6, 22, size=n_normal),
        'bookings_last_hour':  np.random.poisson(lam=0.3, size=n_normal).clip(0, 3),
        'tourist_trip_count':  np.random.randint(0, 20, size=n_normal),
        'label': 0  # 0 = normal
    })

    # Anomalous bookings — extreme patterns that indicate fraud or system abuse
    anomaly = pd.DataFrame({
        # Case A: impossibly long distance for Sri Lanka
        'distance_km':         np.concatenate([
            np.random.uniform(300, 1000, size=n_anomaly // 2),   # way too far
            np.random.uniform(0.01, 0.1, size=n_anomaly // 2)    # suspiciously short
        ]),
        # Case B: fare inconsistent with distance
        'base_fare':           np.random.choice(
            [np.random.uniform(50, 200, n_anomaly),               # underpriced
             np.random.uniform(50000, 200000, n_anomaly)],        # overpriced
            p=[0.5, 0.5]
        )[np.arange(n_anomaly)],
        'hour_of_day':         np.random.choice([0, 1, 2, 3, 4], size=n_anomaly),  # late night
        'bookings_last_hour':  np.random.randint(10, 30, size=n_anomaly),           # burst
        'tourist_trip_count':  np.random.randint(100, 500, size=n_anomaly),         # unrealistic
        'label': 1  # 1 = anomaly
    })

    df = pd.concat([normal, anomaly], ignore_index=True).sample(frac=1, random_state=42)
    return df


# ─── 2. Feature engineering ───────────────────────────────────────────────────
def engineer_features(df):
    df = df.copy()
    df['fare_per_km']        = df['base_fare'] / df['distance_km'].clip(lower=0.1)
    df['is_night']           = (df['hour_of_day'] < 6).astype(int)
    df['booking_burst']      = (df['bookings_last_hour'] > 5).astype(int)
    df['experienced_tourist']= (df['tourist_trip_count'] > 10).astype(int)
    return df


FEATURE_COLS = [
    'distance_km', 'base_fare', 'hour_of_day',
    'bookings_last_hour', 'tourist_trip_count',
    'fare_per_km', 'is_night', 'booking_burst', 'experienced_tourist'
]


# ─── 3. Train Isolation Forest ────────────────────────────────────────────────
def train_model(df):
    df = engineer_features(df)
    X  = df[FEATURE_COLS].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # contamination = expected fraction of anomalies (~5%)
    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        max_features=0.8,
        bootstrap=True,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled)

    return model, scaler


# ─── 4. Evaluate ──────────────────────────────────────────────────────────────
def evaluate(model, scaler, df):
    df = engineer_features(df)
    X  = scaler.transform(df[FEATURE_COLS].values)
    y_true = df['label'].values                    # 0=normal, 1=anomaly

    # IsolationForest: predict returns 1 (normal) or -1 (anomaly)
    raw_pred  = model.predict(X)
    y_pred    = (raw_pred == -1).astype(int)       # convert to 0/1

    scores    = model.decision_function(X)         # higher = more normal
    threshold = np.percentile(scores, 5)           # 5th percentile as cut-off

    print("\n" + "="*60)
    print("  ISOLATION FOREST — ANOMALY DETECTION REPORT")
    print("="*60)
    print(f"  Samples:        {len(df):,}  (normal: {(y_true==0).sum():,}  anomaly: {(y_true==1).sum():,})")
    print(f"  Contamination:  5%  (tunable via model param)")
    print(f"  Decision threshold: {threshold:.4f}")
    print()
    print(classification_report(y_true, y_pred, target_names=['Normal', 'Anomaly']))
    print("="*60)

    # Confusion matrix
    cm  = confusion_matrix(y_true, y_pred)
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    fig.patch.set_facecolor('#0D1B2A')

    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Normal','Anomaly'], yticklabels=['Normal','Anomaly'],
                ax=axes[0])
    axes[0].set_title('Confusion Matrix', color='white', fontsize=13)
    axes[0].tick_params(colors='white')
    axes[0].set_facecolor('#1a2d42')

    # Score distribution
    normal_scores  = scores[y_true == 0]
    anomaly_scores = scores[y_true == 1]
    axes[1].hist(normal_scores,  bins=40, alpha=0.7, color='#34699A', label='Normal')
    axes[1].hist(anomaly_scores, bins=40, alpha=0.7, color='#FFCC00', label='Anomaly')
    axes[1].axvline(threshold, color='red', linestyle='--', label=f'Threshold ({threshold:.3f})')
    axes[1].set_title('Anomaly Score Distribution', color='white', fontsize=13)
    axes[1].set_xlabel('Decision Score', color='white')
    axes[1].legend()
    axes[1].set_facecolor('#1a2d42')
    axes[1].tick_params(colors='white')

    for ax in axes:
        for spine in ax.spines.values():
            spine.set_edgecolor('#34699A')

    plt.tight_layout()
    out = os.path.join(RESULTS_DIR, 'anomaly_detection.png')
    plt.savefig(out, dpi=120, bbox_inches='tight', facecolor='#0D1B2A')
    plt.close()
    print(f"\n  Plot saved → {out}")

    return threshold


# ─── 5. Save artefacts ────────────────────────────────────────────────────────
def save_artefacts(model, scaler, threshold):
    artefact = {'model': model, 'scaler': scaler, 'threshold': threshold,
                'features': FEATURE_COLS}
    path = os.path.join(os.path.dirname(__file__), 'results', 'anomaly_model.pkl')
    with open(path, 'wb') as f:
        pickle.dump(artefact, f)
    print(f"  Model saved → {path}")
    return path


# ─── 6. Flask API server (optional) ──────────────────────────────────────────
def serve(model_path):
    try:
        from flask import Flask, request, jsonify
    except ImportError:
        print("Flask not installed. Run: pip install flask")
        return

    with open(model_path, 'rb') as f:
        artefact = pickle.load(f)

    m, s, thresh = artefact['model'], artefact['scaler'], artefact['threshold']
    app = Flask(__name__)

    @app.route('/detect', methods=['POST'])
    def detect():
        data = request.get_json()
        row = pd.DataFrame([{
            'distance_km':        float(data.get('distance_km', 10)),
            'base_fare':          float(data.get('base_fare', 2000)),
            'hour_of_day':        int(data.get('hour_of_day', 12)),
            'bookings_last_hour': int(data.get('bookings_last_hour', 0)),
            'tourist_trip_count': int(data.get('tourist_trip_count', 0))
        }])
        row = engineer_features(row)
        X   = s.transform(row[FEATURE_COLS].values)
        score   = float(m.decision_function(X)[0])
        is_anom = score < thresh
        return jsonify({
            'anomaly':   is_anom,
            'score':     round(score, 4),
            'threshold': round(thresh, 4),
            'action':    'FLAG_FOR_REVIEW' if is_anom else 'ALLOW'
        })

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok', 'model': 'IsolationForest'})

    print("\n[Anomaly API] Running on http://localhost:5001")
    print("[Anomaly API] POST /detect  |  GET /health")
    app.run(port=5001, debug=False)


# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--serve', action='store_true', help='Start Flask API after training')
    args = parser.parse_args()

    print("\n[1/4] Generating synthetic trip data...")
    df = generate_trip_data(n_normal=1000, n_anomaly=50)
    print(f"      Dataset: {len(df):,} rows  |  Features: {FEATURE_COLS}")

    print("[2/4] Training Isolation Forest...")
    model, scaler = train_model(df)

    print("[3/4] Evaluating model...")
    threshold = evaluate(model, scaler, df)

    print("[4/4] Saving model artefacts...")
    model_path = save_artefacts(model, scaler, threshold)

    print("\n✅  Anomaly detection model ready.")
    print("    To serve as API: python 04_anomaly_detection.py --serve\n")

    if args.serve:
        serve(model_path)
