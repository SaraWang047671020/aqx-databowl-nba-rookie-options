/**
 * Vercel Serverless Function：POST /api/report
 * 根據前端傳來的球員數據，呼叫 OpenAI 生成 3–5 句球探報告（移植自 webapp/report_generator.py）。
 * API 金鑰只存在 Vercel 環境變數 OPENAI_API_KEY，不會傳到瀏覽器。
 */

const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-5-mini";
// 推理型模型的 token 上限包含推理過程，需預留足夠空間
const MAX_COMPLETION_TOKENS = 2000;

// 簡易流量限制（每個函式實例各自計算，僅用來擋掉誤觸或濫用）
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

const SYSTEM_PROMPT = {
  zh: "你是一位 NBA 球探分析師。根據使用者提供的球員數據 JSON，用繁體中文寫一份 3-5 句話的球探報告。"
    + "只能根據提供的數據做分析，不可捏造未提供的數據或事件（包括球員位置）。"
    + "報告的最後一句話，要清楚呼應系統給出的決策建議（decision_stage）。",
  en: "You are an NBA scouting analyst. Based on the player data JSON provided, "
    + "write a 3-5 sentence scouting report in English. "
    + "Only use the data provided; never invent stats, events or a player's position. "
    + "The final sentence must clearly echo the system's decision (decision_stage).",
};

const STAGE_NAMES = {
  en: {
    profit: "exercise option - clear surplus",
    buffer: "keep - loss within model error",
    opportunity: "keep - beats replacement level",
    star: "keep - star-power rescue",
    reject: "decline option - stop loss",
  },
  zh: {
    profit: "絕對獲利，建議執行選擇權",
    buffer: "統計容錯，建議保留",
    opportunity: "機會成本救贖，建議保留",
    star: "商業聲量救場，建議保留",
    reject: "絕對止損，建議放棄選擇權",
  },
} as const;

type Lang = keyof typeof STAGE_NAMES;
type StageKey = keyof (typeof STAGE_NAMES)["en"];

const NUMERIC_FIELDS = [
  "predicted_year3_win_shares", "predicted_value_pct_of_cap", "contract_cost_pct_of_cap",
  "net_surplus_pct_of_cap", "replacement_level_win_shares", "star_power_index",
  "cohort_star_power_70th_percentile", "cohort", "draft_pick",
] as const;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((ts) => now - ts < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(500, { error: "OPENAI_API_KEY is not set on the server." });

  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip)) return json(429, { error: "Too many reports. Please wait a few minutes." });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON." });
  }
  const lang: Lang = body.lang === "zh" ? "zh" : "en";
  const stage = body.stage as StageKey;
  if (!(stage in STAGE_NAMES.en)) return json(400, { error: "Unknown decision stage." });

  // 只轉送白名單欄位，避免把任意內容塞進 prompt
  const payload: Record<string, unknown> = {
    player: String(body.player ?? "").slice(0, 80),
    decision_stage: STAGE_NAMES[lang][stage],
  };
  for (const key of NUMERIC_FIELDS) {
    const v = body[key];
    payload[key] = typeof v === "number" && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        messages: [
          { role: "system", content: SYSTEM_PROMPT[lang] },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenAI error", res.status, detail.slice(0, 500));
      return json(502, { error: `OpenAI request failed (${res.status}).` });
    }
    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return json(502, { error: "The model returned an empty report." });
    return json(200, { report: text, model: MODEL_NAME });
  } catch (e) {
    console.error(e);
    return json(502, { error: "Could not reach OpenAI." });
  }
}
