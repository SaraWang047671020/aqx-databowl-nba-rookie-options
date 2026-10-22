/**
 * Vercel Serverless Function：POST /api/scout
 * 產生完整球探報告的文字部分（摘要、優勢、隱憂、合約觀點、決策理由、相似球員解讀、關鍵變數、結論）。
 * 以 OpenAI Structured Outputs 回傳固定格式的 JSON，網頁再把它排進報告版面。
 * 報告視角是「做決策當下」：不提供球員第三年實際表現給模型，避免事後諸葛。
 * API 金鑰只存在 Vercel 環境變數 OPENAI_API_KEY，不會傳到瀏覽器。
 */

const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-5-mini";
// 推理型模型的 token 上限包含推理過程，完整報告需預留較多空間
const MAX_COMPLETION_TOKENS = 6000;

// 簡易流量限制（每個函式實例各自計算，僅用來擋掉誤觸或濫用）
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

const SYSTEM_PROMPT = {
  en: [
    "You are a senior NBA front-office analyst writing an internal scouting report on whether to exercise a first-round pick's team option.",
    "Write as of the decision date: you only know the player's first two seasons, the model forecast and the contract economics. Never speculate about what happened later.",
    "Use only the numbers provided. Never invent stats, injuries, events, teams, coaches or a player's position.",
    "Cite specific numbers to support each point, rounded to 2 decimals (percentages of the salary cap as e.g. 7.10%).",
    "Write natural prose for a general manager: never mention JSON keys, field names, variable names or booleans (e.g. do not write has_news_coverage or replacement_bar_win_shares).",
    "Decision logic: there are four safety nets checked in order (clear surplus, statistical buffer, opportunity cost, star-power rescue). The player keeps the option at the first net he passes; a stop loss means all four failed. Stop loss is the outcome, not a gate that is passed.",
    "Comparable players come from EARLIER cohorts, not the same cohort; their actual year-3 output is known and may be cited. Each comparable has its own replacement bar (it depends on draft slot): judge each against its own bar, not this player's.",
    "Round to 2 decimals as given; quote the Star Power Index with 4 decimals. Do not start any section with its own title (e.g. no 'Bottom line:').",
    "Write in English. Be specific and concise; no filler, no hype.",
  ].join(" "),
  zh: [
    "你是 NBA 球團的資深分析師，正在撰寫內部球探報告，評估是否執行一名首輪新秀的球隊選擇權。",
    "請以「做決策當下」的角度撰寫：你只知道球員前兩季表現、模型預測與合約經濟數據，不可推測之後發生的事。",
    "只能使用提供的數字，不可捏造數據、傷病、事件、球隊、教練或球員位置。",
    "每個論點都要引用具體數字，四捨五入到小數點後兩位（薪資帽占比寫成 7.10% 這種格式）。",
    "用總經理看得懂的自然文字撰寫：絕對不可出現 JSON 欄位名稱、變數名稱或 true/false（例如不可寫 has_news_coverage、replacement_bar_win_shares）。",
    "決策邏輯：依序檢查四道防護網（絕對獲利、統計容錯、機會成本、商業聲量救場），球員在第一道通過的防護網就被保留；「絕對止損」代表四道防護網全部未通過，它是結果，不是一道「通過」的關卡。",
    "相似球員來自「更早的梯次」，不是同梯次；他們第三年的實際表現已知，可以引用。每位相似球員有自己的機會成本基準（依選秀順位而定），要用他自己的基準判斷是否達標，不可拿本球員的基準比較。",
    "數字照提供的位數引用（兩位小數），商業聲量指數保留四位小數。各段落開頭不要重複段落標題（例如不要寫「結論：」）。",
    "用語統一：Win Shares（WS）、第三年、預測值、可能區間、薪資帽、合約成本、淨盈餘、機會成本基準、統計容錯、商業聲量指數、同梯次。",
    "全部使用繁體中文（台灣用語），不可出現簡體字。內容具體精簡，不要空話或誇飾。",
  ].join(""),
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

const str = { type: "string" } as const;
const strList = { type: "array", items: str } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "strengths", "concerns", "contract_view", "decision_rationale",
    "comparables_insight", "what_would_change", "bottom_line"],
  properties: {
    headline: { ...str, description: "One-line verdict, under 15 words." },
    summary: { ...str, description: "Executive summary, 3-4 sentences." },
    strengths: { ...strList, description: "2-4 strengths, each one sentence citing a number." },
    concerns: { ...strList, description: "2-4 concerns or risks, each one sentence citing a number." },
    contract_view: { ...str, description: "2-3 sentences on value vs. rookie-scale cost." },
    decision_rationale: { ...str, description: "3-4 sentences walking through the waterfall gates." },
    comparables_insight: { ...str, description: "2-3 sentences on what the comparable players suggest." },
    what_would_change: { ...strList, description: "2-3 concrete conditions that would flip the call." },
    bottom_line: { ...str, description: "Final recommendation in 1-2 sentences, echoing the decision." },
  },
} as const;

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

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null);
const text = (v: unknown, max = 80) => String(v ?? "").slice(0, max);

