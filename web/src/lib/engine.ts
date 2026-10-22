/**
 * 決策核心：移植自 webapp/decision_engine.py，規則與 scripts/research_no_injury.py（研究主分析）一致。
 * - 五層瀑布流：絕對獲利 → 統計容錯 → 機會成本 → 商業聲量救場 → 止損
 * - 聲量門檻 = 同梯次首輪新秀 Star_Power_Index（缺值補 0）之第 70 百分位數
 * scripts/verify_engine.ts 會逐人比對 Python 版的結果。
 */
import model from "../data/model.json" with { type: "json" };
import refs from "../data/refs.json" with { type: "json" };
import spiTable from "../data/spi.json" with { type: "json" };
import newCohorts from "../data/new_cohorts.json" with { type: "json" };
import study from "../data/study.json" with { type: "json" };

export const TEAM_COUNT = 30;
export const TOTAL_GAMES = 1230;
export const RMSE_MULTIPLIER = 1.25;
export const STAR_RESCUE_MULTIPLIER = 1.5;
export const STAR_POWER_PERCENTILE = 0.7;
export const VET_MIN_COST_PERCENT = 1.8; // 底薪老將約佔薪資帽 1.8%，機會成本基準的下限
export const STUDY_YEARS: [number, number] = [2013, 2023];
export const RMSE: number = model.test_rmse;

export type Stage = "profit" | "buffer" | "opportunity" | "star" | "reject";
export type Light = "blue" | "green" | "red";
export const STAGES: Stage[] = ["profit", "buffer", "opportunity", "star", "reject"];
export const STAGE_COLOR: Record<Stage, Light> = {
  profit: "blue", buffer: "green", opportunity: "green", star: "green", reject: "red",
};

export interface RawPlayer {
  Player: string;
  year_start: number;
  DraftRank: number;
  Pred_WS: number;
  Year3_WS: number | null;
  Pred_Salary_Share_Percent: number;
  Est_Cost_Percent: number;
  Dynamic_Truth_WS: number;
  BRI_Factor: number;
  Star_Power_Index: number | null;
  Outcome_Label: string | null;
  year_3: string | null;
  year_4: string | null;
  /** research＝研究樣本 2013–2023；oot＝2024 梯次時間外驗證；live＝2025 梯次即時預測 */
  segment?: Segment;
  /** 球團實際的第四年選擇權決定（目前只有 2024 梯次） */
  team_decision?: "exercised" | "declined" | "waived" | "n/a" | null;
}

export type Segment = "research" | "oot" | "live";

export interface Decided extends RawPlayer {
  spi: number; // Star_Power_Index_Filled
  floor: number; // Star_Power_Floor
  ans: number; // Adjusted_Net_Surplus
  buffer: number; // RMSE_Buffer
  starMultiplier: number;
  stage: Stage;
  color: Light;
  hasSentiment: boolean;
  hasYear3: boolean;
  callCorrect: boolean | null;
  actualNet: number | null;
}

export interface Params {
  rmseMultiplier: number;
  starPercentile: number;
  starMultiplier: number;
}

export const DEFAULT_PARAMS: Params = {
  rmseMultiplier: RMSE_MULTIPLIER,
  starPercentile: STAR_POWER_PERCENTILE,
  starMultiplier: STAR_RESCUE_MULTIPLIER,
};

export const STUDY = (study as RawPlayer[]).map((p) => ({ ...p, segment: "research" as const }));
/** 研究後新增的梯次：資料來自 Basketball-Reference，見 scripts/build_new_cohorts.py */
export const NEW_COHORTS = newCohorts as RawPlayer[];
const ALL_ROWS: RawPlayer[] = [...STUDY, ...NEW_COHORTS];
/** 研究樣本的梯次（回測、參數模擬只用這些） */
export const COHORT_YEARS = Array.from(
  { length: STUDY_YEARS[1] - STUDY_YEARS[0] + 1 }, (_, i) => STUDY_YEARS[0] + i);
export const OOT_YEAR = 2024;
export const LIVE_YEAR = 2025;
/** 所有可查詢的梯次（含新梯次） */
export const ALL_YEARS = [...COHORT_YEARS, OOT_YEAR, LIVE_YEAR];

/** 與 pandas Series.quantile 預設（linear interpolation）相同。 */
export function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function decideStage(ans: number, predWs: number, dtw: number, spi: number, floor: number,
  buffer: number, starMultiplier = STAR_RESCUE_MULTIPLIER): Stage {
  if (ans > 0) return "profit";
  if (ans >= -buffer) return "buffer";
  if (predWs >= dtw) return "opportunity";
  if (spi >= floor && ans >= -buffer * starMultiplier) return "star";
  return "reject";
}

