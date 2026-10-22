"""
核心商業邏輯：模型預測、財務公式、五層瀑布流決策判定、回測與敏感度分析。
決策規則與 scripts/research_no_injury.py（研究主分析）一致：
- 不另扣傷病風險
- 商業聲量門檻 = 同梯次首輪新秀 Star_Power_Index（缺值補 0）之第 70 百分位數
"""
import json
import os

import joblib
import numpy as np
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
MODEL_PATH = os.path.join(BASE_DIR, "models", "lasso_pipeline.pkl")
META_PATH = os.path.join(BASE_DIR, "models", "model_meta.json")
MASTER_FEATURES_PATH = os.path.join(DATA_DIR, "NBA_Player_Final_Master_Features.csv")
PREDICTED_WS_PATH = os.path.join(DATA_DIR, "NBA_Predicted_WS.csv")
NORMALIZED_PATH = os.path.join(DATA_DIR, "NBA_Normalized_Final.csv")
VALIDATION_PATH = os.path.join(DATA_DIR, "Declined_Players_Validation.csv")

STUDY_YEARS = (2013, 2023)  # 研究樣本：2013–2023 梯次首輪新秀，共 329 人
TEAM_COUNT = 30
TOTAL_GAMES = 1230
RMSE_MULTIPLIER = 1.25  # 統計容錯緩衝倍數（買權時間價值）
STAR_RESCUE_MULTIPLIER = 1.5  # 商業聲量救場的容錯倍數
STAR_POWER_PERCENTILE = 0.70  # 同梯次 PR70 及格線
VET_MIN_COST_PERCENT = 1.8  # 底薪老將約佔薪資帽 1.8%，機會成本基準的下限

STAGES = ["profit", "buffer", "opportunity", "star", "reject"]
STAGE_COLOR = {"profit": "blue", "buffer": "green", "opportunity": "green", "star": "green", "reject": "red"}

_cache = {}


