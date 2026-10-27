"""
統一條件下比較六種模型的「預測 → 五層決策」結果（研究原本的模型比較表各模型資料版本與切分不一致）。

統一條件：
- 資料：data/NBA_Normalized_Final_2025.csv（研究資料 + 2024/2025 梯次）；訓練只用 2023 梯次以前、生涯 > 1 季、有第三年 WS 者
- 特徵：研究正式模型的 48 項（46 項技術特徵 + DraftRank + Is_Undrafted）
- 超參數搜尋範圍：取自各模型筆記本（notebooks/models/*.ipynb）
- 測試集：所有模型同一個 80/20 切分（random_state=42，year_start > 1999），得到可公平比較的 R² 與 RMSE
- 回測：2013–2023 每個梯次皆排除該梯次重新訓練後預測（同研究 Lasso 流程）；2024 梯次為時間外驗證
- 決策：五層瀑布流與研究相同，統計容錯 = 1.25 × 各模型自己的測試集 RMSE；聲量門檻同梯次 PR70

用法：python scripts/compare_models.py
輸出：data/model_comparison/predictions.csv、data/model_comparison/summary.json
"""
import json
import os
import time
import warnings

import numpy as np
import pandas as pd
from sklearn.cross_decomposition import PLSRegression
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNet, Lasso, Ridge
from sklearn.model_selection import GridSearchCV, KFold, RandomizedSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from predict_cohort import FINAL_FEATURES, TARGET, load

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA, "model_comparison")
YEARS = list(range(2013, 2025))  # 2013–2023 回測 + 2024 時間外驗證
TEAM_COUNT, TOTAL_GAMES = 30, 1230
CV = KFold(n_splits=5, shuffle=True, random_state=42)
N_JOBS = 4  # 限制平行數以降低記憶體用量


def linear(step_name, est):
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler()), (step_name, est)])


def tree(est):
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", est)])


MODELS = {
    "Lasso": lambda: GridSearchCV(linear("m", Lasso(max_iter=50000, random_state=42, tol=1e-4)),
                                  {"m__alpha": np.logspace(-4, 1, 40)}, cv=CV, scoring="r2", n_jobs=N_JOBS),
    "Ridge": lambda: GridSearchCV(linear("m", Ridge()), {"m__alpha": np.logspace(-4, 4, 60)},
                                  cv=CV, scoring="r2", n_jobs=N_JOBS),
    "Elastic Net": lambda: GridSearchCV(linear("m", ElasticNet(max_iter=50000, random_state=42)),
                                        {"m__alpha": np.logspace(-4, 1, 30), "m__l1_ratio": [0.1, 0.3, 0.5, 0.7, 0.9]},
                                        cv=CV, scoring="r2", n_jobs=N_JOBS),
    "PLS": lambda: GridSearchCV(linear("m", PLSRegression()), {"m__n_components": list(range(1, 21))},
                                cv=CV, scoring="r2", n_jobs=N_JOBS),
    "Random Forest": lambda: RandomizedSearchCV(
        tree(RandomForestRegressor(random_state=42, n_jobs=1)),
        {"model__max_depth": [3, 4, 5, 6], "model__min_samples_leaf": [10, 15, 20, 30],
         "model__min_samples_split": [20, 30, 50], "model__max_features": ["sqrt", "log2", 0.3],
         "model__n_estimators": [300, 500]},
        n_iter=20, cv=CV, scoring="r2", n_jobs=N_JOBS, random_state=42),
    "Gradient Boosting": lambda: RandomizedSearchCV(
        tree(GradientBoostingRegressor(random_state=42)),
        {"model__n_estimators": [100, 200, 300, 500], "model__learning_rate": [0.01, 0.05, 0.1],
         "model__max_depth": [2, 3, 4], "model__min_samples_leaf": [1, 2, 4, 8], "model__subsample": [0.6, 0.8, 1.0]},
        n_iter=20, cv=CV, scoring="r2", n_jobs=N_JOBS, random_state=42),
}


def xy(d):
    return d[FINAL_FEATURES].apply(pd.to_numeric, errors="coerce"), pd.to_numeric(d[TARGET], errors="coerce")


def predict_flat(model, X):
    return np.asarray(model.predict(X)).ravel()


def decide(ans, pred, dtw, spi, floor, buffer):
    if ans > 0:
        return "profit"
    if ans >= -buffer:
        return "buffer"
    if pred >= dtw:
        return "opportunity"
    if spi >= floor and ans >= -buffer * 1.5:
        return "star"
    return "reject"


