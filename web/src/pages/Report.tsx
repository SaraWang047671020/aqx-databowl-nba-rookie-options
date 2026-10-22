/**
 * 完整球探報告頁：網站計算的數字／圖表 + AI 撰寫的分析段落，可分享連結與列印成 PDF。
 * AI 只拿得到「做決策當下」的資訊；第三年實際表現只在最後的「事後驗證」區塊由網站顯示。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CourtBackdrop, Icons } from "../components/Art";
import Plot from "../components/Plot";
import { Dot, Forecast, gateRule, LIGHT_VAR, Metric, Reality, Table, TINT_VAR, useT, useUi, Waterfall, type Column } from "../components/ui";
import { cohortScatter } from "../lib/charts";
import { cohortRank, comparables, MODEL_META, RMSE, waterfallSteps, type Decided } from "../lib/engine";
import { plain } from "../lib/i18n";
import { href } from "../lib/router";

interface AiReport {
  headline: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  contract_view: string;
  decision_rationale: string;
  comparables_insight: string;
  what_would_change: string[];
  bottom_line: string;
}
type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; report: AiReport; model: string; generatedAt: string }
  | { status: "error"; message: string };

// 同一位球員、同一語言的報告在這次瀏覽中只生成一次（重新生成除外），避免重複花費 API 費用
const cache = new Map<string, AiState & { status: "done" }>();
function loadCached(key: string) {
  if (cache.has(key)) return cache.get(key)!;
  try {
    const raw = sessionStorage.getItem(`rpt:${key}`);
    if (raw) return JSON.parse(raw) as AiState & { status: "done" };
  } catch { /* 忽略 */ }
  return null;
}
function saveCached(key: string, value: AiState & { status: "done" }) {
  cache.set(key, value);
  try { sessionStorage.setItem(`rpt:${key}`, JSON.stringify(value)); } catch { /* 忽略 */ }
}

function Sec({ n, title, ai, children }: { n: number; title: string; ai?: boolean; children: ReactNode }) {
  const tr = useT();
  return (
    <section className="rpt-sec">
      <header>
        <span className="rpt-n">{String(n).padStart(2, "0")}</span>
        <h2>{title}</h2>
        {ai && <span className="ai-tag"><Icons.sparkle size={12} />{tr("rpt_ai_tag")}</span>}
      </header>
      {children}
    </section>
  );
}

/** AI 段落：載入中顯示骨架，尚未生成時顯示提示 */
function AiText({ state, children }: { state: AiState; children: (r: AiReport) => ReactNode }) {
  const tr = useT();
  if (state.status === "done") return <>{children(state.report)}</>;
  if (state.status === "loading") return <div className="skeleton"><i /><i /><i style={{ width: "60%" }} /></div>;
  return <p className="caption" style={{ margin: 0 }}>{tr("rpt_ai_pending")}</p>;
}