def _load_model():
    if "model" not in _cache:
        _cache["model"] = joblib.load(MODEL_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            _cache["meta"] = json.load(f)
    return _cache["model"], _cache["meta"]


def get_model_meta() -> dict:
    return _load_model()[1]


def get_feature_cols() -> list:
    return get_model_meta()["feature_cols"]


def load_study_sample() -> pd.DataFrame:
    """329 名首輪新秀之預測值、財務指標、商業聲量與球團處置（未套用決策）。"""
    if "study" not in _cache:
        pred = pd.read_csv(PREDICTED_WS_PATH)
        pred = pred[pred["year_start"].between(*STUDY_YEARS)].copy()
        pred["Player"] = pred["Player"].astype(str).str.strip()

        master = pd.read_csv(MASTER_FEATURES_PATH)
        master["Player"] = master["Player"].astype(str).str.strip()
        master = master[master["DraftYear"].between(*STUDY_YEARS)]
        df = pred.merge(
            master[["Player", "DraftYear", "Star_Power_Index"]],
            left_on=["Player", "year_start"], right_on=["Player", "DraftYear"],
            how="left", validate="one_to_one",
        ).drop(columns="DraftYear")
        df["has_sentiment"] = df["Star_Power_Index"].notna()

        validation = pd.read_csv(VALIDATION_PATH)
        df = df.merge(
            validation[["Player", "Draft_Year", "Outcome_Label"]].rename(columns={"Draft_Year": "year_start"}),
            on=["Player", "year_start"], how="left", validate="one_to_one",
        )
        _cache["study"] = df
    return _cache["study"].copy()


def list_cohort_years() -> list:
    return list(range(STUDY_YEARS[0], STUDY_YEARS[1] + 1))


def list_players_in_cohort(year: int) -> list:
    df = load_study_sample()
    return df[df["year_start"] == year].sort_values("DraftRank")["Player"].tolist()


def get_cost_percent(draft_rank: float) -> float:
    """選秀順位換算的預估簽約成本佔薪資帽百分比（搬自 Lasso.ipynb）。"""
    if draft_rank is None:
        return 1.1
    if 1 <= draft_rank <= 30:
        return 8.0 - (draft_rank - 1) * (6.5 / 29)
    return 1.1


def compute_financial_metrics(pred_ws: float, draft_rank: float, salary_cap: float, bri_factor: float) -> dict:
    marginal_value_per_ws = (salary_cap * TEAM_COUNT * bri_factor) / TOTAL_GAMES
    pred_dollar_value_m = pred_ws * marginal_value_per_ws
    pred_salary_share_percent = (pred_dollar_value_m / salary_cap) * 100
    est_cost_percent = get_cost_percent(draft_rank)
    return {
        "Pred_WS": pred_ws,
        "Pred_Dollar_Value_M": pred_dollar_value_m,
        "Pred_Salary_Share_Percent": pred_salary_share_percent,
        "Est_Cost_Percent": est_cost_percent,
        "Net_Surplus_Percent": pred_salary_share_percent - est_cost_percent,
    }


def dynamic_truth_ws(est_cost_percent: float, bri_factor: float) -> float:
    """機會成本基準（同 scrape_player_news.ipynb）：合約成本換算成 WS，下限為底薪老將的產能。"""
    ws_value_percent = TEAM_COUNT * bri_factor / TOTAL_GAMES * 100
    return round(max(est_cost_percent, VET_MIN_COST_PERCENT) / ws_value_percent, 2)


def decide_stage(ans, pred_ws, dynamic_truth_ws, star_power_index, star_power_floor, rmse_buffer,
                 star_multiplier=STAR_RESCUE_MULTIPLIER) -> str:
    """五層瀑布流：回傳第一個通過的關卡；皆未通過則為止損。"""
    if ans > 0:
        return "profit"
    if ans >= -rmse_buffer:
        return "buffer"
    if pred_ws >= dynamic_truth_ws:
        return "opportunity"
    if star_power_index >= star_power_floor and ans >= -rmse_buffer * star_multiplier:
        return "star"
    return "reject"


def waterfall_steps(row: dict, rmse_buffer: float, star_multiplier=STAR_RESCUE_MULTIPLIER) -> list:
    """逐層列出條件、實際值、門檻與是否通過，供網站視覺化。"""
    ans = row["Adjusted_Net_Surplus"]
    spi = row["Star_Power_Index_Filled"]
    floor = row["Star_Power_Floor"]
    star_ans_floor = -rmse_buffer * star_multiplier
    steps = [
        dict(stage="profit", value=ans, threshold=0.0, passed=ans > 0),
        dict(stage="buffer", value=ans, threshold=-rmse_buffer, passed=ans >= -rmse_buffer),
        dict(stage="opportunity", value=row["Pred_WS"], threshold=row["Dynamic_Truth_WS"],
             passed=row["Pred_WS"] >= row["Dynamic_Truth_WS"]),
        dict(stage="star", value=spi, threshold=floor, passed=spi >= floor and ans >= star_ans_floor,
             extra=dict(ans=ans, ans_floor=star_ans_floor, spi_ok=spi >= floor, ans_ok=ans >= star_ans_floor)),
    ]
    reached = True
    for step in steps:
        step["reached"] = reached
        if reached and step["passed"]:
            reached = False
    steps.append(dict(stage="reject", reached=reached, passed=reached))
    return steps


def classify_frame(df: pd.DataFrame, rmse_multiplier=RMSE_MULTIPLIER, star_percentile=STAR_POWER_PERCENTILE,
                   star_multiplier=STAR_RESCUE_MULTIPLIER) -> pd.DataFrame:
    """對樣本套用瀑布流；聲量門檻依同梯次樣本計算。可調參數供敏感度分析使用。"""
    x = df.copy()
    rmse_buffer = get_model_meta()["test_rmse"] * rmse_multiplier
    x["Star_Power_Index_Filled"] = x["Star_Power_Index"].fillna(0)
    x["Star_Power_Floor"] = x.groupby("year_start")["Star_Power_Index_Filled"].transform(
        lambda s: s.quantile(star_percentile))
    x["Adjusted_Net_Surplus"] = x["Pred_Salary_Share_Percent"] - x["Est_Cost_Percent"]
    x["stage"] = [
        decide_stage(r.Adjusted_Net_Surplus, r.Pred_WS, r.Dynamic_Truth_WS, r.Star_Power_Index_Filled,
                     r.Star_Power_Floor, rmse_buffer, star_multiplier)
        for r in x.itertuples()
    ]
    x["color"] = x["stage"].map(STAGE_COLOR)
    x["RMSE_Buffer"] = rmse_buffer
    # 事後驗證：第三年實際產能是否達到動態機會成本基準
    x["has_year3"] = x["Year3_WS"].notna()
    x["actual_met_bar"] = np.where(x["has_year3"], x["Year3_WS"] >= x["Dynamic_Truth_WS"], np.nan)
    keep = x["color"] != "red"
    x["call_correct"] = np.where(x["has_year3"], keep == (x["Year3_WS"] >= x["Dynamic_Truth_WS"]), np.nan)
    # 以實際第三年 WS 換算之淨盈餘（研究主分析之財務效益定義）
    x["Actual_Net_Surplus"] = x["Year3_WS"] * (TEAM_COUNT * x["BRI_Factor"] / TOTAL_GAMES * 100) - x["Est_Cost_Percent"]
    return x


def backtest_summary(x: pd.DataFrame) -> dict:
    """止損名單之事後驗證與財務效益（定義同 research_no_injury.py）。"""
    red = x[x["color"] == "red"]
    red_labeled = red[red["has_year3"]]
    actual = red_labeled["Actual_Net_Surplus"]
    avoided = float((-actual.clip(upper=0)).sum())
    sacrificed = float(actual.clip(lower=0).sum())
    labeled = x[x["has_year3"]]
    keep = labeled["color"] != "red"
    good = labeled["Year3_WS"] >= labeled["Dynamic_Truth_WS"]
    return {
        "n": len(x),
        "blue": int((x["color"] == "blue").sum()),
        "green": int((x["color"] == "green").sum()),
        "red": len(red),
        "red_labeled": len(red_labeled),
        "red_below": int((red_labeled["Year3_WS"] < red_labeled["Dynamic_Truth_WS"]).sum()),
        "red_no_year3": int((~red["has_year3"]).sum()),
        "hit_rate": float((red_labeled["Year3_WS"] < red_labeled["Dynamic_Truth_WS"]).mean()) if len(red_labeled) else float("nan"),
        "avoided": avoided,
        "sacrificed": sacrificed,
        "net": avoided - sacrificed,
        "labeled": len(labeled),
        "TP": int((keep & good).sum()), "FP": int((keep & ~good).sum()),
        "TN": int((~keep & ~good).sum()), "FN": int((~keep & good).sum()),
        "accuracy": float((keep == good).mean()),
        "red_mae": float((red_labeled["Pred_WS"] - red_labeled["Year3_WS"]).abs().mean()) if len(red_labeled) else float("nan"),
    }


def evaluate_historical_player(year: int, player: str, decided: pd.DataFrame = None) -> dict:
    x = decided if decided is not None else classify_frame(load_study_sample())
    row = x[(x["year_start"] == year) & (x["Player"] == player)]
    if row.empty:
        return None
    return row.iloc[0].to_dict()


def predict_ws(player_stats: dict) -> float:
    """手動輸入球員：對齊訓練欄位，呼叫已存檔的 Lasso pipeline 預測第三年 WS。"""
    model, meta = _load_model()
    feature_cols = meta["feature_cols"]
    X = pd.DataFrame([{col: player_stats.get(col, None) for col in feature_cols}], columns=feature_cols)
    X = X.apply(pd.to_numeric, errors="coerce")
    return float(model.predict(X)[0])


def lookup_star_power(player_name: str) -> float:
    """查歷史商業聲量指數；找不到回傳 None。"""
    master = pd.read_csv(MASTER_FEATURES_PATH)
    matches = master[master["Player"].astype(str).str.strip().str.lower() == str(player_name).strip().lower()]
    if matches.empty or matches["Star_Power_Index"].isna().all():
        return None
    return float(matches["Star_Power_Index"].dropna().iloc[-1])


def evaluate_manual_player(player_stats: dict, draft_rank: float, draft_year: int) -> dict:
    """手動輸入新球員的完整流程：預測 → 財務指標 → 查聲量 → 瀑布流判定。"""
    meta = get_model_meta()
    df_norm = pd.read_csv(NORMALIZED_PATH)
    ref_year = df_norm[df_norm["year_start"] == draft_year]
    if not ref_year.empty:
        salary_cap = float(ref_year.iloc[0]["Salary_Cap_At_Start"])
        bri_factor = float(ref_year.iloc[0]["BRI_Factor"])
    else:
        salary_cap, bri_factor = 136.0, 0.5

    pred_ws = predict_ws(player_stats)
    metrics = compute_financial_metrics(pred_ws, draft_rank, salary_cap, bri_factor)
    # 機會成本基準依選秀順位而定（不能直接取梯次第一列）
    replacement_ws = dynamic_truth_ws(metrics["Est_Cost_Percent"], bri_factor)

    spi = lookup_star_power(player_stats.get("Player", ""))
    cohort = classify_frame(load_study_sample())
    cohort = cohort[cohort["year_start"] == draft_year]
    star_power_floor = float(cohort["Star_Power_Floor"].iloc[0]) if not cohort.empty else 0.0
    rmse_buffer = meta["test_rmse"] * RMSE_MULTIPLIER

    row = {
        **metrics,
        "Player": player_stats.get("Player", ""),
        "year_start": draft_year,
        "DraftRank": draft_rank,
        "Dynamic_Truth_WS": replacement_ws,
        "Star_Power_Index": spi,
        "Star_Power_Index_Filled": spi if spi is not None else 0.0,
        "has_sentiment": spi is not None,
        "Star_Power_Floor": star_power_floor,
        "Adjusted_Net_Surplus": metrics["Net_Surplus_Percent"],
        "RMSE_Buffer": rmse_buffer,
        "Year3_WS": np.nan,
        "has_year3": False,
    }
    row["stage"] = decide_stage(row["Adjusted_Net_Surplus"], pred_ws, replacement_ws,
                                row["Star_Power_Index_Filled"], star_power_floor, rmse_buffer)
    row["color"] = STAGE_COLOR[row["stage"]]
    return row
