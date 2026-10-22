import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { forecastStrip } from "../lib/charts";
import { RMSE, waterfallSteps, type Decided, type Light } from "../lib/engine";
import { plain, t, type Lang } from "../lib/i18n";
import type { ChartTheme } from "../lib/theme";
import Plot from "./Plot";

export interface Ui { lang: Lang; theme: ChartTheme }
export const UiContext = createContext<Ui>(null as unknown as Ui);
export const useUi = () => useContext(UiContext);
/** 簡寫：目前語言的翻譯函式 */
export function useT() {
  const { lang } = useUi();
  return (key: string, args?: Record<string, string | number>) => t(key, lang, args);
}

export const LIGHT_VAR: Record<Light, string> = { blue: "var(--blue)", green: "var(--green)", red: "var(--red)" };
export const TINT_VAR: Record<Light, string> = { blue: "var(--blue-tint)", green: "var(--green-tint)", red: "var(--red-tint)" };

export function Dot({ color }: { color: Light }) {
  return <span className="dot" style={{ background: LIGHT_VAR[color] }} aria-hidden />;
}

export function Metric({ label, value, delta, tone, help }: {
  label: string; value: string; delta?: string; tone?: "up" | "down"; help?: string;
}) {
  return (
    <div className="metric">
      <div className="m-label">{label}{help && <span className="help" title={help} aria-label={help}>?</span>}</div>
      <div className="m-value">{value}</div>
      {delta && <div className={`m-delta ${tone ?? ""}`}>{delta}</div>}
    </div>
  );
}

export function Section({ title, caption, children }: { title: string; caption?: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {caption && <p className="caption">{caption}</p>}
      {children}
    </section>
  );
}

/** 預測主視覺：大字顯示預測第三年 WS、誤差區間與門檻差距，右側為數線圖。 */
export function Forecast({ p, showActual }: { p: Decided; showActual: boolean }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const gap = p.Pred_WS - p.Dynamic_Truth_WS;
  const vs = lang === "zh"
    ? tr("fc_vs_bar", { b: p.Dynamic_Truth_WS, d: Math.abs(gap), word: tr(gap >= 0 ? "fc_above" : "fc_below") })
    : tr("fc_vs_bar", { b: p.Dynamic_Truth_WS, d: gap });
  const figure = useMemo(() => forecastStrip(p, RMSE, lang, theme, showActual), [p, lang, theme, showActual]);
  const range = tr("fc_range", { lo: p.Pred_WS - RMSE, hi: p.Pred_WS + RMSE }).split(/<\/?b>/);
  return (
    <div className="grid-fc">
      <div className="fc-card" style={{ background: TINT_VAR[p.color], borderColor: LIGHT_VAR[p.color] }}>
        <div className="fc-kicker">{tr("fc_kicker")}</div>
        <div className="fc-big" style={{ color: LIGHT_VAR[p.color] }}>{p.Pred_WS.toFixed(2)}<small>WS</small></div>
        <div className="fc-line">{range[0]}<b>{range[1]}</b>{range[2]}</div>
        <div className="fc-line"><b>{vs}</b></div>
        <div className="fc-note">{tr("fc_note")}</div>
      </div>
      <div className="card">
        <p className="fc-chart-title">{tr("fc_strip_title")}</p>
        <Plot figure={figure} label={tr("fc_strip_title")} />
      </div>
    </div>
  );
}

export function DecisionCard({ p, showActual = true }: { p: Decided; showActual?: boolean }) {
  const tr = useT();
  return (
    <div>
      <Forecast p={p} showActual={showActual} />
      <div className="verdict" style={{ background: TINT_VAR[p.color], borderColor: LIGHT_VAR[p.color] }}>
        <Dot color={p.color} />{plain(tr(`verdict_${p.stage}`))}
      </div>
      <div className="grid-3" style={{ marginTop: 12 }}>
        <Metric label={tr("m_value")} value={`${p.Pred_Salary_Share_Percent.toFixed(2)}%`} />
        <Metric label={tr("m_cost")} value={`${p.Est_Cost_Percent.toFixed(2)}%`} />
        <Metric label={tr("m_ans")} value={`${p.ans >= 0 ? "+" : ""}${p.ans.toFixed(2)}`} />
      </div>
      {!p.hasSentiment && <div className="notice info" style={{ marginTop: 12 }}>{plain(tr("no_sentiment"))}</div>}
    </div>
  );
}

export function Waterfall({ p }: { p: Decided }) {
  const tr = useT();
  const steps = waterfallSteps(p);
  return (
    <section className="section">
      <h2>{tr("waterfall_title")}</h2>
      <p className="caption">{tr("waterfall_caption")}</p>
      {steps.map((s, i) => {
        let rule: string;
        if (s.stage === "profit") rule = tr("rule_profit", { v: s.value! });
        else if (s.stage === "buffer") rule = tr("rule_buffer", { v: s.value!, b: p.buffer });
        else if (s.stage === "opportunity") rule = tr("rule_opportunity", { v: s.value!, t: s.threshold! });
        else if (s.stage === "star") rule = tr("rule_star", { v: s.value!, t: s.threshold!, a: s.extra!.ans, af: s.extra!.ansFloor });
        else rule = tr("rule_reject");
        const color = s.stage === "reject" ? "red" : s.stage === "profit" ? "blue" : "green";
        const state = !s.reached ? "skip" : s.passed ? "pass" : "fail";
        const status = plain(tr(state === "skip" ? "gate_skip" : state === "pass" ? "gate_pass" : "gate_fail"));
        return (
          <div key={s.stage} className={`gate ${state}`}
            style={state === "pass" ? { borderColor: LIGHT_VAR[color], background: TINT_VAR[color] } : undefined}>
            <span className="num" style={state === "pass" ? { background: LIGHT_VAR[color] } : undefined}>{i + 1}</span>
            <span className="name">{tr(`stage_${s.stage}`)}</span>
            <span className="status" style={state === "pass" ? { color: LIGHT_VAR[color] } : undefined}>
              {state === "pass" ? "✓ " : state === "fail" ? "✕ " : ""}{status}
            </span>
            <span className="rule">{rule}</span>
          </div>
        );
      })}
      <p className="caption" style={{ marginTop: 10 }}>{tr("no_injury_note")}</p>
    </section>
  );
}

