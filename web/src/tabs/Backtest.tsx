import { useMemo } from "react";
import Plot from "../components/Plot";
import { Metric, Section, useT, useUi } from "../components/ui";
import { predVsActual, yearlyStacked } from "../lib/charts";
import { MODEL_META, RMSE, summarize, type Decided } from "../lib/engine";
import PlayerTable from "./PlayerTable";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function Backtest({ decided }: { decided: Decided[] }) {
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
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "1.2rem" }}>{tr("bt_title")}</h2>
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

      <Section title={tr("bt_red_list")}>
        <PlayerTable rows={red} cohort decision={false} outcome />
      </Section>
    </div>
  );
}
