"""
呼叫 Claude API，根據球員的預測數據與決策結果，生成一份簡短的球探報告。
API key 從環境變數 ANTHROPIC_API_KEY 讀取（本機透過 .env；Streamlit Cloud 透過 Secrets），不寫死在程式碼中。
"""
import json
import math
import os

from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "claude-haiku-4-5"

SYSTEM_PROMPT = {
    "zh": (
        "你是一位 NBA 球探分析師。根據使用者提供的球員數據 JSON，"
        "用繁體中文寫一份 3-5 句話的球探報告。"
        "只能根據提供的數據做分析，不可捏造未提供的數據或事件。"
        "報告的最後一句話，要清楚呼應系統給出的決策建議（decision_stage）。"
    ),
    "en": (
        "You are an NBA scouting analyst. Based on the player data JSON provided, "
        "write a 3-5 sentence scouting report in English. "
        "Only use the data provided; never invent stats or events. "
        "The final sentence must clearly echo the system's decision (decision_stage)."
    ),
}

STAGE_NAMES = {
    "profit": "exercise option - clear surplus",
    "buffer": "keep - loss within model error",
    "opportunity": "keep - beats replacement level",
    "star": "keep - star-power rescue",
    "reject": "decline option - stop loss",
}

FIELDS = {
    "Player": "player",
    "year_start": "cohort",
    "DraftRank": "draft_pick",
    "Pred_WS": "predicted_year3_win_shares",
    "Pred_Salary_Share_Percent": "predicted_value_pct_of_cap",
    "Est_Cost_Percent": "contract_cost_pct_of_cap",
    "Adjusted_Net_Surplus": "net_surplus_pct_of_cap",
    "Dynamic_Truth_WS": "replacement_level_win_shares",
    "Star_Power_Index": "star_power_index",
    "Star_Power_Floor": "cohort_star_power_70th_percentile",
}


class ReportGenerationError(Exception):
    pass


def _clean(value):
    if isinstance(value, float):
        return None if math.isnan(value) else round(value, 3)
    if hasattr(value, "item"):
        return _clean(value.item())
    return value


def generate_scouting_report(row: dict, lang: str = "en") -> str:
    """回傳生成的球探報告文字。若 API 呼叫失敗，拋出 ReportGenerationError 讓呼叫端妥善處理。"""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ReportGenerationError(
            "ANTHROPIC_API_KEY is not set." if lang == "en"
            else "找不到 ANTHROPIC_API_KEY 環境變數，請參考 .env.example 設定你的 API 金鑰。"
        )

    try:
        import anthropic
    except ImportError as e:
        raise ReportGenerationError("pip install anthropic") from e

    payload = {name: _clean(row.get(key)) for key, name in FIELDS.items()}
    payload["decision_stage"] = STAGE_NAMES[row["stage"]]

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=MODEL_NAME,
            max_tokens=500,
            system=SYSTEM_PROMPT.get(lang, SYSTEM_PROMPT["en"]),
            messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
        )
        return message.content[0].text
    except Exception as e:  # noqa: BLE001 - 這裡刻意攔截所有 API 例外，轉成友善訊息給 UI
        raise ReportGenerationError(f"LLM report failed: {e}") from e
