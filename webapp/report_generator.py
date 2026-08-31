"""
呼叫 Claude API，根據球員的預測數據與決策結果，生成一份簡短的球探報告。
API key 從環境變數 ANTHROPIC_API_KEY 讀取（透過 .env / python-dotenv 載入），不寫死在程式碼中。
"""
import json
import os

from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "claude-haiku-4-5"

SYSTEM_PROMPT = (
    "你是一位 NBA 球探分析師。根據使用者提供的球員數據 JSON，"
    "用繁體中文寫一份 3-5 句話的球探報告。"
    "只能根據提供的數據做分析，不可捏造未提供的數據或事件。"
    "報告的最後一句話，要清楚呼應系統給出的決策建議（decision reason）。"
)


class ReportGenerationError(Exception):
    pass


def generate_scouting_report(player_stats: dict, decision_result: dict) -> str:
    """回傳生成的球探報告文字。若 API 呼叫失敗，拋出 ReportGenerationError 讓呼叫端妥善處理。"""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ReportGenerationError(
            "找不到 ANTHROPIC_API_KEY 環境變數，請參考 .env.example 設定你的 API 金鑰。"
        )

    try:
        import anthropic
    except ImportError as e:
        raise ReportGenerationError("尚未安裝 anthropic 套件，請執行 pip install anthropic") from e

    payload = {"player_stats": player_stats, "decision_result": decision_result}

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model=MODEL_NAME,
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"請根據以下球員數據生成球探報告：\n{json.dumps(payload, ensure_ascii=False, default=str)}",
                }
            ],
        )
        return message.content[0].text
    except Exception as e:  # noqa: BLE001 - 這裡刻意攔截所有 API 例外，轉成友善訊息給 UI
        raise ReportGenerationError(f"LLM 報告生成失敗：{e}") from e
