"""
一次性訓練腳本：從 NBA_Normalized_Final.csv 訓練 Lasso 迴歸模型（邏輯搬自 Lasso.ipynb），
並用 joblib 存成 models/lasso_pipeline.pkl，讓 Streamlit 網站啟動時可以直接載入，
不用每次都重新訓練。

用法：
    python train_model.py
"""
import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Lasso
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "NBA_Normalized_Final.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "lasso_pipeline.pkl")
META_PATH = os.path.join(MODEL_DIR, "model_meta.json")

FEATURE_COLS = [
    "2P%", "2PA", "3P", "3P%", "3PA", "3PAr", "AST", "AST%", "BLK", "BLK%", "BPM", "DBPM",
    "DRB", "DRB%", "DWS", "FG", "FG%", "FGA", "FT", "FT%", "FTA", "FTr",
    "OBPM", "ORB", "ORB%", "OWS", "PER", "PF", "PTS", "Pos_C", "Pos_PF", "Pos_PG",
    "Pos_SF", "Pos_SG", "STL", "STL%", "TOV", "TOV%", "TRB", "TRB%", "TS%", "USG%",
    "VORP", "WS", "WS/48", "eFG%",
]
TARGET_COL = "Year3_WS"
BOOL_COLS = ["Is_Undrafted", "Pos_PG", "Pos_C", "Pos_SG", "Pos_SF", "Pos_PF"]


def load_training_data():
    df = pd.read_csv(DATA_PATH)

    for col in BOOL_COLS:
        if col in df.columns:
            df[col] = df[col].astype(str).str.upper().map({"TRUE": 1, "FALSE": 0})

    # 三年級以上、2000 年後梯次，且已有第三年成績可供訓練
    df_g = df[(df["season"] > 1) & (df["year_start"] > 1999)].copy()

    data = df_g.dropna(subset=[TARGET_COL]).copy()
    for c in FEATURE_COLS:
        data[c] = pd.to_numeric(data[c], errors="coerce")
    data[TARGET_COL] = pd.to_numeric(data[TARGET_COL], errors="coerce")
    data = data.dropna(subset=[TARGET_COL]).copy()

    X = data[FEATURE_COLS].copy()
    y = data[TARGET_COL].copy()
    return X, y


def train():
    X, y = load_training_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    alphas = np.logspace(-4, 1, 40)
    cv_splits = min(5, len(X_train))

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("lasso", Lasso(max_iter=50000, random_state=42, tol=1e-4)),
    ])

    grid_search = GridSearchCV(
        pipeline,
        {"lasso__alpha": alphas},
        cv=cv_splits,
        scoring="r2",
        n_jobs=1,
    )
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_
    best_alpha = grid_search.best_params_["lasso__alpha"]

    train_r2 = r2_score(y_train, best_model.predict(X_train))
    test_r2 = r2_score(y_test, best_model.predict(X_test))
    y_pred_test = best_model.predict(X_test)
    rmse_test = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))
    mae_test = float(mean_absolute_error(y_test, y_pred_test))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(best_model, MODEL_PATH)

    meta = {
        "feature_cols": FEATURE_COLS,
        "target_col": TARGET_COL,
        "best_alpha": best_alpha,
        "train_r2": train_r2,
        "test_r2": test_r2,
        "test_rmse": rmse_test,
        "test_mae": mae_test,
        "n_train": len(X_train),
        "n_test": len(X_test),
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print("=" * 45)
    print("Training complete")
    print(f"Train R2: {train_r2:.4f}  Test R2: {test_r2:.4f}")
    print(f"Test RMSE: {rmse_test:.4f}  Test MAE: {mae_test:.4f}")
    print(f"Best alpha: {best_alpha:.4f}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metadata saved to: {META_PATH}")
    print("=" * 45)


if __name__ == "__main__":
    train()
