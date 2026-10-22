import { useMemo, useState } from "react";
import Plot from "../components/Plot";
import { Section, useT, useUi } from "../components/ui";
import { cohortScatter } from "../lib/charts";
import { COHORT_YEARS, summarize, type Decided } from "../lib/engine";
import PlayerTable from "./PlayerTable";

export default function Cohort({ decided, year, setYear }: { decided: Decided[]; year: number; setYear: (y: number) => void }) {
  const { lang, theme } = useUi();
  const tr = useT();
  const [showTable, setShowTable] = useState(false);
  const d = useMemo(() => decided.filter((p) => p.year_start === year), [decided, year]);
  const figure = useMemo(() => cohortScatter(d, lang, theme), [d, lang, theme]);
  const s = summarize(d);
  return (
    <div>
      <div className="field" style={{ marginBottom: 10 }}>
        <span className="label">{tr("cohort")}</span>
        <div className="chips" role="group" aria-label={tr("cohort")}>
          {COHORT_YEARS.map((y) => (
            <button key={y} className="chip" aria-pressed={y === year} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>
      <p className="caption">{tr("cohort_option", { y: year, d: year - 1 })} · {tr("bt_kpi_split")}: {s.blue} / {s.green} / {s.red}</p>
      <Section title={tr("cohort_title")} caption={tr("cohort_caption")}>
        <div className="card"><Plot figure={figure} label={tr("cohort_title")} /></div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => setShowTable(!showTable)}>{tr(showTable ? "hide_table" : "show_table")}</button>
        </div>
        {showTable && <div style={{ marginTop: 12 }}><PlayerTable rows={d} /></div>}
      </Section>
    </div>
  );
}