export default function Report({ p, decided, isManual }: { p: Decided | null; decided: Decided[]; isManual: boolean }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const key = p ? `${p.year_start}|${p.Player}|${p.Pred_WS.toFixed(4)}|${lang}` : "";
  const [ai, setAi] = useState<AiState>(() => (key && loadCached(key)) || { status: "idle" });
  const [copied, setCopied] = useState(false);
  const initFor = useRef("");

  const comps = useMemo(() => (p ? comparables(p, decided, 5, !isManual) : []), [p, decided, isManual]);
  const rank = useMemo(() => (p ? cohortRank(p, decided) : { rank: 0, size: 0 }), [p, decided]);
  const cohort = useMemo(() => (p ? decided.filter((x) => x.year_start === p.year_start && x.Player !== p.Player) : []), [p, decided]);
  const scatter = useMemo(() => (p ? cohortScatter(cohort, lang, theme, p, 420) : null), [cohort, p, lang, theme]);

  async function generate() {
    if (!p) return;
    // 數字先四捨五入成網頁上顯示的位數，AI 引用時才會和畫面一致
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const r4 = (v: number | null) => (v === null ? null : Math.round(v * 10000) / 10000);
    setAi({ status: "loading" });
    const steps = waterfallSteps(p);
    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang, stage: p.stage, player: p.Player, cohort: p.year_start, draft_pick: p.DraftRank, is_manual: isManual,
          forecast: r2(p.Pred_WS), range_low: r2(p.Pred_WS - RMSE), range_high: r2(p.Pred_WS + RMSE), rmse: r2(RMSE),
          cohort_rank: rank.rank, cohort_size: rank.size,
          value_pct: r2(p.Pred_Salary_Share_Percent), cost_pct: r2(p.Est_Cost_Percent), surplus: r2(p.ans),
          replacement_bar: r2(p.Dynamic_Truth_WS), buffer: r2(p.buffer), spi: r4(p.Star_Power_Index), spi_floor: r4(p.floor),
          has_sentiment: p.hasSentiment,
          // 只送四道防護網；「止損」是全部未通過的結果，由 stage 表達
          gates: steps.filter((s) => s.stage !== "reject").map((s) => ({ gate: tr(`stage_${s.stage}`), rule: gateRule(s, p, tr), reached: s.reached, passed: s.passed })),
          comparables: comps.map((c) => ({
            player: c.Player, cohort: c.year_start, pick: c.DraftRank, forecast: r2(c.Pred_WS), actual: c.Year3_WS,
            own_bar: r2(c.Dynamic_Truth_WS), reached_bar: (c.Year3_WS as number) >= c.Dynamic_Truth_WS,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.report) throw new Error(data.error || tr("rpt_error"));
      const done = { status: "done" as const, report: data.report as AiReport, model: data.model, generatedAt: data.generated_at };
      saveCached(key, done);
      setAi(done);
    } catch (e) {
      setAi({ status: "error", message: e instanceof Error ? e.message : tr("rpt_error") });
    }
  }

  // 從「開啟完整球探報告」按鈕進來時自動開始生成
  useEffect(() => {
    // 每位球員只初始化一次（React 開發模式會重複執行 effect，避免把生成中的狀態重設）
    if (!p || initFor.current === key) return;
    initFor.current = key;
    const cached = loadCached(key);
    if (cached) { setAi(cached); return; }
    setAi({ status: "idle" });
    let auto = false;
    try {
      auto = sessionStorage.getItem("rpt_autostart") === window.location.hash;
      sessionStorage.removeItem("rpt_autostart");
    } catch { /* 忽略 */ }
    if (auto) generate();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) {
    return (
      <div className="container page-body narrow">
        <div className="notice info" style={{ marginTop: 40 }}>{tr(isManual ? "rpt_manual_missing" : "rpt_not_found")}</div>
        <a className="link-arrow" href={href(isManual ? "new" : "player")}>{tr(isManual ? "nav_new" : "rpt_back")} <Icons.arrow size={16} /></a>
      </div>
    );
  }

  const date = ai.status === "done" ? new Date(ai.generatedAt) : new Date();
  const dateText = date.toLocaleDateString(lang === "zh" ? "zh-TW" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const compCols: Column<Decided>[] = [
    { key: "player", label: tr("player"), value: (c) => c.Player },
    { key: "cohort", label: tr("cohort"), value: (c) => c.year_start, num: true },
    { key: "pick", label: tr("pick"), value: (c) => c.DraftRank, num: true },
    { key: "pred", label: tr("m_pred_ws"), value: (c) => Number(c.Pred_WS.toFixed(2)), num: true },
    { key: "actual", label: tr("m_actual_ws"), value: (c) => c.Year3_WS, num: true },
    { key: "bar", label: tr("m_dtw"), value: (c) => Number(c.Dynamic_Truth_WS.toFixed(2)), num: true },
    { key: "out", label: tr("rpt_outcome"), value: (c) => ((c.Year3_WS as number) >= c.Dynamic_Truth_WS ? 1 : 0),
      render: (c) => ((c.Year3_WS as number) >= c.Dynamic_Truth_WS
        ? <span style={{ color: "var(--green)", fontWeight: 700 }}>✓ {tr("rpt_reached")}</span>
        : <span style={{ color: "var(--red)", fontWeight: 700 }}>✕ {tr("rpt_missed")}</span>) },
  ];
  let n = 0;

  return (
    <>
      <section className="page-hero rpt-hero">
        <CourtBackdrop variant="band" />
        <div className="container page-hero-inner">
          <span className="eyebrow">{tr("rpt_kicker")} · Rookie Option Lab</span>
          <h1>{p.Player}</h1>
          <p>
            {isManual ? `${tr("rpt_hypo")} · ` : ""}
            {tr("cohort_option", { y: p.year_start, d: p.year_start - 1 })} · {tr("pick_n", { n: p.DraftRank })} · {tr("rpt_prepared", { d: dateText })}
          </p>
          <div className="rpt-verdict" style={{ background: TINT_VAR[p.color], borderColor: LIGHT_VAR[p.color] }}>
            <Dot color={p.color} />{plain(tr(`verdict_${p.stage}`))}
          </div>
          <div className="hero-ctas no-print">
            <button className="btn btn-accent" onClick={() => window.print()}><Icons.chart size={18} />{tr("rpt_print")}</button>
            <button className="btn btn-ghost" onClick={() => {
              navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
            }}>{tr(copied ? "rpt_copied" : "rpt_copy")}</button>
            {ai.status === "done" && <button className="btn btn-ghost" onClick={generate}>↻ {tr("rpt_regen")}</button>}
          </div>
        </div>
      </section>

      <div className="container page-body rpt-doc">
        {ai.status === "idle" && (
          <div className="rpt-generate no-print">
            <p>{tr("rpt_asof")}</p>
            <button className="btn btn-primary btn-lg" onClick={generate}><Icons.sparkle size={18} />{tr("rpt_generate")}</button>
          </div>
        )}
        {ai.status === "loading" && <div className="notice info no-print"><span className="spinner spinner-dark" />{tr("rpt_generating")}</div>}
        {ai.status === "error" && (
          <div className="notice bad no-print">{ai.message}
            <button className="btn" style={{ marginLeft: "auto" }} onClick={generate}>↻ {tr("rpt_regen")}</button>
          </div>
        )}

        <Sec n={++n} title={tr("rpt_sec_summary")} ai>
          <AiText state={ai}>{(r) => (
            <>
              <p className="rpt-headline">{r.headline}</p>
              <p className="rpt-body">{r.summary}</p>
            </>
          )}</AiText>
          <p className="caption" style={{ marginTop: 10 }}>{tr("rpt_asof")}</p>
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_forecast")}>
          <Forecast p={p} showActual={false} />
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_contract")} ai>
          <div className="grid-3">
            <Metric label={tr("m_value")} value={`${p.Pred_Salary_Share_Percent.toFixed(2)}%`} />
            <Metric label={tr("m_cost")} value={`${p.Est_Cost_Percent.toFixed(2)}%`} />
            <Metric label={tr("m_ans")} value={`${p.ans >= 0 ? "+" : ""}${p.ans.toFixed(2)}`} />
          </div>
          <div style={{ marginTop: 14 }}>
            <AiText state={ai}>{(r) => <p className="rpt-body">{r.contract_view}</p>}</AiText>
          </div>
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_sw")} ai>
          <AiText state={ai}>{(r) => (
            <div className="sw-grid">
              <div className="sw sw-good">
                <h3>{tr("rpt_strengths")}</h3>
                <ul>{r.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
              <div className="sw sw-bad">
                <h3>{tr("rpt_concerns")}</h3>
                <ul>{r.concerns.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            </div>
          )}</AiText>
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_decision")} ai>
          <AiText state={ai}>{(r) => <p className="rpt-body" style={{ marginBottom: 14 }}>{r.decision_rationale}</p>}</AiText>
          <Waterfall p={p} title={false} />
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_cohort")}>
          <div className="grid-3" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            <Metric label={tr("rpt_rank")} value={tr("rpt_rank_v", { r: rank.rank, n: rank.size })} />
            <Metric label={tr("rpt_spi_vs")}
              value={`${(p.Star_Power_Index ?? 0).toFixed(3)} / ${p.floor.toFixed(3)}`}
              delta={p.hasSentiment ? undefined : plain(tr("no_sentiment"))} />
          </div>
          {scatter && <div className="card" style={{ marginTop: 14 }}><Plot figure={scatter} label={tr("rpt_sec_cohort")} /></div>}
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_comps")} ai>
          <p className="caption">{tr("rpt_comps_caption")}</p>
          {comps.length ? <Table rows={comps} columns={compCols} initialSort="pred" /> : <p className="caption">{tr("rpt_comps_none")}</p>}
          <div style={{ marginTop: 14 }}>
            <AiText state={ai}>{(r) => <p className="rpt-body">{r.comparables_insight}</p>}</AiText>
          </div>
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_change")} ai>
          <AiText state={ai}>{(r) => <ul className="rpt-list">{r.what_would_change.map((x, i) => <li key={i}>{x}</li>)}</ul>}</AiText>
        </Sec>

        <Sec n={++n} title={tr("rpt_sec_bottom")} ai>
          <div className="rpt-bottom" style={{ borderColor: LIGHT_VAR[p.color], background: TINT_VAR[p.color] }}>
            <AiText state={ai}>{(r) => <p>{r.bottom_line}</p>}</AiText>
          </div>
        </Sec>

        {!isManual && (
          <Sec n={++n} title={tr("rpt_sec_hindsight")}>
            <p className="caption">{tr("rpt_hindsight_d")}</p>
            <Reality p={p} title={false} />
          </Sec>
        )}

        <section className="rpt-sec rpt-method">
          <h2>{tr("rpt_sec_method")}</h2>
          <p className="caption">{tr("rpt_method_d", { r2: MODEL_META.r2.toFixed(3), m: ai.status === "done" ? ai.model : "OpenAI" })}</p>
        </section>
      </div>
    </>
  );
}
