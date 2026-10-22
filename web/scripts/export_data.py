"""
把 Streamlit 版（webapp/）的資料、模型參數與介面文字匯出成 JSON，供 Vercel 靜態網站在瀏覽器端計算。

執行方式（在 web/ 資料夾）：
    python scripts/export_data.py
"""
import json
import math
import os
import sys

import joblib
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
WEBAPP = os.path.join(HERE, "..", "..", "webapp")
OUT = os.path.join(HERE, "..", "src", "data")
sys.path.insert(0, WEBAPP)

import decision_engine as de  # noqa: E402
from i18n import STRINGS  # noqa: E402


def clean(v):
    if isinstance(v, (np.generic,)):
        v = v.item()
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def dump(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print("wrote", name)


def main():
    os.makedirs(OUT, exist_ok=True)

    # 研究樣本：329 名首輪新秀（決策在瀏覽器端重算，這裡只放原始欄位）
    study = de.load_study_sample()
    cols = ["Player", "year_start", "DraftRank", "Pred_WS", "Year3_WS", "Pred_Salary_Share_Percent",
            "Est_Cost_Percent", "Dynamic_Truth_WS", "BRI_Factor", "Star_Power_Index", "Outcome_Label",
            "year_3", "year_4"]
    rows = [{c: clean(r[c]) for c in cols} for _, r in study[cols].iterrows()]
    dump("study.json", rows)

    # 驗證用：Python 版的決策結果，前端測試需完全一致
    decided = de.classify_frame(study)
    norm = pd.read_csv(de.NORMALIZED_PATH)
    manual_cases = []
    for name, year, pick in [("Test Rookie", 2023, 1), ("Test Player", 2018, 22), ("Late Pick", 2016, 30)]:
        src = norm[norm["year_start"] == year].iloc[3]
        stats = {c: clean(src[c]) for c in de.get_feature_cols()}
        r = de.evaluate_manual_player({**stats, "Player": name}, draft_rank=pick, draft_year=year)
        manual_cases.append({"name": name, "year": year, "pick": pick, "stats": stats,
                             "pred_ws": r["Pred_WS"], "ans": r["Adjusted_Net_Surplus"], "stage": r["stage"],
                             "floor": r["Star_Power_Floor"], "spi": r["Star_Power_Index"],
                             "dtw": r["Dynamic_Truth_WS"]})
    dump("expected.json", {
        "stages": {f"{r.year_start}|{r.Player}": r.stage for r in decided.itertuples()},
        "summary": {k: clean(v) for k, v in de.backtest_summary(decided).items()},
        "manual": manual_cases,
        "new_stages": {f"{int(r.year_start)}|{r.Player}": r.stage for r in
                       pd.read_csv(os.path.join(de.DATA_DIR, "new_cohorts_decisions.csv")).itertuples()},
    })

    # 模型：median 補值 → 標準化 → Lasso，皆為線性運算，可直接在瀏覽器計算
    model = joblib.load(de.MODEL_PATH)
    meta = de.get_model_meta()
    imp, sc, lasso = model.named_steps["imputer"], model.named_steps["scaler"], model.named_steps["lasso"]
    dump("model.json", {
        "features": meta["feature_cols"],
        "median": imp.statistics_.tolist(),
        "mean": sc.mean_.tolist(),
        "scale": sc.scale_.tolist(),
        "coef": lasso.coef_.tolist(),
        "intercept": float(lasso.intercept_),
        "test_r2": meta["test_r2"],
        "test_rmse": meta["test_rmse"],
        "test_mae": meta["test_mae"],
        "n_train": meta["n_train"],
        "n_test": meta["n_test"],
    })

    # 新梯次（2024 時間外驗證、2025 即時預測）：由 scripts/classify_new_cohorts.py 產生
    new = pd.read_csv(os.path.join(de.DATA_DIR, "new_cohorts_decisions.csv"))
    new_rows = []
    for _, r in new.iterrows():
        rec = {c: clean(r[c]) for c in ["Player", "year_start", "DraftRank", "Pred_WS", "Year3_WS",
                                        "Pred_Salary_Share_Percent", "Est_Cost_Percent", "Dynamic_Truth_WS",
                                        "BRI_Factor", "Star_Power_Index", "year_3", "year_4", "team_decision"]}
        rec["year_start"] = int(rec["year_start"])
        rec["DraftRank"] = int(rec["DraftRank"])
        rec["Outcome_Label"] = None
        rec["segment"] = "oot" if rec["year_start"] == 2024 else "live"
        new_rows.append(rec)
    dump("new_cohorts.json", new_rows)

    # 手動輸入新球員時所需的各梯次參考值（同 evaluate_manual_player；2024、2025 取自延伸資料）
    norm_ext = pd.read_csv(os.path.join(de.DATA_DIR, "NBA_Normalized_Final_2025.csv"))
    refs = {}
    for year in list(de.list_cohort_years()) + [2024, 2025]:
        ref = norm_ext[norm_ext["year_start"] == year]
        if ref.empty:
            continue
        r = ref.iloc[0]
        refs[str(year)] = {"salary_cap": float(r["Salary_Cap_At_Start"]), "bri_factor": float(r["BRI_Factor"])}
    dump("refs.json", refs)

    # 商業聲量查詢表（同 lookup_star_power：同名取最後一筆非缺值）
    master = pd.read_csv(de.MASTER_FEATURES_PATH)
    master = master[master["Star_Power_Index"].notna()]
    spi = {}
    for _, r in master.iterrows():
        spi[str(r["Player"]).strip().lower()] = float(r["Star_Power_Index"])
    # 新梯次的聲量指數（scripts/star_power.py）
    for _, r in pd.read_csv(os.path.join(de.DATA_DIR, "star_power_2024_2025.csv")).iterrows():
        spi[str(r["Player"]).strip().lower()] = float(r["Star_Power_Index"])
    dump("spi.json", spi)

    # 「填入範例」用：Anthony Bennett（2014 梯次狀元）前兩季數據
    ex = norm[(norm["Player"].astype(str).str.strip() == "Anthony Bennett") & (norm["year_start"] == 2014)].iloc[0]
    dump("example.json", {"name": "Anthony Bennett", "year": 2014, "pick": int(ex["DraftRank"]),
                          "stats": {c: clean(ex[c]) for c in de.get_feature_cols()}})

    # 介面文字：沿用 Streamlit 版的 STRINGS（Python format 語法由前端 formatter 處理）
    dump("strings.json", STRINGS)

    # 檢查：JSON 線性公式與原 pipeline 的預測一致
    X = norm[meta["feature_cols"]].apply(pd.to_numeric, errors="coerce").head(200)
    Xi = X.fillna(pd.Series(imp.statistics_, index=X.columns))
    manual = ((Xi - sc.mean_) / sc.scale_).values @ lasso.coef_ + lasso.intercept_
    assert np.allclose(manual, model.predict(X), atol=1e-9), "linear export mismatch"
    print("linear export matches pipeline on 200 rows")


if __name__ == "__main__":
    main()
