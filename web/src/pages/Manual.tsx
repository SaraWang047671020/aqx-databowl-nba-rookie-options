import { useState } from "react";
import { PageHero } from "../components/Shell";
import { DecisionCard, ReportLink, useT, Waterfall } from "../components/ui";
import example from "../data/example.json";
import { ALL_YEARS, evaluateManual, type Decided } from "../lib/engine";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const GROUPS: [string, string[], number][] = [
  ["manual_shooting", ["FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P%", "2PA", "FT", "FTA", "FT%", "3PAr", "FTr", "TS%", "eFG%"], 0.01],
  ["manual_box", ["ORB", "ORB%", "DRB", "DRB%", "TRB", "TRB%", "AST", "AST%", "STL", "STL%", "BLK", "BLK%", "TOV", "TOV%", "PF", "PTS"], 0.1],
  ["manual_adv", ["PER", "USG%", "OWS", "DWS", "WS", "WS/48", "OBPM", "DBPM", "BPM", "VORP"], 0.1],
];

type Form = { name: string; year: number; pick: number; pos: string; stats: Record<string, string> };

const EMPTY: Form = { name: "", year: ALL_YEARS[ALL_YEARS.length - 1], pick: 15, pos: "PG", stats: {} };

function exampleForm(): Form {
  const s = example.stats as Record<string, number | boolean | null>;
  const pos = POSITIONS.find((p) => s[`Pos_${p}`]) ?? "PG";
  const stats: Record<string, string> = {};
  for (const [, fields] of GROUPS) for (const f of fields) stats[f] = s[f] === null || s[f] === undefined ? "" : String(s[f]);
  return { name: example.name, year: example.year, pick: example.pick, pos, stats };
}

export default function Manual({ result, setResult }: { result: Decided | null; setResult: (r: Decided | null) => void }) {
  const tr = useT();
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(tr("manual_need_name"));
      return;
    }
    setError("");
    const stats: Record<string, number> = {};
    for (const [k, v] of Object.entries(form.stats)) if (v.trim() !== "" && !Number.isNaN(Number(v))) stats[k] = Number(v);
    for (const p of POSITIONS) stats[`Pos_${p}`] = p === form.pos ? 1 : 0;
    setResult(evaluateManual(form.name.trim(), stats, form.pick, form.year));
  }

  return (
    <>
      <PageHero kicker={tr("nav_new")} title={tr("page_new_t")} desc={tr("page_new_d")} />
      <div className="container page-body">
      <p className="caption">{tr("manual_caption")} {tr("manual_blank")}</p>
      <p className="caption">{tr("manual_model_note")}</p>
      <form className="card stack" onSubmit={submit}>
        <div className="grid-3">
          <div className="field">
            <label htmlFor="m-name">{tr("manual_name")}</label>
            <input id="m-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="m-year">{tr("manual_compare")}</label>
            <select id="m-year" className="select" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}>
              {ALL_YEARS.map((y) => <option key={y} value={y}>{tr("cohort_option", { y, d: y - 1 })}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-pick">{tr("manual_pick")}</label>
            <input id="m-pick" className="input" type="number" min={1} max={30} value={form.pick}
              onChange={(e) => setForm({ ...form, pick: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })} />
          </div>
        </div>
        <div className="field">
          <span className="label">{tr("manual_pos")}</span>
          <div className="chips" role="radiogroup" aria-label={tr("manual_pos")}>
            {POSITIONS.map((p) => (
              <button type="button" key={p} className="chip" aria-pressed={form.pos === p} onClick={() => setForm({ ...form, pos: p })}>{p}</button>
            ))}
          </div>
        </div>
        {GROUPS.map(([title, fields, step], gi) => (
          <details className="fold" key={title} open={gi === 0}>
            <summary>{tr(title)}</summary>
            <div className="stat-grid">
              {fields.map((f) => (
                <div className="field" key={f}>
                  <label htmlFor={`m-${f}`}>{f}</label>
                  <input id={`m-${f}`} className="input" type="number" step={step} inputMode="decimal"
                    value={form.stats[f] ?? ""} placeholder="—"
                    onChange={(e) => setForm({ ...form, stats: { ...form.stats, [f]: e.target.value } })} />
                </div>
              ))}
            </div>
          </details>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary">{tr("manual_submit")}</button>
          <button type="button" className="btn" onClick={() => { setForm(exampleForm()); setResult(null); }}>{tr("manual_example")}</button>
          <button type="button" className="btn" onClick={() => { setForm(EMPTY); setResult(null); setError(""); }}>{tr("manual_reset")}</button>
        </div>
        {error && <div className="notice bad">{error}</div>}
      </form>

      {result && (
        <div className="section">
          <DecisionCard p={result} showActual={false} />
          {result.Star_Power_Index !== null && (
            <p className="caption" style={{ marginTop: 10 }}>{tr("manual_spi_found", { v: result.Star_Power_Index })}</p>
          )}
          <Waterfall p={result} />
          <ReportLink year="new" />
        </div>
      )}
      </div>
    </>
  );
}