export function Reality({ p }: { p: Decided }) {
  const tr = useT();
  const facts: string[] = [];
  for (const [key, col] of [["team_kept_y3", "year_3"], ["team_kept_y4", "year_4"]] as const) {
    const v = String(p[col] ?? "").trim().toLowerCase();
    if (v === "yes" || v === "no") facts.push(`${tr(key)}: ${tr(v)}`);
  }
  if (p.color === "red" && p.Outcome_Label) facts.push(`${tr("outcome_label")}: ${tr(`outcome_${p.Outcome_Label}`)}`);
  return (
    <section className="section">
      <h2>{tr("reality_title")}</h2>
      {!p.hasYear3 ? (
        <div className="notice info">{plain(tr("reality_none"))}</div>
      ) : (
        <div className="stack">
          <div className={`notice ${p.callCorrect ? "ok" : "bad"}`}>
            <span aria-hidden>{p.callCorrect ? "✓" : "✕"}</span>
            {plain(tr(p.callCorrect ? "reality_correct" : "reality_wrong"))}
          </div>
          <div className="grid-3" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Metric label={tr("m_actual_ws")} value={(p.Year3_WS as number).toFixed(1)}
              delta={tr("vs_pred", { d: (p.Year3_WS as number) - p.Pred_WS })} />
            <Metric label={tr("m_dtw")} value={p.Dynamic_Truth_WS.toFixed(2)} />
          </div>
          <p className="caption" style={{ margin: 0 }}>{tr("reality_explain")}</p>
        </div>
      )}
      {facts.length > 0 && <div className="facts" style={{ marginTop: 10 }}>{facts.map((f) => <span key={f}>{f}</span>)}</div>}
    </section>
  );
}

const MAX_REPORTS_PER_SESSION = 5;
let reportsUsed = 0;

export function ReportButton({ p }: { p: Decided }) {
  const { lang } = useUi();
  const tr = useT();
  const [state, setState] = useState<{ loading: boolean; text?: string; error?: string; key?: string }>({ loading: false });
  const key = `${p.year_start}|${p.Player}|${p.Pred_WS}|${lang}`;
  const shown = state.key === key ? state : { loading: false };

  async function run() {
    if (reportsUsed >= MAX_REPORTS_PER_SESSION) {
      setState({ loading: false, error: tr("llm_limit"), key });
      return;
    }
    setState({ loading: true, key });
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang, stage: p.stage, player: p.Player, cohort: p.year_start, draft_pick: p.DraftRank,
          predicted_year3_win_shares: p.Pred_WS, predicted_value_pct_of_cap: p.Pred_Salary_Share_Percent,
          contract_cost_pct_of_cap: p.Est_Cost_Percent, net_surplus_pct_of_cap: p.ans,
          replacement_level_win_shares: p.Dynamic_Truth_WS, star_power_index: p.Star_Power_Index,
          cohort_star_power_70th_percentile: p.floor,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.report) throw new Error(data.error || tr("llm_error"));
      reportsUsed++;
      setState({ loading: false, text: data.report, key });
    } catch (e) {
      setState({ loading: false, error: e instanceof Error ? e.message : tr("llm_error"), key });
    }
  }

  return (
    <section className="section">
      <button className="btn btn-primary" onClick={run} disabled={shown.loading}>
        {shown.loading ? <span className="spinner" aria-hidden /> : <span aria-hidden>✦</span>}
        {shown.loading ? tr("llm_spinner") : plain(tr("llm_button"))}
      </button>
      {shown.text && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>{tr("llm_title")}</h3>
          <p className="report">{shown.text}</p>
          <p className="caption" style={{ margin: 0 }}>{tr("llm_note")}</p>
        </div>
      )}
      {shown.error && <div className="notice bad" style={{ marginTop: 12 }}>{shown.error}</div>}
    </section>
  );
}

export interface Column<T> { key: string; label: string; value: (row: T) => string | number | null; num?: boolean; render?: (row: T) => ReactNode }

/** 可點欄位排序的簡易表格 */
export function Table<T>({ rows, columns, initialSort }: { rows: T[]; columns: Column<T>[]; initialSort?: string }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: initialSort ?? columns[0].key, dir: 1 });
  const col = columns.find((c) => c.key === sort.key) ?? columns[0];
  const sorted = [...rows].sort((a, b) => {
    const x = col.value(a), y = col.value(b);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x < y ? -1 : 1) * sort.dir;
  });
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? "num" : undefined}
                onClick={() => setSort({ key: c.key, dir: sort.key === c.key ? (-sort.dir as 1 | -1) : 1 })}
                aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                {c.label}{sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} className={c.num ? "num" : undefined}>{c.render ? c.render(r) : (c.value(r) ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
