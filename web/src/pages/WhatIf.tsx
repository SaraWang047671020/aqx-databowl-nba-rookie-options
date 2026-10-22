import { useMemo, useState } from "react";
import Plot from "../components/Plot";
import { PageHero } from "../components/Shell";
import { Dot, Metric, Section, Table, useT, useUi, type Column } from "../components/ui";
import { sensitivityLine, type SweepRow } from "../lib/charts";
import { classify, DEFAULT_PARAMS, summarize, type Decided, type Light, type Params } from "../lib/engine";

const pp = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pp`;
const signed = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}`;
const tone = (now: number, was: number) => (now > was + 1e-9 ? "up" : now < was - 1e-9 ? "down" : undefined);

function Slider({ label, help, value, min, max, step, fmt, onChange }: {
  label: string; help: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div className="slider card">
      <div className="row"><span className="label">{label}</span><output>{fmt(value)}</output></div>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))} />
      <span className="caption" style={{ margin: 0 }}>{help}</span>
    </div>
  );
}

interface Change { now: Decided; was: Decided }

export default function WhatIf({ base }: { base: Decided[] }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const set = (k: keyof Params) => (v: number) => setParams({ ...params, [k]: v });

  const now = useMemo(() => classify(params), [params]);
  const b = summarize(base);
  const n = summarize(now);

  const { starPercentile, starMultiplier, rmseMultiplier } = params;
  const sweep: SweepRow[] = useMemo(() => {
    const rows: SweepRow[] = [];
    for (let i = 0; i <= 12; i++) {
      const m = 0.5 + i * 0.125;
      const s = summarize(classify({ rmseMultiplier: m, starPercentile, starMultiplier }));
      rows.push({ multiplier: m, red: s.red, net: s.net, hit: s.hitRate * 100 });
    }
    return rows;
  }, [starPercentile, starMultiplier]);

  const figs = useMemo(() => [
    sensitivityLine(sweep, "red", tr("wi_curve_red"), rmseMultiplier, lang, theme, ".0f"),
    sensitivityLine(sweep, "net", tr("wi_curve_net"), rmseMultiplier, lang, theme),
    sensitivityLine(sweep, "hit", tr("wi_curve_hit") + " (%)", rmseMultiplier, lang, theme, ".1f", [0, 105]),
  ], [sweep, rmseMultiplier, lang, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed: Change[] = now.map((p, i) => ({ now: p, was: base[i] })).filter((r) => r.now.color !== r.was.color);
  const light = (c: Light) => (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Dot color={c} />{tr(`color_${c}`)}</span>
  );
  const columns: Column<Change>[] = [
    { key: "cohort", label: tr("cohort"), value: (r) => r.now.year_start, num: true },
    { key: "pick", label: tr("pick"), value: (r) => r.now.DraftRank, num: true },
    { key: "player", label: tr("player"), value: (r) => r.now.Player },
    { key: "from", label: tr("wi_from"), value: (r) => tr(`color_${r.was.color}`), render: (r) => light(r.was.color) },
    { key: "to", label: tr("wi_to"), value: (r) => tr(`color_${r.now.color}`), render: (r) => light(r.now.color) },
    { key: "pred", label: tr("m_pred_ws"), value: (r) => Number(r.now.Pred_WS.toFixed(2)), num: true },
    { key: "actual", label: tr("m_actual_ws"), value: (r) => r.now.Year3_WS, num: true },
    { key: "dtw", label: tr("m_dtw"), value: (r) => Number(r.now.Dynamic_Truth_WS.toFixed(2)), num: true },
  ];

  return (
    <>
      <PageHero kicker={tr("nav_simulator")} title={tr("page_simulator_t")} desc={tr("page_simulator_d")} />
      <div className="container page-body">
      <h2 className="h3" style={{ margin: "0 0 4px" }}>{tr("wi_title")}</h2>
      <p className="caption">{tr("wi_caption")} {tr("wi_hint")}</p>
      <div className="grid-3">
        <Slider label={tr("wi_rmse")} help={tr("wi_rmse_help")} value={params.rmseMultiplier} min={0.5} max={2} step={0.05}
          fmt={(v) => `${v.toFixed(2)}×`} onChange={set("rmseMultiplier")} />
        <Slider label={tr("wi_pct")} help={tr("wi_pct_help")} value={params.starPercentile} min={0.5} max={0.95} step={0.05}
          fmt={(v) => `PR${Math.round(v * 100)}`} onChange={set("starPercentile")} />
        <Slider label={tr("wi_star")} help={tr("wi_star_help")} value={params.starMultiplier} min={1} max={2.5} step={0.1}
          fmt={(v) => `${v.toFixed(1)}×`} onChange={set("starMultiplier")} />
      </div>
      <div style={{ margin: "12px 0" }}>
        <button className="btn" onClick={() => setParams(DEFAULT_PARAMS)}>↺ {tr("wi_reset")}</button>
      </div>
      <div className="grid-4">
        <Metric label={tr("bt_kpi_split")} value={`${n.blue} / ${n.green} / ${n.red}`}
          delta={`${n.red - b.red >= 0 ? "+" : ""}${n.red - b.red} ${tr("color_red")}`} />
        <Metric label={tr("bt_kpi_hit")} value={`${(n.hitRate * 100).toFixed(1)}%`} delta={pp(n.hitRate - b.hitRate)}
          tone={tone(n.hitRate, b.hitRate)} />
        <Metric label={tr("bt_kpi_net")} value={signed(n.net)} delta={signed(n.net - b.net)} tone={tone(n.net, b.net)} />
        <Metric label={tr("accuracy_short")} value={`${(n.accuracy * 100).toFixed(1)}%`} delta={pp(n.accuracy - b.accuracy)}
          tone={tone(n.accuracy, b.accuracy)} />
      </div>
      <div className="grid-3" style={{ marginTop: 16 }}>
        {figs.map((f, i) => (
          <div className="card" key={i}><Plot figure={f} label={[tr("wi_curve_red"), tr("wi_curve_net"), tr("wi_curve_hit")][i]} /></div>
        ))}
      </div>
      <p className="caption" style={{ marginTop: 10 }}>{tr("wi_tradeoff")}</p>
      <Section title={tr("wi_changed")}>
        {changed.length === 0 ? <p className="caption">{tr("wi_none_changed")}</p> : <Table rows={changed} columns={columns} />}
      </Section>
      </div>
    </>
  );
}
