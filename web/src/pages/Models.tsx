/**
 * 模型比較頁：六種模型在統一條件下的「預測 → 五層決策」結果（資料由 scripts/compare_models.py、summarize_models.py 產生）。
 */
import type * as Plotly from "plotly.js";
import { useMemo } from "react";
import MetricsTable from "../components/MetricsTable";
import Plot, { type Figure } from "../components/Plot";
import { PageHero } from "../components/Shell";
import { Dot, Section, Table, useT, useUi, type Column } from "../components/ui";
import data from "../data/models.json";
import { LIGHT_HEX } from "../lib/theme";

interface ModelRec {
  model: string;
  holdout: { test_r2: number; test_rmse: number; test_mae: number; cv_r2: number };
  buffer: number;
  backtest: Metrics;
  oot: Metrics;
}
interface Metrics {
  n: number; r2: number; rmse: number; mae: number;
  blue: number; green: number; red: number; red_labeled: number; red_below: number; hit_rate: number | null;
  TP: number; FP: number; TN: number; FN: number; accuracy: number; net: number;
}
interface PlayerRec {
  Player: string; year_start: number; DraftRank: number; Year3_WS: number | null; bar: number;
  pred: Record<string, number>; stage: Record<string, string>; declines: number;
}

const ORDER = data.order as string[];
const MODELS = data.models as ModelRec[];
const PLAYERS = data.players as PlayerRec[];
const SELECTED = "Lasso";
const STAGE_COLOR: Record<string, "blue" | "green" | "red"> = {
  profit: "blue", buffer: "green", opportunity: "green", star: "green", reject: "red",
};

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

/** 每欄最佳值（higherBetter 決定方向） */
function best(get: (m: ModelRec) => number | null, higherBetter: boolean) {
  const vals = MODELS.map(get).filter((v): v is number => v !== null);
  return higherBetter ? Math.max(...vals) : Math.min(...vals);
}