export interface Step {
  stage: Stage;
  value?: number;
  threshold?: number;
  passed: boolean;
  reached: boolean;
  extra?: { ans: number; ansFloor: number };
}

export function waterfallSteps(p: Pick<Decided, "ans" | "spi" | "floor" | "Pred_WS" | "Dynamic_Truth_WS" | "buffer" | "starMultiplier">): Step[] {
  const ansFloor = -p.buffer * p.starMultiplier;
  const raw: Omit<Step, "reached">[] = [
    { stage: "profit", value: p.ans, threshold: 0, passed: p.ans > 0 },
    { stage: "buffer", value: p.ans, threshold: -p.buffer, passed: p.ans >= -p.buffer },
    { stage: "opportunity", value: p.Pred_WS, threshold: p.Dynamic_Truth_WS, passed: p.Pred_WS >= p.Dynamic_Truth_WS },
    { stage: "star", value: p.spi, threshold: p.floor, passed: p.spi >= p.floor && p.ans >= ansFloor,
      extra: { ans: p.ans, ansFloor } },
  ];
  let reached = true;
  const steps: Step[] = raw.map((s) => {
    const step = { ...s, reached };
    if (reached && s.passed) reached = false;
    return step;
  });
  steps.push({ stage: "reject", reached, passed: reached });
  return steps;
}

function finish(p: RawPlayer, spi: number, floor: number, buffer: number, starMultiplier: number,
  hasSentiment: boolean): Decided {
  const ans = p.Pred_Salary_Share_Percent - p.Est_Cost_Percent;
  const stage = decideStage(ans, p.Pred_WS, p.Dynamic_Truth_WS, spi, floor, buffer, starMultiplier);
  const color = STAGE_COLOR[stage];
  const hasYear3 = p.Year3_WS !== null;
  const metBar = hasYear3 ? (p.Year3_WS as number) >= p.Dynamic_Truth_WS : null;
  return {
    ...p, spi, floor, ans, buffer, starMultiplier, stage, color, hasSentiment, hasYear3,
    callCorrect: metBar === null ? null : (color !== "red") === metBar,
    actualNet: hasYear3
      ? (p.Year3_WS as number) * (TEAM_COUNT * p.BRI_Factor / TOTAL_GAMES * 100) - p.Est_Cost_Percent
      : null,
  };
}

const floorCache = new Map<number, Map<number, number>>();

function cohortFloors(percentile: number): Map<number, number> {
  let floors = floorCache.get(percentile);
  if (!floors) {
    floors = new Map();
    for (const year of ALL_YEARS) {
      const vals = ALL_ROWS.filter((p) => p.year_start === year).map((p) => p.Star_Power_Index ?? 0);
      if (vals.length) floors.set(year, quantile(vals, percentile));
    }
    floorCache.set(percentile, floors);
  }
  return floors;
}

function classifyRows(rows: RawPlayer[], params: Params): Decided[] {
  const buffer = RMSE * params.rmseMultiplier;
  const floors = cohortFloors(params.starPercentile);
  return rows.map((p) => finish(p, p.Star_Power_Index ?? 0, floors.get(p.year_start) ?? 0, buffer,
    params.starMultiplier, p.Star_Power_Index !== null));
}

/** 研究樣本（2013–2023 梯次 329 人）：回測與參數模擬使用，數字與研究報告一致 */
export function classify(params: Params = DEFAULT_PARAMS): Decided[] {
  return classifyRows(STUDY, params);
}

/** 研究樣本 + 新梯次：球員查詢、梯次總覽、球探報告使用 */
export function classifyAll(params: Params = DEFAULT_PARAMS): Decided[] {
  return classifyRows(ALL_ROWS, params);
}

export interface Summary {
  n: number; blue: number; green: number; red: number;
  redLabeled: number; redBelow: number; redNoYear3: number; hitRate: number;
  avoided: number; sacrificed: number; net: number;
  labeled: number; TP: number; FP: number; TN: number; FN: number; accuracy: number; redMae: number;
}

export function summarize(x: Decided[]): Summary {
  const red = x.filter((p) => p.color === "red");
  const redLabeled = red.filter((p) => p.hasYear3);
  let avoided = 0, sacrificed = 0;
  for (const p of redLabeled) {
    const a = p.actualNet as number;
    if (a < 0) avoided -= a; else sacrificed += a;
  }
  const labeled = x.filter((p) => p.hasYear3);
  let TP = 0, FP = 0, TN = 0, FN = 0;
  for (const p of labeled) {
    const keep = p.color !== "red";
    const good = (p.Year3_WS as number) >= p.Dynamic_Truth_WS;
    if (keep && good) TP++; else if (keep) FP++; else if (good) FN++; else TN++;
  }
  const redBelow = redLabeled.filter((p) => (p.Year3_WS as number) < p.Dynamic_Truth_WS).length;
  const mae = redLabeled.reduce((s, p) => s + Math.abs(p.Pred_WS - (p.Year3_WS as number)), 0);
  return {
    n: x.length,
    blue: x.filter((p) => p.color === "blue").length,
    green: x.filter((p) => p.color === "green").length,
    red: red.length,
    redLabeled: redLabeled.length,
    redBelow,
    redNoYear3: red.length - redLabeled.length,
    hitRate: redLabeled.length ? redBelow / redLabeled.length : NaN,
    avoided, sacrificed, net: avoided - sacrificed,
    labeled: labeled.length, TP, FP, TN, FN,
    accuracy: labeled.length ? (TP + TN) / labeled.length : NaN,
    redMae: redLabeled.length ? mae / redLabeled.length : NaN,
  };
}

