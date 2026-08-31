"""
核心商業邏輯：模型預測、財務公式、五層瀑布流決策判定。
邏輯全部搬自 Lasso.ipynb，抽出成可重用函式供 Streamlit app 呼叫。
"""
import json
import os

import joblib
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..")
MODEL_PATH = os.path.join(BASE_DIR, "models", "lasso_pipeline.pkl")
META_PATH = os.path.join(BASE_DIR, "models", "model_meta.json")
MASTER_FEATURES_PATH = os.path.join(DATA_DIR, "NBA_Player_Final_Master_Features.csv")
PREDICTED_WS_PATH = os.path.join(DATA_DIR, "NBA_Predicted_WS.csv")

TEAM_COUNT = 30
TOTAL_GAMES = 1230
PENALTY_WEIGHT = 0.8  # 傷病風險折價權重（百分點），來自歷史 Grid Search 回測
RMSE_MULTIPLIER = 1.25  # 統計容錯緩衝倍數（買權時間價值）
STAR_RESCUE_MULTIPLIER = 1.5  # 商業聲量救場的容錯倍數
STAR_POWER_PERCENTILE = 0.70  # 同梯次 PR70 及格線

_model = None
_meta = None
_master_features = None
_predicted_ws = None


def _load_model():
    global _model, _meta
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        with open(META_PATH, "r", encoding="utf-8") as f:
            _meta = json.load(f)
    return _model, _meta


def get_model_meta() -> dict:
    _, meta = _load_model()
    return meta


def get_feature_cols() -> list:
    return get_model_meta()["feature_cols"]


def _load_master_features() -> pd.DataFrame:
    global _master_features
    if _master_features is None:
        df = pd.read_csv(MASTER_FEATURES_PATH)
        df["Player"] = df["Player"].astype(str).str.strip()
        _master_features = df
    return _master_features


def _load_predicted_ws() -> pd.DataFrame:
    global _predicted_ws
    if _predicted_ws is None:
        _predicted_ws = pd.read_csv(PREDICTED_WS_PATH)
    return _predicted_ws


def list_cohort_years() -> list:
    """回傳所有已有歷史預測資料的梯次年份，供「查詢歷史球員」下拉選單使用。"""
    return sorted(_load_predicted_ws()["year_start"].dropna().unique().tolist())


def list_players_in_cohort(year: int) -> list:
    df = _load_predicted_ws()
    return sorted(df[df["year_start"] == year]["Player"].dropna().unique().tolist())


def get_historical_player_row(year: int, player: str) -> dict:
    """歷史球員：直接回傳已算好的預測值與財務指標，不重新跑模型。"""
    df = _load_predicted_ws()
    row = df[(df["year_start"] == year) & (df["Player"] == player)]
    if row.empty:
        return None
    row = row.iloc[0].to_dict()
    if row.get("Est_Cost_Percent"):
        row["Pred_ROI"] = row["Pred_Salary_Share_Percent"] / row["Est_Cost_Percent"]
    return row


def predict_ws(player_stats: dict) -> float:
    """手動輸入球員：組成 DataFrame 對齊訓練欄位，呼叫已存檔的 Lasso pipeline 預測第三年 WS。"""
    model, meta = _load_model()
    feature_cols = meta["feature_cols"]
    row = {col: player_stats.get(col, None) for col in feature_cols}
    X = pd.DataFrame([row], columns=feature_cols)
    X = X.apply(pd.to_numeric, errors="coerce")
    pred = model.predict(X)[0]
    return float(pred)


def get_cost_percent(draft_rank: float) -> float:
    """選秀順位換算的預估簽約成本佔薪資帽百分比（搬自 Lasso.ipynb）。"""
    if draft_rank is None:
        return 1.1
    if 1 <= draft_rank <= 30:
        return 8.0 - (draft_rank - 1) * (6.5 / 29)
    return 1.1


def compute_financial_metrics(
    pred_ws: float,
    draft_rank: float,
    salary_cap: float,
    bri_factor: float,
) -> dict:
    marginal_value_per_ws = (salary_cap * TEAM_COUNT * bri_factor) / TOTAL_GAMES
    pred_dollar_value_m = pred_ws * marginal_value_per_ws
    pred_salary_share_percent = (pred_dollar_value_m / salary_cap) * 100

    est_cost_percent = get_cost_percent(draft_rank)
    pred_roi = pred_salary_share_percent / est_cost_percent if est_cost_percent else None
    net_surplus_percent = pred_salary_share_percent - est_cost_percent

    return {
        "Pred_WS": pred_ws,
        "Pred_Dollar_Value_M": pred_dollar_value_m,
        "Pred_Salary_Share_Percent": pred_salary_share_percent,
        "Est_Cost_Percent": est_cost_percent,
        "Pred_ROI": pred_roi,
        "Net_Surplus_Percent": net_surplus_percent,
    }


def lookup_sentiment(player_name: str) -> dict:
    """查歷史輿情特徵總表；找不到則回傳中性預設值並標記 has_precomputed_sentiment=False。"""
    df = _load_master_features()
    matches = df[df["Player"].str.lower() == str(player_name).strip().lower()]
    if matches.empty:
        return {
            "Worst_Injury_History": 0,
            "Star_Power_Index": 0.0,
            "has_precomputed_sentiment": False,
        }
    row = matches.iloc[0]
    star_power = row.get("Star_Power_Index")
    return {
        "Worst_Injury_History": int(row.get("Worst_Injury_History", 0) or 0),
        "Star_Power_Index": float(star_power) if pd.notna(star_power) else 0.0,
        "has_precomputed_sentiment": pd.notna(star_power),
    }


