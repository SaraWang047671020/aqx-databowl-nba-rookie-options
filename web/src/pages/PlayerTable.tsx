import { Dot, Table, useT, type Column } from "../components/ui";
import type { Decided } from "../lib/engine";

export function playerColumns(tr: ReturnType<typeof useT>, opts: { cohort?: boolean; decision?: boolean; outcome?: boolean } = {}) {
  const cols: Column<Decided>[] = [];
  if (opts.cohort) cols.push({ key: "cohort", label: tr("cohort"), value: (p) => p.year_start, num: true });
  cols.push(
    { key: "pick", label: tr("pick"), value: (p) => p.DraftRank, num: true },
    { key: "player", label: tr("player"), value: (p) => p.Player },
  );
  if (opts.decision !== false) {
    cols.push(
      { key: "decision", label: tr("decision"), value: (p) => tr(`color_${p.color}`),
        render: (p) => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Dot color={p.color} />{tr(`color_${p.color}`)}</span> },
      { key: "stage", label: tr("col_stage"), value: (p) => tr(`stage_${p.stage}`) },
    );
  }
  cols.push(
    { key: "pred", label: tr("m_pred_ws"), value: (p) => Number(p.Pred_WS.toFixed(2)), num: true },
    { key: "actual", label: tr("m_actual_ws"), value: (p) => p.Year3_WS, num: true },
    { key: "dtw", label: tr("m_dtw"), value: (p) => Number(p.Dynamic_Truth_WS.toFixed(2)), num: true },
    { key: "ans", label: tr("m_ans"), value: (p) => Number(p.ans.toFixed(2)), num: true },
    { key: "correct", label: tr("col_correct"), value: (p) => (p.callCorrect === null ? null : p.callCorrect ? 1 : 0),
      render: (p) => (p.callCorrect === null ? "—" : p.callCorrect ? "✓" : "✕") },
  );
  if (opts.outcome) {
    cols.push({ key: "outcome", label: tr("outcome_label"),
      value: (p) => (p.Outcome_Label ? tr(`outcome_${p.Outcome_Label}`) : null) });
  }
  return cols;
}

export default function PlayerTable({ rows, ...opts }: { rows: Decided[]; cohort?: boolean; decision?: boolean; outcome?: boolean }) {
  const tr = useT();
  return <Table rows={rows} columns={playerColumns(tr, opts)} initialSort={opts.cohort ? "cohort" : "pick"} />;
}