// ---------------------------------------------------------------- manual player

export const FEATURES: string[] = model.features;

/** median 補值 → 標準化 → Lasso；與 webapp/models/lasso_pipeline.pkl 完全等價。 */
export function predictWs(stats: Record<string, number | null | undefined>): number {
  let y = model.intercept;
  FEATURES.forEach((f, i) => {
    const raw = stats[f];
    const v = raw === null || raw === undefined || Number.isNaN(raw) ? model.median[i] : raw;
    y += ((v - model.mean[i]) / model.scale[i]) * model.coef[i];
  });
  return y;
}

export function costPercent(pick: number): number {
  return pick >= 1 && pick <= 30 ? 8.0 - (pick - 1) * (6.5 / 29) : 1.1;
}

/** 機會成本基準（同 scrape_player_news.ipynb）：合約成本換算成 WS，下限為底薪老將的產能。 */
export function dynamicTruthWs(costPct: number, briFactor: number): number {
  const wsValuePercent = TEAM_COUNT * briFactor / TOTAL_GAMES * 100;
  return Math.round(Math.max(costPct, VET_MIN_COST_PERCENT) / wsValuePercent * 100) / 100;
}

export function lookupStarPower(name: string): number | null {
  const v = (spiTable as Record<string, number>)[name.trim().toLowerCase()];
  return v === undefined ? null : v;
}

export function evaluateManual(name: string, stats: Record<string, number>, pick: number, year: number): Decided {
  const ref = (refs as Record<string, { salary_cap: number; bri_factor: number }>)[String(year)]
    ?? { salary_cap: 136.0, bri_factor: 0.5 };
  const predWs = predictWs(stats);
  const valuePerWs = (ref.salary_cap * TEAM_COUNT * ref.bri_factor) / TOTAL_GAMES;
  const spi = lookupStarPower(name);
  const raw: RawPlayer = {
    Player: name, year_start: year, DraftRank: pick, Pred_WS: predWs, Year3_WS: null,
    Pred_Salary_Share_Percent: (predWs * valuePerWs / ref.salary_cap) * 100,
    Est_Cost_Percent: costPercent(pick), Dynamic_Truth_WS: dynamicTruthWs(costPercent(pick), ref.bri_factor),
    BRI_Factor: ref.bri_factor,
    Star_Power_Index: spi, Outcome_Label: null, year_3: null, year_4: null,
  };
  const floor = cohortFloors(STAR_POWER_PERCENTILE).get(year) ?? 0;
  return finish(raw, spi ?? 0, floor, RMSE * RMSE_MULTIPLIER, STAR_RESCUE_MULTIPLIER, spi !== null);
}

export const MODEL_META = {
  r2: model.test_r2 as number, rmse: model.test_rmse as number, mae: model.test_mae as number,
  nTrain: model.n_train as number, nTest: model.n_test as number,
};

// ---------------------------------------------------------------- scouting report helpers

/** 預測 WS 在同梯次中的名次（1 = 最高） */
export function cohortRank(p: Decided, decided: Decided[]): { rank: number; size: number } {
  const cohort = decided.filter((x) => x.year_start === p.year_start && x.Player !== p.Player);
  return { rank: cohort.filter((x) => x.Pred_WS > p.Pred_WS).length + 1, size: cohort.length + 1 };
}

/**
 * 歷史相似球員：預測 WS 與選秀順位最接近、且已有第三年紀錄者。
 * 只取「更早梯次」，避免用到做決策當下還不知道的資訊；手動輸入的新球員可比對全部梯次。
 */
export function comparables(p: Decided, decided: Decided[], n = 5, earlierOnly = true): Decided[] {
  return decided
    .filter((x) => x.Year3_WS !== null && x.Player !== p.Player
      && (!earlierOnly || x.year_start < p.year_start))
    .map((x) => ({ x, d: Math.abs(x.Pred_WS - p.Pred_WS) / RMSE + Math.abs(x.DraftRank - p.DraftRank) / 10 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((r) => r.x);
}