def get_cohort_star_power_floor(draft_year: int) -> float:
    """該梯次 Star_Power_Index 的 PR70 及格線（供商業聲量救場關卡使用）。"""
    df = _load_master_features()
    cohort = df[df["DraftYear"] == draft_year]["Star_Power_Index"].dropna()
    if cohort.empty:
        return 0.0
    return float(cohort.quantile(STAR_POWER_PERCENTILE))


def apply_waterfall(
    pred_ws: float,
    pred_salary_share_percent: float,
    est_cost_percent: float,
    dynamic_truth_ws: float,
    worst_injury_history: int,
    star_power_index: float,
    star_power_floor: float,
    rmse_test: float,
) -> dict:
    """五層瀑布流決策判定，回傳 {color, reason}。"""
    risk_penalty_percent = worst_injury_history * PENALTY_WEIGHT
    adjusted_pred_salary = pred_salary_share_percent - risk_penalty_percent
    adjusted_net_surplus = adjusted_pred_salary - est_cost_percent
    rmse_buffer = rmse_test * RMSE_MULTIPLIER

    result = {
        "color": "red",
        "reason": "🔴 絕對止損（未達標準）",
        "Risk_Penalty_Percent": risk_penalty_percent,
        "Adjusted_Pred_Salary": adjusted_pred_salary,
        "Adjusted_Net_Surplus": adjusted_net_surplus,
    }

    if adjusted_net_surplus > 0:
        result["color"] = "blue"
        result["reason"] = "🔵 絕對獲利（實力超越成本）"
        return result

    if adjusted_net_surplus >= -rmse_buffer:
        result["color"] = "green"
        result["reason"] = "🟢 統計容錯（財務微虧但在誤差區間）"
        return result

    if pred_ws >= dynamic_truth_ws:
        result["color"] = "green"
        result["reason"] = "🟢 機會成本救贖（產能大於自由市場替代品）"
        return result

    if star_power_index >= star_power_floor and adjusted_net_surplus >= -(rmse_buffer * STAR_RESCUE_MULTIPLIER):
        result["color"] = "green"
        result["reason"] = f"🟢 商業聲量救場（超越同梯 70% 基準線 {star_power_floor:.3f}）"
        return result

    return result


def evaluate_historical_player(year: int, player: str) -> dict:
    """歷史球員：用已算好的 Pred_WS/財務指標，補上輿情查表與瀑布流判定（歷史表本身沒存決策燈號）。"""
    meta = get_model_meta()
    row = get_historical_player_row(year, player)
    if row is None:
        return None

    sentiment = lookup_sentiment(player)
    star_power_floor = get_cohort_star_power_floor(year)

    decision = apply_waterfall(
        pred_ws=row["Pred_WS"],
        pred_salary_share_percent=row["Pred_Salary_Share_Percent"],
        est_cost_percent=row["Est_Cost_Percent"],
        dynamic_truth_ws=row["Dynamic_Truth_WS"],
        worst_injury_history=sentiment["Worst_Injury_History"],
        star_power_index=sentiment["Star_Power_Index"],
        star_power_floor=star_power_floor,
        rmse_test=meta["test_rmse"],
    )

    return {
        **row,
        **sentiment,
        **decision,
        "Star_Power_Floor": star_power_floor,
    }


def evaluate_manual_player(player_stats: dict, draft_rank: float, draft_year: int) -> dict:
    """手動輸入新球員的完整流程：預測 → 財務指標 → 查輿情 → 瀑布流判定。"""
    meta = get_model_meta()

    df_norm = pd.read_csv(os.path.join(DATA_DIR, "NBA_Normalized_Final.csv"))
    ref_year = df_norm[df_norm["year_start"] == draft_year]
    if not ref_year.empty:
        salary_cap = float(ref_year.iloc[0]["Salary_Cap_At_Start"])
        bri_factor = float(ref_year.iloc[0]["BRI_Factor"])
        dynamic_truth_ws = float(ref_year.iloc[0]["Dynamic_Truth_WS"]) if pd.notna(ref_year.iloc[0].get("Dynamic_Truth_WS")) else 2.5
    else:
        salary_cap, bri_factor, dynamic_truth_ws = 136.0, 0.5, 2.5

    pred_ws = predict_ws(player_stats)
    metrics = compute_financial_metrics(pred_ws, draft_rank, salary_cap, bri_factor)

    sentiment = lookup_sentiment(player_stats.get("Player", ""))
    star_power_floor = get_cohort_star_power_floor(draft_year)

    decision = apply_waterfall(
        pred_ws=pred_ws,
        pred_salary_share_percent=metrics["Pred_Salary_Share_Percent"],
        est_cost_percent=metrics["Est_Cost_Percent"],
        dynamic_truth_ws=dynamic_truth_ws,
        worst_injury_history=sentiment["Worst_Injury_History"],
        star_power_index=sentiment["Star_Power_Index"],
        star_power_floor=star_power_floor,
        rmse_test=meta["test_rmse"],
    )

    return {
        **metrics,
        **sentiment,
        **decision,
        "Dynamic_Truth_WS": dynamic_truth_ws,
        "Star_Power_Floor": star_power_floor,
    }
