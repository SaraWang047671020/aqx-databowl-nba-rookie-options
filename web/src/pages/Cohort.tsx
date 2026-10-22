import { useMemo, useState } from "react";
import Plot from "../components/Plot";
import { PageHero } from "../components/Shell";
import { Metric, Section, useT, useUi } from "../components/ui";
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
    <>
      <PageHero kicker={tr("nav_cohort")} title={tr("page_cohort_t")} desc={tr("page_cohort_d")}>
        <div className="chips chips-dark" role="group" aria-label={tr("cohort")}>
          {COHORT_YEARS.map((y) => (
            <button key={y} className="chip" aria-pressed={y === year} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        <p className="hero-note">{tr("cohort_note")}</p>
      </PageHero>
      <div className="container page-body">
      <div className="grid-4">
        <Metric label={tr("cohort")} value={String(year)} delta={tr("cohort_option", { y: year, d: year - 1 })} />
        <Metric label={tr("color_blue")} value={String(s.blue)} />
        <Metric label={tr("color_green")} value={String(s.green)} />
        <Metric label={tr("color_red")} value={String(s.red)} />
      </div>
      <Section title={tr("cohort_title")} caption={tr("cohort_caption")}>
        <div className="card"><Plot figure={figure} label={tr("cohort_title")} /></div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => setShowTable(!showTable)}>{tr(showTable ? "hide_table" : "show_table")}</button>
        </div>
        {showTable && <div style={{ marginTop: 12 }}><PlayerTable rows={d} /></div>}
      </Section>
      </div>
    </>
  );
}
