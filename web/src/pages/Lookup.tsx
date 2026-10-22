import { useMemo, useState } from "react";
import { PageHero } from "../components/Shell";
import { DecisionCard, Dot, LIGHT_VAR, Reality, ReportButton, TINT_VAR, useT, Waterfall } from "../components/ui";
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
    <>
      <PageHero kicker={tr("nav_player")} title={tr("page_player_t")} desc={tr("page_player_d")}>
        <div className="hero-controls">
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
        <p className="hero-note">{tr("cohort_note")}</p>
      </PageHero>

      <div className="container page-body">
        <div className="player-head">
          <div className="player-avatar" style={{ background: TINT_VAR[p.color], color: LIGHT_VAR[p.color] }}>
            #{p.DraftRank}
          </div>
          <div>
            <h2 className="player-name">{p.Player}</h2>
            <p className="player-meta">{tr("cohort_option", { y: p.year_start, d: p.year_start - 1 })} · {tr("pick_n", { n: p.DraftRank })}</p>
          </div>
          <span className="badge-light" style={{ background: TINT_VAR[p.color], color: LIGHT_VAR[p.color], borderColor: LIGHT_VAR[p.color] }}>
            <Dot color={p.color} />{tr(`color_${p.color}`)}
          </span>
        </div>

        <DecisionCard p={p} />
        <div className="grid-2">
          <Waterfall p={p} />
          <div>
            <Reality p={p} />
            <ReportButton p={p} />
          </div>
        </div>
      </div>
    </>
  );
}
