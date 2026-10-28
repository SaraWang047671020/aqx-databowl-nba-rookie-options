import { useMemo } from "react";
import Plot from "../components/Plot";
import { PageHero } from "../components/Shell";
import { CallLabel, callText, Metric, Section, Table, useT, useUi, type Column } from "../components/ui";
import { predVsActual, yearlyStacked } from "../lib/charts";
import { MODEL_META, OOT_YEAR, RMSE, summarize, type Decided } from "../lib/engine";
import PlayerTable from "./PlayerTable";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

/** 2024 梯次時間外驗證：模型只用更早梯次訓練，第三年（2025-26）實際產能與球團決定皆已知 */
function OutOfTime({ all }: { all: Decided[] }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const c = useMemo(() => all.filter((p) => p.year_start === OOT_YEAR), [all]);
  const seen = c.filter((p) => p.Year3_WS !== null);
  const err = seen.map((p) => (p.Year3_WS as number) - p.Pred_WS);
  const mean = seen.reduce((a, p) => a + (p.Year3_WS as number), 0) / seen.length;
  const sse = err.reduce((a, e) => a + e * e, 0);
  const sst = seen.reduce((a, p) => a + ((p.Year3_WS as number) - mean) ** 2, 0);
  const r2 = 1 - sse / sst;
  const rmse = Math.sqrt(sse / seen.length);
  const s = summarize(c);
  const scatter = useMemo(() => predVsActual(c, RMSE, lang, theme), [c, lang, theme]);

  const comparable = c.filter((p) => p.team_decision && p.team_decision !== "n/a");
  const agree = comparable.filter((p) => (p.team_decision === "exercised") === (p.color !== "red"));
  const disagree = comparable.filter((p) => (p.team_decision === "exercised") !== (p.color !== "red"));
  const metBar = (p: Decided) => p.Year3_WS !== null && (p.Year3_WS as number) >= p.Dynamic_Truth_WS;
  const cols: Column<Decided>[] = [
    { key: "pick", label: tr("pick"), value: (p) => p.DraftRank, num: true },
    { key: "player", label: tr("player"), value: (p) => p.Player },
    { key: "model", label: tr("oot_model_call"), value: (p) => callText(p, tr),
      render: (p) => <CallLabel p={p} /> },
    { key: "team", label: tr("team_decision"), value: (p) => tr(`td_${p.team_decision}`) },
    { key: "actual", label: tr("m_actual_ws"), value: (p) => p.Year3_WS, num: true },
    { key: "bar", label: tr("m_dtw"), value: (p) => Number(p.Dynamic_Truth_WS.toFixed(2)), num: true },
    { key: "who", label: tr("oot_who"), value: (p) => ((p.color !== "red") === metBar(p) ? 1 : 0),
      render: (p) => ((p.color !== "red") === metBar(p)
        ? <b style={{ color: "var(--blue)" }}>{tr("oot_model")}</b>
        : <b style={{ color: "var(--muted)" }}>{tr("oot_team")}</b>) },
  ];

  return (
    <Section title={tr("oot_t")} caption={tr("oot_d")}>
      <div className="grid-4">
        <Metric label={tr("oot_r2", { n: seen.length })} value={r2.toFixed(3)} delta={`${tr("bt_acc_r2")} ${MODEL_META.r2.toFixed(3)}`} />
        <Metric label={tr("oot_rmse")} value={`${rmse.toFixed(2)} WS`} delta={`${tr("bt_acc_rmse")} ${MODEL_META.rmse.toFixed(2)}`} />
        <Metric label={tr("oot_hit")} value={`${s.redBelow} / ${s.redLabeled}`} />
        <Metric label={tr("oot_fn")} value={String(s.FN)} />
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: "minmax(0,3fr) minmax(0,2fr)", marginTop: 16 }}>
        <div className="card"><Plot figure={scatter} label={tr("oot_t")} /></div>
        <div>
          <h3 style={{ marginTop: 0 }}>{tr("oot_vs_team_t")}</h3>
          <p className="caption">{tr("oot_vs_team_d", { a: agree.length, n: comparable.length })}</p>
          <Table rows={disagree} columns={cols} initialSort="pick" />
          <p className="caption" style={{ marginTop: 8 }}>{tr("oot_note")}</p>
        </div>
      </div>
    </Section>
  );
}

export default function Backtest({ decided, all }: { decided: Decided[]; all: Decided[] }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const s = summarize(decided);
  const yearly = useMemo(() => yearlyStacked(decided, lang, theme), [decided, lang, theme]);
  const scatter = useMemo(() => predVsActual(decided, RMSE, lang, theme), [decided, lang, theme]);
  const seen = decided.filter((p) => p.Year3_WS !== null);
  const errs = seen.map((p) => Math.abs((p.Year3_WS as number) - p.Pred_WS));
  const within = errs.filter((e) => e <= RMSE).length;
  const red = decided.filter((p) => p.color === "red");

  return (
    <>
      <PageHero kicker={tr("nav_results")} title={tr("page_results_t")} desc={tr("page_results_d")} />
      <div className="container page-body">
      <div className="grid-4">
        <Metric label={tr("bt_kpi_split")} value={`${s.blue} / ${s.green} / ${s.red}`} />
        <Metric label={tr("bt_kpi_hit")} value={pct(s.hitRate)} help={tr("bt_kpi_hit_help", { b: s.redBelow, n: s.redLabeled })} />
        <Metric label={tr("bt_kpi_net")} value={`+${s.net.toFixed(1)}`} help={tr("bt_kpi_net_help", { a: s.avoided, s: s.sacrificed })} />
        <Metric label={tr("bt_kpi_mae")} value={`${s.redMae.toFixed(2)} WS`} help={tr("bt_kpi_mae_help")} />
      </div>

      <div className="grid-2">
        <Section title={tr("bt_by_year")}>
          <div className="card"><Plot figure={yearly} label={tr("bt_by_year")} /></div>
        </Section>
        <Section title={tr("bt_confusion")} caption={tr("bt_confusion_caption")}>
          <div className="grid-3" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
            <Metric label={tr("cm_keep_good")} value={String(s.TP)} />
            <Metric label={tr("cm_keep_bad")} value={String(s.FP)} />
            <Metric label={tr("cm_decline_bad")} value={String(s.TN)} />
            <Metric label={tr("cm_decline_good")} value={String(s.FN)} />
          </div>
          <p style={{ fontWeight: 700, marginTop: 12 }}>{tr("accuracy", { a: s.accuracy })}</p>
        </Section>
      </div>

      <Section title={tr("bt_acc_title")} caption={tr("bt_acc_caption")}>
        <div className="grid-2" style={{ gridTemplateColumns: "minmax(0,3fr) minmax(0,1fr)" }}>
          <div className="card"><Plot figure={scatter} label={tr("bt_acc_title")} /></div>
          <div className="stack">
            <Metric label={tr("bt_acc_within")} value={pct(within / seen.length)}
              help={tr("bt_acc_within_help", { k: within, n: seen.length })} />
            <Metric label={tr("bt_acc_mae")} value={`${(errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(2)} WS`} />
            <Metric label={tr("bt_acc_r2")} value={MODEL_META.r2.toFixed(3)} />
            <Metric label={tr("bt_acc_rmse")} value={`${MODEL_META.rmse.toFixed(2)} WS`} />
          </div>
        </div>
      </Section>

      <OutOfTime all={all} />

      <Section title={tr("bt_red_list")}>
        <PlayerTable rows={red} cohort decision={false} outcome />
      </Section>
      </div>
    </>
  );
}