/** 只轉送白名單欄位，避免把任意內容塞進 prompt */
function sanitize(body: Record<string, unknown>, lang: Lang) {
  const gates = Array.isArray(body.gates) ? body.gates.slice(0, 5) : [];
  const comps = Array.isArray(body.comparables) ? body.comparables.slice(0, 6) : [];
  return {
    player: text(body.player),
    cohort: num(body.cohort),
    draft_pick: num(body.draft_pick),
    is_hypothetical_new_player: body.is_manual === true,
    forecast_year3_win_shares: num(body.forecast),
    forecast_range_low: num(body.range_low),
    forecast_range_high: num(body.range_high),
    model_rmse: num(body.rmse),
    cohort_forecast_rank: num(body.cohort_rank),
    cohort_size: num(body.cohort_size),
    predicted_value_pct_of_cap: num(body.value_pct),
    contract_cost_pct_of_cap: num(body.cost_pct),
    net_surplus_pct_of_cap: num(body.surplus),
    replacement_bar_win_shares: num(body.replacement_bar),
    statistical_buffer: num(body.buffer),
    star_power_index: num(body.spi),
    cohort_star_power_70th_percentile: num(body.spi_floor),
    has_news_coverage: body.has_sentiment === true,
    waterfall_gates: gates.map((g: Record<string, unknown>) => ({
      gate: text(g.gate, 40), rule: text(g.rule, 160), evaluated: g.reached === true, passed: g.passed === true,
    })),
    comparable_players: comps.map((c: Record<string, unknown>) => ({
      player: text(c.player), cohort: num(c.cohort), draft_pick: num(c.pick),
      forecast: num(c.forecast), actual_year3_win_shares: num(c.actual),
      own_replacement_bar: num(c.own_bar), reached_own_bar: c.reached_bar === true,
    })),
    decision: STAGE_NAMES[lang][body.stage as StageKey],
  };
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
  if (!((body.stage as string) in STAGE_NAMES.en)) return json(400, { error: "Unknown decision stage." });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL_NAME,
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        // 推理型模型（gpt-5、o 系列）降低推理量以縮短等待時間；其他模型不支援此參數
        ...(/^(gpt-5|o\d)/.test(MODEL_NAME) ? { reasoning_effort: "low" } : {}),
        response_format: { type: "json_schema", json_schema: { name: "scouting_report", strict: true, schema: SCHEMA } },
        messages: [
          { role: "system", content: SYSTEM_PROMPT[lang] },
          { role: "user", content: JSON.stringify(sanitize(body, lang)) },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenAI error", res.status, detail.slice(0, 500));
      return json(502, { error: `OpenAI request failed (${res.status}).` });
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return json(502, { error: "The model returned an empty report." });
    return json(200, { report: JSON.parse(content), model: MODEL_NAME, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json(502, { error: "Could not generate the report." });
  }
}
