/**
 * 圖表（移植自 webapp/charts.py）。決策色以點形狀作為第二編碼（圓／菱形／叉），色覺辨識障礙者亦可區分。
 * 不使用雙 Y 軸；每張圖只有一個量尺。
 */
import type * as Plotly from "plotly.js";
import type { Figure } from "../components/Plot";
import type { Decided, Light } from "./engine";
import { t, type Lang } from "./i18n";
import { LIGHT_HEX as HEX, LIGHT_ORDER as ORDER, LIGHT_SYMBOL as SYMBOL, type ChartTheme } from "./theme";

function base(theme: ChartTheme, height: number, extra: Partial<Plotly.Layout> = {}): Partial<Plotly.Layout> {
  return {
    height,
    margin: { l: 56, r: 16, t: 36, b: 52 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, Noto Sans TC, system-ui, sans-serif", color: theme.text, size: 12 },
    legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "left", x: 0, font: { size: 12 } },
    hoverlabel: { align: "left", font: { family: "Inter, Noto Sans TC, sans-serif" } },
    ...extra,
  };
}

function axis(theme: ChartTheme, title: string, extra: Partial<Plotly.LayoutAxis> = {}): Partial<Plotly.LayoutAxis> {
  return {
    title: { text: title, font: { size: 12, color: theme.muted } },
    gridcolor: theme.grid, zeroline: false, linecolor: theme.grid, tickfont: { color: theme.muted },
    ...extra,
  };
}

const ws = (v: number | null) => (v === null ? "—" : v.toFixed(1));

/** 單一 WS 數線：預測值與 ±1 RMSE 區間、機會成本門檻、（若有）事後揭曉的實際值。 */
export function forecastStrip(p: Decided, rmse: number, lang: Lang, theme: ChartTheme, showActual: boolean): Figure {
  const pred = p.Pred_WS;
  const bar = p.Dynamic_Truth_WS;
  const hasActual = showActual && p.Year3_WS !== null;
  const pts = [pred - rmse, pred + rmse, bar, 0, ...(hasActual ? [p.Year3_WS as number] : [])];
  const lo = Math.min(...pts) - 0.7;
  const hi = Math.max(...pts) + 0.7;
  const data: Plotly.Data[] = [
    {
      x: [pred - rmse, pred + rmse], y: [0, 0], mode: "lines", type: "scatter",
      line: { color: HEX.blue, width: 2 }, name: t("fc_band", lang),
      hovertemplate: t("fc_band", lang) + ": %{x:.2f}<extra></extra>",
    },
    {
      x: [pred], y: [0], mode: "text+markers", type: "scatter", name: t("fc_pred", lang),
      text: [`<b>${pred.toFixed(2)}</b>`], textposition: "bottom center", textfont: { size: 15, color: theme.text },
      marker: { color: HEX[p.color], symbol: SYMBOL[p.color], size: 22, line: { width: 2, color: theme.surface } },
      hovertemplate: t("m_pred_ws", lang) + ": %{x:.2f}<extra></extra>",
    },
  ];
  if (hasActual) {
    data.push({
      x: [p.Year3_WS as number], y: [0], mode: "text+markers", type: "scatter", name: t("fc_actual", lang),
      text: [(p.Year3_WS as number).toFixed(1)], textposition: "top center", textfont: { size: 13, color: theme.text },
      marker: { color: "rgba(0,0,0,0)", symbol: "circle", size: 20, line: { width: 3, color: theme.actual } },
      hovertemplate: t("m_actual_ws", lang) + ": %{x:.1f}<extra></extra>",
    });
  }
  return {
    data,
    layout: base(theme, 230, {
      margin: { l: 16, r: 16, t: 44, b: 48 },
      xaxis: axis(theme, t("fc_axis", lang), { range: [lo, hi], zeroline: true, zerolinecolor: theme.muted, fixedrange: true }),
      yaxis: { visible: false, range: [-0.95, 1.05], fixedrange: true },
      shapes: [
        { type: "rect", x0: pred - rmse, x1: pred + rmse, y0: -0.32, y1: 0.32, fillcolor: theme.band, line: { width: 0 }, layer: "below" },
        { type: "line", x0: bar, x1: bar, y0: -0.58, y1: 0.58, line: { color: theme.neutral, width: 2, dash: "dash" } },
      ],
      annotations: [{
        x: bar, y: 0.64, text: `${t("fc_bar", lang)} ${bar.toFixed(2)}`, showarrow: false, yanchor: "bottom",
        font: { size: 12, color: theme.muted },
      }],
    }),
  };
}

function byColor(df: Decided[], color: Light) {
  return df.filter((p) => p.color === color);
}

/** X＝合約成本，Y＝預期價值；虛線上方為預期獲利。 */
export function cohortScatter(df: Decided[], lang: Lang, theme: ChartTheme): Figure {
  const hi = Math.max(...df.map((p) => Math.max(p.Est_Cost_Percent, p.Pred_Salary_Share_Percent))) * 1.05;
  const data: Plotly.Data[] = [{
    x: [0, hi], y: [0, hi], mode: "lines", type: "scatter", line: { color: theme.neutral, dash: "dash", width: 1.5 },
    name: t("breakeven", lang), hoverinfo: "skip",
  }];
  for (const color of ORDER) {
    const d = byColor(df, color);
    if (!d.length) continue;
    data.push({
      x: d.map((p) => p.Est_Cost_Percent), y: d.map((p) => p.Pred_Salary_Share_Percent),
      mode: "markers", type: "scatter", name: t(`color_${color}`, lang),
      marker: { color: HEX[color], symbol: SYMBOL[color], size: 12, line: { width: 1.5, color: theme.surface } },
      customdata: d.map((p) => [p.Player, p.DraftRank, p.Pred_WS.toFixed(2), ws(p.Year3_WS), t(`stage_${p.stage}`, lang)]) as unknown as Plotly.Datum[],
      hovertemplate: "<b>%{customdata[0]}</b> · #%{customdata[1]}<br>"
        + t("m_cost", lang) + ": %{x:.2f}<br>" + t("m_value", lang) + ": %{y:.2f}<br>"
        + t("m_pred_ws", lang) + ": %{customdata[2]}<br>" + t("m_actual_ws", lang) + ": %{customdata[3]}<br>"
        + t("col_stage", lang) + ": %{customdata[4]}<extra></extra>",
    });
  }
  const maxCost = Math.max(...df.map((p) => p.Est_Cost_Percent));
  return {
    data,
    layout: base(theme, 480, {
      xaxis: axis(theme, t("m_cost", lang), { range: [0, maxCost * 1.08] }),
      yaxis: axis(theme, t("m_value", lang)),
    }),
  };
}

