/**
 * 即時預測頁：2025 梯次（2024 年選秀）在第四年選擇權期限（2026/11/2）前的模型建議。
 */
import { useMemo } from "react";
import { Icons } from "../components/Art";
import Plot from "../components/Plot";
import { PageHero } from "../components/Shell";
import { Dot, Metric, Section, Table, useT, useUi, type Column } from "../components/ui";
import { cohortScatter } from "../lib/charts";
import { LIVE_YEAR, summarize, TEAM_DECISIONS_AS_OF, type Decided } from "../lib/engine";
import { href } from "../lib/router";

// 第四年選擇權期限：2026/10/31 為週六，順延至 11/2（美東時間當天結束）
export const LIVE_DEADLINE = new Date("2026-11-03T05:00:00Z");

export function daysLeft(now = new Date()): number {
  return Math.ceil((LIVE_DEADLINE.getTime() - now.getTime()) / 86_400_000);
}

export default function Live({ decided }: { decided: Decided[] }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const live = useMemo(() => decided.filter((p) => p.year_start === LIVE_YEAR).sort((a, b) => a.DraftRank - b.DraftRank), [decided]);
  const s = summarize(live);
  const scatter = useMemo(() => cohortScatter(live, lang, theme), [live, lang, theme]);
  const left = daysLeft();
  const announced = live.filter((p) => p.team_decision && p.team_decision !== "pending");
  const sameCall = (p: Decided) => (p.team_decision === "exercised") === (p.color !== "red");
  const agree = announced.filter(sameCall);

  const columns: Column<Decided>[] = [
    { key: "pick", label: tr("pick"), value: (p) => p.DraftRank, num: true },
    { key: "player", label: tr("player"), value: (p) => p.Player,
      render: (p) => <a href={href("report", p.year_start, p.Player)}>{p.Player}</a> },
    { key: "decision", label: tr("decision"), value: (p) => tr(`color_${p.color}`),
      render: (p) => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Dot color={p.color} />{tr(`color_${p.color}`)}</span> },
    { key: "stage", label: tr("col_stage"), value: (p) => tr(`stage_${p.stage}`) },
    { key: "pred", label: tr("m_pred_ws"), value: (p) => Number(p.Pred_WS.toFixed(2)), num: true },
    { key: "dtw", label: tr("m_dtw"), value: (p) => Number(p.Dynamic_Truth_WS.toFixed(2)), num: true },
    { key: "ans", label: tr("m_ans"), value: (p) => Number(p.ans.toFixed(2)), num: true },
    { key: "team", label: tr("col_team"), value: (p) => tr(`td_${p.team_decision ?? "pending"}`),
      render: (p) => {
        const d = p.team_decision ?? "pending";
        if (d === "pending") return <span className="muted">{tr("td_pending")}</span>;
        return <b style={{ color: d === "exercised" ? "var(--green)" : "var(--red)" }}>{d === "exercised" ? "✓ " : "✕ "}{tr(`td_${d}`)}</b>;
      } },
    { key: "agree", label: tr("col_agree"), value: (p) => (p.team_decision && p.team_decision !== "pending" ? (sameCall(p) ? 1 : 0) : null),
      render: (p) => (!p.team_decision || p.team_decision === "pending" ? "—"
        : sameCall(p) ? <span className="agree-chip yes">✓</span> : <span className="agree-chip no">≠</span>) },
  ];

  return (
    <>
      <PageHero kicker={tr("nav_live")} title={tr("page_live_t")} desc={tr("page_live_d")}>
        <div className="countdown">
          <div>
            <span className="label">{tr("live_deadline")}</span>
            <b>{tr("live_deadline_v")}</b>
          </div>
          <div className="countdown-days">{left > 0 ? tr("live_days", { n: left }) : tr("live_passed")}</div>
        </div>
        <p className="hero-note">{tr("live_deadline_note")}</p>
      </PageHero>

      <div className="container page-body">
        <div className="grid-4">
          <Metric label={tr("bt_kpi_split")} value={`${s.blue} / ${s.green} / ${s.red}`} />
          <Metric label={tr("color_red")} value={String(s.red)} />
          <Metric label={tr("live_progress")} value={tr("live_progress_v", { k: announced.length, n: live.length })} />
          <Metric label={tr("live_agree")} value={`${agree.length} / ${announced.length}`} />
        </div>
        <p className="caption" style={{ marginTop: 8 }}>{tr("live_asof", { d: TEAM_DECISIONS_AS_OF })}</p>

        <Section title={tr("live_table_t")} caption={tr("live_table_d")}>
          <Table rows={live} columns={columns} initialSort="pick" />
          <p className="caption" style={{ marginTop: 10 }}>{tr("live_followup")}</p>
        </Section>

        <Section title={tr("cohort_title")} caption={tr("cohort_caption")}>
          <div className="card"><Plot figure={scatter} label={tr("cohort_title")} /></div>
        </Section>

        <section className="section">
          <div className="notice info"><Icons.data size={18} />{tr("live_note_data")}</div>
        </section>
      </div>
    </>
  );
}