export default function Models() {
  const { lang, theme } = useUi();
  const tr = useT();

  const splitFig: Figure = useMemo(() => ({
    data: (["blue", "green", "red"] as const).map((c) => ({
      type: "bar", orientation: "h", name: tr(`color_${c}`),
      y: ORDER, x: ORDER.map((m) => MODELS.find((r) => r.model === m)!.backtest[c]),
      marker: { color: LIGHT_HEX[c], line: { width: 1.5, color: theme.surface } },
      hovertemplate: "%{y}: %{x}<extra>" + tr(`color_${c}`) + "</extra>",
    })) as Plotly.Data[],
    layout: {
      barmode: "stack", height: 320, margin: { l: 130, r: 16, t: 36, b: 40 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "Inter, Noto Sans TC, sans-serif", color: theme.text, size: 12 },
      legend: { orientation: "h", y: 1.12, x: 0, traceorder: "normal" },
      xaxis: { gridcolor: theme.grid, tickfont: { color: theme.muted } },
      yaxis: { autorange: "reversed", tickfont: { color: theme.text } },
    },
  }), [lang, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const accFig: Figure = useMemo(() => {
    const v = ORDER.map((m) => MODELS.find((r) => r.model === m)!.backtest.rmse);
    return {
      data: [{
        type: "bar", orientation: "h", y: ORDER, x: v, text: v.map((x) => x.toFixed(2)), textposition: "outside",
        marker: { color: ORDER.map((m) => (m === SELECTED ? "#f07c22" : LIGHT_HEX.blue)) },
        hovertemplate: "%{y}: %{x:.3f} WS<extra></extra>", showlegend: false,
      }] as Plotly.Data[],
      layout: {
        height: 320, margin: { l: 130, r: 40, t: 20, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
        font: { family: "Inter, Noto Sans TC, sans-serif", color: theme.text, size: 12 },
        xaxis: { gridcolor: theme.grid, tickfont: { color: theme.muted }, range: [0, Math.max(...v) * 1.2], title: { text: "RMSE (WS)", font: { color: theme.muted } } },
        yaxis: { autorange: "reversed", tickfont: { color: theme.text } },
      },
    };
  }, [lang, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const research = PLAYERS.filter((p) => p.year_start <= 2023);
  const split = research.filter((p) => p.declines > 0 && p.declines < ORDER.length)
    .sort((a, b) => b.declines - a.declines || a.year_start - b.year_start || a.DraftRank - b.DraftRank);

  const bests = {
    r2: best((m) => m.holdout.test_r2, true), rmse: best((m) => m.holdout.test_rmse, false),
    btRmse: best((m) => m.backtest.rmse, false), hit: best((m) => m.backtest.hit_rate, true),
    fn: best((m) => m.backtest.FN, false), acc: best((m) => m.backtest.accuracy, true),
    net: best((m) => m.backtest.net, true), ootR2: best((m) => m.oot.r2, true),
  };
  const B = ({ on, children }: { on: boolean; children: React.ReactNode }) => (on ? <b>{children}</b> : <>{children}</>);

  const playerCols: Column<PlayerRec>[] = [
    { key: "cohort", label: tr("cohort"), value: (p) => p.year_start, num: true },
    { key: "pick", label: tr("pick"), value: (p) => p.DraftRank, num: true },
    { key: "player", label: tr("player"), value: (p) => p.Player },
    { key: "declines", label: tr("mc_declines"), value: (p) => p.declines, num: true },
    ...ORDER.map((m) => ({
      key: m, label: m, value: (p: PlayerRec) => p.pred[m],
      render: (p: PlayerRec) => (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }} title={tr(`stage_${p.stage[m]}`)}>
          <Dot color={STAGE_COLOR[p.stage[m]]} />{p.pred[m].toFixed(1)}
        </span>
      ),
    })),
    { key: "outcome", label: tr("mc_outcome"), value: (p) => (p.Year3_WS === null ? null : p.Year3_WS - p.bar),
      render: (p) => (p.Year3_WS === null ? "—"
        : <span style={{ color: p.Year3_WS >= p.bar ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
          {p.Year3_WS.toFixed(1)} / {p.bar.toFixed(2)} {p.Year3_WS >= p.bar ? `✓ ${tr("mc_reached")}` : `✕ ${tr("mc_missed")}`}
        </span>) },
  ];

  return (
    <>
      <PageHero kicker={tr("nav_models")} title={tr("page_models_t")} desc={tr("page_models_d")} />
      <div className="container page-body">
        <Section title={tr("mc_metrics_t")} caption={tr("mc_metrics_d")}>
          <MetricsTable />
        </Section>

        <Section title={tr("mc_table_t")} caption={tr("mc_table_d")}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("mc_model")}</th><th className="num">{tr("mc_test_r2")}</th><th className="num">{tr("mc_test_rmse")}</th>
                  <th className="num">{tr("mc_bt_rmse")}</th><th className="num">{tr("mc_split")}</th><th className="num">{tr("mc_hit")}</th>
                  <th className="num">{tr("mc_fn")}</th><th className="num">{tr("mc_acc")}</th><th className="num">{tr("mc_net")}</th>
                  <th className="num">{tr("mc_oot_r2")}</th><th className="num">{tr("mc_oot_hit")}</th>
                </tr>
              </thead>
              <tbody>
                {ORDER.map((name) => {
                  const m = MODELS.find((r) => r.model === name)!;
                  return (
                    <tr key={name} className={name === SELECTED ? "row-pick" : undefined}>
                      <td>{name}{name === SELECTED && <span className="tag">{tr("mc_selected")}</span>}</td>
                      <td className="num"><B on={m.holdout.test_r2 === bests.r2}>{m.holdout.test_r2.toFixed(3)}</B></td>
                      <td className="num"><B on={m.holdout.test_rmse === bests.rmse}>{m.holdout.test_rmse.toFixed(2)}</B></td>
                      <td className="num"><B on={m.backtest.rmse === bests.btRmse}>{m.backtest.rmse.toFixed(2)}</B></td>
                      <td className="num">{m.backtest.blue} / {m.backtest.green} / {m.backtest.red}</td>
                      <td className="num"><B on={m.backtest.hit_rate === bests.hit}>{pct(m.backtest.hit_rate)}</B>
                        <span className="muted"> ({m.backtest.red_below}/{m.backtest.red_labeled})</span></td>
                      <td className="num"><B on={m.backtest.FN === bests.fn}>{m.backtest.FN}</B></td>
                      <td className="num"><B on={m.backtest.accuracy === bests.acc}>{pct(m.backtest.accuracy)}</B></td>
                      <td className="num"><B on={m.backtest.net === bests.net}>{m.backtest.net >= 0 ? "+" : ""}{m.backtest.net.toFixed(1)}</B></td>
                      <td className="num"><B on={m.oot.r2 === bests.ootR2}>{m.oot.r2.toFixed(3)}</B></td>
                      <td className="num">{m.oot.red_below}/{m.oot.red_labeled}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="caption" style={{ marginTop: 8 }}>
            {tr("mc_note", { d: (data.research_lasso_mean_abs_diff as number).toFixed(2) })}{" "}
            <a href="https://github.com/SaraWang047671020/aqx-databowl-nba-rookie-options/blob/main/data/model_comparison/summary_table.csv"
              target="_blank" rel="noreferrer">{tr("mc_download")}</a>
          </p>
        </Section>

        <div className="grid-2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
          <Section title={tr("mc_split_t")} caption={tr("mc_split_d")}>
            <div className="card"><Plot figure={splitFig} label={tr("mc_split_t")} /></div>
          </Section>
          <Section title={tr("mc_acc_t")} caption={tr("mc_acc_d")}>
            <div className="card"><Plot figure={accFig} label={tr("mc_acc_t")} /></div>
          </Section>
        </div>

        <Section title={tr("mc_agree_t")}
          caption={tr("mc_agree_d", { a: research.length - split.length, n: research.length, k: split.length })}>
          <Table rows={split} columns={playerCols} initialSort="declines" />
        </Section>

        <Section title={tr("mc_why_t")}>
          <p className="body-lg">{tr("mc_why_d")}</p>
        </Section>
      </div>
    </>
  );
}