/** 預測 vs 實際第三年 WS；對角線＝完美預測，灰帶＝±1 RMSE。 */
export function predVsActual(df: Decided[], rmse: number, lang: Lang, theme: ChartTheme): Figure {
  const d = df.filter((p) => p.Year3_WS !== null);
  const all = d.flatMap((p) => [p.Pred_WS, p.Year3_WS as number]);
  const lo = Math.min(...all, 0) - 0.5;
  const hi = Math.max(...all) + 1;
  const data: Plotly.Data[] = [
    {
      x: [lo, hi, hi, lo], y: [lo + rmse, hi + rmse, hi - rmse, lo - rmse], mode: "lines", type: "scatter",
      fill: "toself", fillcolor: theme.grid, line: { width: 0 }, name: t("fc_band", lang), hoverinfo: "skip",
    },
    {
      x: [lo, hi], y: [lo, hi], mode: "lines", type: "scatter", line: { color: theme.neutral, dash: "dash", width: 1.5 },
      name: t("perfect_line", lang), hoverinfo: "skip",
    },
  ];
  for (const color of ORDER) {
    const c = byColor(d, color);
    if (!c.length) continue;
    data.push({
      x: c.map((p) => p.Pred_WS), y: c.map((p) => p.Year3_WS as number), mode: "markers", type: "scatter",
      name: t(`color_${color}`, lang),
      marker: { color: HEX[color], symbol: SYMBOL[color], size: 9, line: { width: 1, color: theme.surface } },
      customdata: c.map((p) => [p.Player, p.year_start, p.DraftRank]) as unknown as Plotly.Datum[],
      hovertemplate: "<b>%{customdata[0]}</b> · %{customdata[1]} #%{customdata[2]}<br>"
        + t("m_pred_ws", lang) + ": %{x:.2f}<br>" + t("m_actual_ws", lang) + ": %{y:.1f}<extra></extra>",
    });
  }
  return {
    data,
    layout: base(theme, 470, {
      xaxis: axis(theme, t("m_pred_ws", lang), { range: [lo, hi] }),
      yaxis: axis(theme, t("m_actual_ws", lang), { range: [lo, hi] }),
    }),
  };
}

export function yearlyStacked(df: Decided[], lang: Lang, theme: ChartTheme): Figure {
  const years = [...new Set(df.map((p) => p.year_start))].sort();
  const data: Plotly.Data[] = ORDER.map((color) => ({
    x: years.map(String),
    y: years.map((y) => df.filter((p) => p.year_start === y && p.color === color).length),
    type: "bar", name: t(`color_${color}`, lang),
    marker: { color: HEX[color], line: { width: 1.5, color: theme.surface } },
    hovertemplate: "%{x}: %{y}<extra>" + t(`color_${color}`, lang) + "</extra>",
  }));
  return {
    data,
    layout: base(theme, 360, {
      barmode: "stack", bargap: 0.35,
      legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "left", x: 0, traceorder: "normal" },
      xaxis: axis(theme, t("cohort", lang), { type: "category", gridcolor: "rgba(0,0,0,0)" }),
      yaxis: axis(theme, ""),
    }),
  };
}

export interface SweepRow { multiplier: number; red: number; net: number; hit: number }

/** 單一指標對容錯倍數的曲線；目前設定以垂直線標示（不使用雙 Y 軸）。 */
export function sensitivityLine(sweep: SweepRow[], key: "red" | "net" | "hit", title: string, current: number,
  lang: Lang, theme: ChartTheme, fmt = ".1f", yRange?: [number, number]): Figure {
  return {
    data: [{
      x: sweep.map((r) => r.multiplier), y: sweep.map((r) => r[key]), mode: "lines+markers", type: "scatter",
      line: { color: HEX.blue, width: 2 }, marker: { size: 8, color: HEX.blue },
      hovertemplate: t("wi_curve_x", lang) + " %{x:.2f}<br>" + title + ": %{y:" + fmt + "}<extra></extra>",
      showlegend: false,
    }],
    layout: base(theme, 290, {
      title: { text: title, font: { size: 14, color: theme.text }, x: 0, xanchor: "left" },
      margin: { l: 48, r: 12, t: 44, b: 48 },
      xaxis: axis(theme, t("wi_curve_x", lang), { gridcolor: "rgba(0,0,0,0)" }),
      yaxis: axis(theme, "", { range: yRange }),
      shapes: [{ type: "line", x0: current, x1: current, yref: "paper", y0: 0, y1: 1, line: { color: theme.neutral, dash: "dot", width: 1.5 } }],
      annotations: [{ x: current, yref: "paper", y: 1, text: t("wi_current", lang), showarrow: false, yanchor: "bottom", font: { size: 11, color: theme.muted } }],
    }),
  };
}
