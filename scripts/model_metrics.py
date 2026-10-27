"""
六種模型在同一個 80/20 測試集上的完整預測指標（對應研究原本模型比較表的欄位）：
Best CV R²、Test R²、MSE、RMSE、MAE、MedianAE、CV RMSE（平均 ± 標準差）、Train R²、Train–Test Gap、Spearman。

條件與 scripts/compare_models.py 相同（同一份資料、48 項特徵、相同超參數搜尋範圍與 random_state）。
用法：python scripts/model_metrics.py
輸出：data/model_comparison/holdout_metrics.json、holdout_metrics.csv
"""
import json
import os
import time

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.base import clone
from sklearn.metrics import mean_absolute_error, mean_squared_error, median_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split

from compare_models import CV, DATA, MODELS, OUT, N_JOBS, xy
from predict_cohort import TARGET, load


def main():
    df = load(os.path.join(DATA, "NBA_Normalized_Final_2025.csv"))
    pool = df[(df["season"] > 1) & df[TARGET].notna() & (df["year_start"] <= 2023) & (df["year_start"] > 1999)]
    X, y = xy(pool)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"train {len(Xtr)} / test {len(Xte)}", flush=True)

    out = {}
    for name, make in MODELS.items():
        t0 = time.time()
        search = make().fit(Xtr, ytr)
        best = search.best_estimator_
        p_tr = np.asarray(best.predict(Xtr)).ravel()
        p_te = np.asarray(best.predict(Xte)).ravel()
        cv_mse = -cross_val_score(clone(best), Xtr, ytr, cv=CV, scoring="neg_mean_squared_error", n_jobs=N_JOBS)
        cv_rmse = np.sqrt(cv_mse)
        train_r2, test_r2 = r2_score(ytr, p_tr), r2_score(yte, p_te)
        out[name] = {
            "cv_r2": float(search.best_score_),
            "train_r2": float(train_r2),
            "test_r2": float(test_r2),
            "gap": float(train_r2 - test_r2),
            "mse": float(mean_squared_error(yte, p_te)),
            "rmse": float(np.sqrt(mean_squared_error(yte, p_te))),
            "mae": float(mean_absolute_error(yte, p_te)),
            "median_ae": float(median_absolute_error(yte, p_te)),
            "cv_rmse_mean": float(cv_rmse.mean()),
            "cv_rmse_std": float(cv_rmse.std()),
            "spearman": float(spearmanr(yte, p_te).correlation),
            "params": {k: (v if isinstance(v, (int, float, str)) else str(v)) for k, v in search.best_params_.items()},
        }
        print(f"{name}: done ({time.time() - t0:.0f}s)", flush=True)

    json.dump(out, open(os.path.join(OUT, "holdout_metrics.json"), "w", encoding="utf-8"), indent=1)
    table = pd.DataFrame(out).T.drop(columns="params")
    table.to_csv(os.path.join(OUT, "holdout_metrics.csv"))
    print(table.round(4).to_string())


if __name__ == "__main__":
    main()
