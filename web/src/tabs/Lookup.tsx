import { useMemo, useState } from "react";
import { DecisionCard, Reality, ReportButton, useT, Waterfall } from "../components/ui";
import { COHORT_YEARS, type Decided } from "../lib/engine";

export interface Selection { year: number; player: string }

export default function Lookup({ decided, sel, setSel }: {
  decided: Decided[]; sel: Selection; setSel: (s: Selection) => void;
}) {
  const tr = useT();
  const [query, setQuery] = useState("");
  const cohort = useMemo(
    () => decided.filter((p) => p.year_start === sel.year).sort((a, b) => a.DraftRank - b.DraftRank),
    [decided, sel.year]);
  const p = cohort.find((x) => x.Player === sel.player) ?? cohort[0];
  const label = (x: Decided) => `${x.Player} · ${x.year_start} #${x.DraftRank}`;
  const byLabel = useMemo(() => new Map(decided.map((x) => [label(x), x])), [decided]);

  function onSearch(value: string) {
    setQuery(value);
    const hit = byLabel.get(value);
    if (hit) {
      setSel({ year: hit.year_start, player: hit.Player });
      setQuery("");
    }
  }

  return (
    <div>
      <div className="controls" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) minmax(0,1.4fr)" }}>
        <div className="field">
          <label htmlFor="cohort">{tr("cohort")}</label>
          <select id="cohort" className="select" value={sel.year}
            onChange={(e) => {
              const year = Number(e.target.value);
              const first = decided.filter((x) => x.year_start === year).sort((a, b) => a.DraftRank - b.DraftRank)[0];
              setSel({ year, player: first.Player });
            }}>
            {COHORT_YEARS.map((y) => <option key={y} value={y}>{tr("cohort_option", { y, d: y - 1 })}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="player">{tr("player")}</label>
          <select id="player" className="select" value={p.Player}
            onChange={(e) => setSel({ year: sel.year, player: e.target.value })}>
            {cohort.map((x) => <option key={x.Player} value={x.Player}>#{x.DraftRank} · {x.Player}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="search">{tr("search_player")}</label>
          <input id="search" className="input" list="all-players" value={query} placeholder="Garland, Ayton…"
            onChange={(e) => onSearch(e.target.value)} autoComplete="off" />
          <datalist id="all-players">
            {decided.map((x) => <option key={label(x)} value={label(x)} />)}
          </datalist>
        </div>
      </div>
      <p className="caption">{tr("cohort_note")}</p>

      <DecisionCard p={p} />
      <div className="grid-2">
        <Waterfall p={p} />
        <div>
          <Reality p={p} />
          <ReportButton p={p} />
        </div>
      </div>
    </div>
  );
}
