import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { forecastStrip } from "../lib/charts";
import { draftYear, RMSE, TEAM_DECISIONS_AS_OF, waterfallSteps, type Decided, type Light, type Step } from "../lib/engine";
import { plain, t, type Lang } from "../lib/i18n";
import { href } from "../lib/router";
import { Icons } from "./Art";
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

/** 燈號顏色；不適用選擇權決策的球員（延後出賽）改用中性灰 */
export const lightOf = (p: Decided) => (p.optionInScope ? LIGHT_VAR[p.color] : "var(--muted)");
export const tintOf = (p: Decided) => (p.optionInScope ? TINT_VAR[p.color] : "rgba(100, 116, 139, 0.16)");

/** 表格裡的模型建議：燈號 + 文字；不適用者顯示「不適用」 */
export function CallLabel({ p }: { p: Decided }) {
  const tr = useT();
  if (!p.optionInScope) return <span style={{ color: "var(--muted)" }}>{tr("call_na")}</span>;
  return <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Dot color={p.color} />{tr(`color_${p.color}`)}</span>;
}
export const callText = (p: Decided, tr: ReturnType<typeof useT>) => (p.optionInScope ? tr(`color_${p.color}`) : tr("call_na"));

/** 延後出賽說明：選擇權期限依合約年份，早於模型所需的兩季 */
export function DelayedNotice({ p }: { p: Decided }) {
  const tr = useT();
  if (!p.delayed_debut) return null;
  const d = draftYear(p);
  return (
    <div className="notice info delayed-notice">
      <div>
        <b>{tr("delayed_t")}</b>
        <p style={{ margin: "4px 0 0", fontWeight: 400 }}>
          {tr(p.optionInScope ? "delayed_research" : "delayed_oot", { d, y: p.year_start, o: d + 2 })}
        </p>
      </div>
    </div>
  );
}

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
      <div className="fc-card" style={{ background: tintOf(p), borderColor: lightOf(p) }}>
        <div className="fc-kicker">{tr("fc_kicker")}</div>
        <div className="fc-big" style={{ color: lightOf(p) }}>{p.Pred_WS.toFixed(2)}<small>WS</small></div>
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
      <div className="verdict" style={{ background: tintOf(p), borderColor: lightOf(p) }}>
        {p.optionInScope ? <><Dot color={p.color} />{plain(tr(`verdict_${p.stage}`))}</> : tr("verdict_na")}
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

/** 每一層關卡的條件文字（實際值與門檻），網頁與 AI 報告共用 */
export function gateRule(s: Step, p: Decided, tr: ReturnType<typeof useT>): string {
  if (s.stage === "profit") return tr("rule_profit", { v: s.value! });
  if (s.stage === "buffer") return tr("rule_buffer", { v: s.value!, b: p.buffer });
  if (s.stage === "opportunity") return tr("rule_opportunity", { v: s.value!, t: s.threshold! });
  if (s.stage === "star") return tr("rule_star", { v: s.value!, t: s.threshold!, a: s.extra!.ans, af: s.extra!.ansFloor });
  return tr("rule_reject");
}

export function Waterfall({ p, title = true }: { p: Decided; title?: boolean }) {
  const tr = useT();
  const steps = waterfallSteps(p);
  return (
    <section className={title ? "section" : undefined}>
      {title && <h2>{tr("waterfall_title")}</h2>}
      <p className="caption">{tr("waterfall_caption")}</p>
      {steps.map((s, i) => {
        const rule = gateRule(s, p, tr);
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

/** 球團實際的第四年選擇權決定（2024、2025 梯次），並標示與模型建議是否一致 */
export function TeamDecision({ p }: { p: Decided }) {
  const tr = useT();
  const d = p.team_decision;
  if (!d) return null;
  const announced = d === "exercised" || d === "declined" || d === "waived";
  const teamKeep = d === "exercised";
  const agree = announced && teamKeep === (p.color !== "red");
  const tone = !announced ? "var(--muted)" : teamKeep ? "var(--green)" : "var(--red)";
  return (
    <div className="team-card">
      <div className="team-card-head">
        <span className="label">{tr("td_title")} · {tr("td_option")}</span>
        {announced && (
          <span className={`agree-chip ${agree ? "yes" : "no"}`}>{agree ? "✓ " : "≠ "}{tr(agree ? "td_agree" : "td_disagree")}</span>
        )}
      </div>
      <div className="team-card-value" style={{ color: tone }}>
        {announced ? (teamKeep ? "✓ " : "✕ ") : "… "}{tr(`td_${d}`)}
      </div>
      <p className="caption" style={{ margin: 0 }}>
        {d === "n/a" ? (p.delayed_debut ? tr("td_delayed_note", { o: draftYear(p) + 2 }) : tr("td_na_note"))
          : p.segment === "live" ? tr("td_pending_note", { d: TEAM_DECISIONS_AS_OF }) : tr("td_source_2024")}
      </p>
    </div>
  );
}

export function Reality({ p, title = true }: { p: Decided; title?: boolean }) {
  const tr = useT();
  const facts: string[] = [];
  for (const [key, col] of [["team_kept_y3", "year_3"], ["team_kept_y4", "year_4"]] as const) {
    const v = String(p[col] ?? "").trim().toLowerCase();
    if (v === "yes" || v === "no") facts.push(`${tr(key)}: ${tr(v)}`);
  }
  if (p.color === "red" && p.Outcome_Label) facts.push(`${tr("outcome_label")}: ${tr(`outcome_${p.Outcome_Label}`)}`);
  return (
    <section className={title ? "section" : undefined}>
      {title && <h2>{tr("reality_title")}</h2>}
      {p.segment === "live" ? (
        <div className="notice info">{tr("reality_live")}</div>
      ) : !p.hasYear3 ? (
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
      {p.team_decision && <div style={{ marginTop: 12 }}><TeamDecision p={p} /></div>}
      {facts.length > 0 && <div className="facts" style={{ marginTop: 10 }}>{facts.map((f) => <span key={f}>{f}</span>)}</div>}
    </section>
  );
}

/** 前往完整球探報告頁；autostart 讓報告頁一打開就開始生成 AI 分析 */
export function ReportLink({ year, player }: { year: number | "new"; player?: string }) {
  const tr = useT();
  const target = year === "new" ? href("report", "new") : href("report", year, player ?? "");
  return (
    <section className="section report-cta">
      <div>
        <h3>{tr("rpt_open")}</h3>
        <p className="caption" style={{ margin: 0 }}>{tr("rpt_open_d")}</p>
      </div>
      <a className="btn btn-accent" href={target}
        onClick={() => { try { sessionStorage.setItem("rpt_autostart", target); } catch { /* 忽略 */ } }}>
        <Icons.sparkle size={18} />{tr("rpt_open")}
      </a>
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
