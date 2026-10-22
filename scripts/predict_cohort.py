"""
研究的逐年預測流程（移植自 notebooks/models/Lasso.ipynb 第 1、3 格）：
1. 排除目標梯次，以 80/20 切分 + 5 折 GridSearchCV 找最佳 alpha（46 項特徵）
2. 以全部其他梯次（有第三年 WS、生涯 > 1 季）訓練最終 Lasso（48 項特徵，含 DraftRank、Is_Undrafted）
3. 預測目標梯次的首輪新秀（DraftRank < 31）

用法：
    python scripts/predict_cohort.py --check 2023       # 重算 2023 梯次並與 NBA_Predicted_WS.csv 比對
    python scripts/predict_cohort.py 2024 2025 --data data/NBA_Normalized_Final_2025.csv
"""
import argparse
import os

import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Lasso
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")

CV_FEATURES = [
    "2P%", "2PA", "3P", "3P%", "3PA", "3PAr", "AST", "AST%", "BLK", "BLK%", "BPM", "DBPM",
    "DRB", "DRB%", "DWS", "FG", "FG%", "FGA", "FT", "FT%", "FTA", "FTr",
    "OBPM", "ORB", "ORB%", "OWS", "PER", "PF", "PTS", "Pos_C", "Pos_PF", "Pos_PG",
    "Pos_SF", "Pos_SG", "STL", "STL%", "TOV", "TOV%", "TRB", "TRB%", "TS%", "USG%",
    "VORP", "WS", "WS/48", "eFG%",
]
FINAL_FEATURES = [
    "2P%", "2PA", "3P", "3P%", "3PA", "3PAr", "AST", "AST%", "BLK", "BLK%",
    "BPM", "DBPM", "DRB", "DRB%", "DWS", "DraftRank", "FG", "FG%", "FGA",
    "FT", "FT%", "FTA", "FTr", "OBPM", "ORB", "ORB%", "OWS", "PER", "PF",
    "PTS", "Pos_C", "Pos_PF", "Pos_PG", "Pos_SF", "Pos_SG", "STL", "STL%",
    "TOV", "TOV%", "TRB", "TRB%", "TS%", "USG%", "VORP", "WS", "WS/48",
    "eFG%", "Is_Undrafted",
]
TARGET = "Year3_WS"
TEAM_COUNT, TOTAL_GAMES = 30, 1230


def load(path):
    df = pd.read_csv(path)
    for c in ["Is_Undrafted", "Pos_PG", "Pos_C", "Pos_SG", "Pos_SF", "Pos_PF"]:
        df[c] = (df[c].astype(str).str.strip().str.upper()
                 .map({"TRUE": 1, "FALSE": 0, "1": 1, "0": 0, "1.0": 1, "0.0": 0}))
    return df


def best_alpha(df, target_year):
    g = df[(df["season"] > 1) & (df["year_start"] > 1999) & (df["year_start"] != target_year)].copy()
    g = g.dropna(subset=[TARGET])
    X = g[CV_FEATURES].apply(pd.to_numeric, errors="coerce")
    y = pd.to_numeric(g[TARGET], errors="coerce")
    X_train, _, y_train, _ = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler()),
                     ("lasso", Lasso(max_iter=50000, random_state=42, tol=1e-4))])
    gs = GridSearchCV(pipe, {"lasso__alpha": np.logspace(-4, 1, 40)}, cv=min(5, len(X_train)), scoring="r2", n_jobs=1)
    gs.fit(X_train, y_train)
    return gs.best_params_["lasso__alpha"]


def predict(df, target_year):
    alpha = best_alpha(df, target_year)
    train = df[(df["year_start"] != target_year) & (df["season"] > 1) & df[TARGET].notna()].copy()
    pred = df[(df["year_start"] == target_year) & (df["season"] > 1) & (df["DraftRank"] < 31)].copy()
    Xtr = train[FINAL_FEATURES].apply(pd.to_numeric, errors="coerce")
    ytr = pd.to_numeric(train[TARGET], errors="coerce")
    model = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler()),
                      ("Lasso", Lasso(alpha=alpha))])
    model.fit(Xtr, ytr)
    pred["Pred_WS"] = model.predict(pred[FINAL_FEATURES].apply(pd.to_numeric, errors="coerce"))

    ref = df[df["year_start"] == target_year].iloc[0]
    cap, bri = ref["Salary_Cap_At_Start"], ref["BRI_Factor"]
    pred["Pred_Salary_Share_Percent"] = pred["Pred_WS"] * (cap * TEAM_COUNT * bri / TOTAL_GAMES) / cap * 100
    pred["Est_Cost_Percent"] = pred["DraftRank"].map(lambda r: 8.0 - (r - 1) * (6.5 / 29) if 1 <= r <= 30 else 1.1)
    pred["Net_Surplus_Percent"] = pred["Pred_Salary_Share_Percent"] - pred["Est_Cost_Percent"]
    print(f"[{target_year}] alpha={alpha:.6f} train={len(train)} predicted={len(pred)}")
    return pred


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("years", nargs="*", type=int)
    ap.add_argument("--check", type=int)
    ap.add_argument("--data", default=os.path.join(DATA, "NBA_Normalized_Final.csv"))
    ap.add_argument("--out")
    a = ap.parse_args()
    df = load(a.data)

    if a.check:
        p = predict(df, a.check)
        ref = pd.read_csv(os.path.join(DATA, "NBA_Predicted_WS.csv"))
        ref = ref[ref["year_start"] == a.check][["Player", "Pred_WS"]]
        m = p[["Player", "Pred_WS"]].merge(ref, on="Player", suffixes=("_new", "_research"))
        d = (m["Pred_WS_new"] - m["Pred_WS_research"]).abs()
        print(f"matched {len(m)}/{len(ref)} players; max |diff| = {d.max():.6f}, mean = {d.mean():.6f}")
        print(m.assign(diff=d).sort_values("diff", ascending=False).head(5).to_string(index=False))

    out = [predict(df, y) for y in a.years]
    if out and a.out:
        pd.concat(out).to_csv(a.out, index=False)
        print("wrote", a.out)


if __name__ == "__main__":
    main()
