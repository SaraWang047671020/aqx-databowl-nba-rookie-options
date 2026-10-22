import type * as Plotly from "plotly.js";
import { useEffect, useRef, useState } from "react";

export interface Figure {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
}

// Plotly 體積大（約 1.4 MB gzip），延後載入讓頁面文字與數字先出現
let plotly: Promise<typeof import("plotly.js-dist-min").default> | null = null;
const loadPlotly = () => (plotly ??= import("plotly.js-dist-min").then((m) => m.default));

/** 輕量 Plotly 包裝：figure 改變時以 Plotly.react 更新，卸載時釋放。 */
export default function Plot({ figure, label }: { figure: Figure; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadPlotly().then((P) => {
      if (!alive || !ref.current) return;
      P.react(ref.current, figure.data, figure.layout, { displayModeBar: false, responsive: true });
      setReady(true);
    });
    return () => { alive = false; };
  }, [figure]);
  useEffect(() => {
    const el = ref.current;
    return () => { if (el && plotly) plotly.then((P) => P.purge(el)); };
  }, []);
  return (
    <div ref={ref} className="plot" role="img" aria-label={label}
      style={ready ? undefined : { height: figure.layout.height ?? 300, background: "var(--surface-2)", borderRadius: 10 }} />
  );
}