def main():
    os.makedirs(OUT, exist_ok=True)
    df = load(os.path.join(DATA, "NBA_Normalized_Final_2025.csv"))
    pool = df[(df["season"] > 1) & df[TARGET].notna() & (df["year_start"] <= 2023)]

    # 研究樣本與 2024 梯次的決策輸入（聲量指數、門檻、成本與基準）
    study = pd.read_csv(os.path.join(DATA, "NBA_Predicted_WS.csv"))
    study = study[study["year_start"].between(2013, 2023)]
    master = pd.read_csv(os.path.join(DATA, "NBA_Player_Final_Master_Features.csv"))
    master = master[master["DraftYear"].between(2013, 2023)][["Player", "DraftYear", "Star_Power_Index"]]
    study = study.merge(master, left_on=["Player", "year_start"], right_on=["Player", "DraftYear"], how="left").drop(columns="DraftYear")
    new = pd.read_csv(os.path.join(DATA, "new_cohorts_decisions.csv"))
    new = new[new["year_start"] == 2024]
    targets = pd.concat([study[["Player", "year_start", "DraftRank", "Year3_WS", "Est_Cost_Percent", "Dynamic_Truth_WS",
                                "BRI_Factor", "Star_Power_Index", "Pred_WS"]].rename(columns={"Pred_WS": "Research_Pred_WS"}),
                         new[["Player", "year_start", "DraftRank", "Year3_WS", "Est_Cost_Percent", "Dynamic_Truth_WS",
                              "BRI_Factor", "Star_Power_Index"]]], ignore_index=True)
    targets["SPI"] = targets["Star_Power_Index"].fillna(0)
    targets["floor"] = targets.groupby("year_start")["SPI"].transform(lambda s: s.quantile(0.70))
    feats = df.set_index(["Player", "year_start"])

    holdout, rows = {}, []
    base = pool[pool["year_start"] > 1999]
    Xa, ya = xy(base)
    Xtr, Xte, ytr, yte = train_test_split(Xa, ya, test_size=0.2, random_state=42)

    for name, make in MODELS.items():
        ckpt = os.path.join(OUT, f"pred_{name.replace(' ', '_')}.csv")
        hfile = ckpt.replace(".csv", "_holdout.json")
        if os.path.exists(ckpt) and os.path.exists(hfile):
            # 已完成的模型直接讀取存檔（中斷後重跑不必從頭開始）
            holdout[name] = json.load(open(hfile, encoding="utf-8"))
            rows.extend(pd.read_csv(ckpt).to_dict("records"))
            print(f"{name}: loaded checkpoint", flush=True)
            continue
        t0 = time.time()
        start = len(rows)
        # 1) 同一個 80/20 測試集
        m = make().fit(Xtr, ytr)
        p = predict_flat(m.best_estimator_, Xte)
        rmse = float(np.sqrt(np.mean((yte - p) ** 2)))
        holdout[name] = {"test_r2": float(1 - ((yte - p) ** 2).sum() / ((yte - yte.mean()) ** 2).sum()),
                         "test_rmse": rmse, "test_mae": float(np.mean(np.abs(yte - p))),
                         "cv_r2": float(m.best_score_), "params": {k: (v if isinstance(v, (int, float, str)) else str(v))
                                                                   for k, v in m.best_params_.items()}}
        # 2) 逐年重訓：排除目標梯次
        for y in YEARS:
            tr = pool[pool["year_start"] != y]
            tune = tr[tr["year_start"] > 1999]
            Xt, yt = xy(tune)
            Xt80, _, yt80, _ = train_test_split(Xt, yt, test_size=0.2, random_state=42)
            best = make().fit(Xt80, yt80).best_estimator_
            Xf, yf = xy(tr)
            best.fit(Xf, yf)
            tg = targets[targets["year_start"] == y]
            X = feats.loc[list(zip(tg["Player"], tg["year_start"])), FINAL_FEATURES].apply(pd.to_numeric, errors="coerce")
            pred = predict_flat(best, X)
            for (_, r), pw in zip(tg.iterrows(), pred):
                value = pw * (TEAM_COUNT * r["BRI_Factor"] / TOTAL_GAMES) * 100
                ans = value - r["Est_Cost_Percent"]
                rows.append({"model": name, "Player": r["Player"], "year_start": int(y), "DraftRank": int(r["DraftRank"]),
                             "Pred_WS": float(pw), "Year3_WS": r["Year3_WS"], "Dynamic_Truth_WS": r["Dynamic_Truth_WS"],
                             "Est_Cost_Percent": r["Est_Cost_Percent"], "BRI_Factor": r["BRI_Factor"], "ans": float(ans),
                             "stage": decide(ans, pw, r["Dynamic_Truth_WS"], r["SPI"], r["floor"], 1.25 * rmse)})
        pd.DataFrame(rows[start:]).to_csv(ckpt, index=False)
        json.dump(holdout[name], open(hfile, "w", encoding="utf-8"), indent=1)
        print(f"{name}: test R2 {holdout[name]['test_r2']:.3f} RMSE {rmse:.3f} ({time.time() - t0:.0f}s)", flush=True)

    pred = pd.DataFrame(rows)
    pred.to_csv(os.path.join(OUT, "predictions.csv"), index=False)
    json.dump({"holdout": holdout, "research_lasso_check": float(
        (pred[pred["model"] == "Lasso"].merge(targets[["Player", "year_start", "Research_Pred_WS"]].dropna(), on=["Player", "year_start"])
         .eval("abs(Pred_WS - Research_Pred_WS)").mean()))},
        open(os.path.join(OUT, "summary.json"), "w"), indent=1)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
