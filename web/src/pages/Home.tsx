import { CourtBackdrop, Icons, type IconName } from "../components/Art";
import { Dot, LIGHT_VAR, useT } from "../components/ui";
import { MODEL_META, summarize, type Decided } from "../lib/engine";
import type { Selection } from "./Lookup";
import { href, type Route } from "../lib/router";

const STEPS: { icon: IconName; t: string; d: string }[] = [
  { icon: "data", t: "step_data_t", d: "step_data_d" },
  { icon: "predict", t: "step_predict_t", d: "step_predict_d" },
  { icon: "value", t: "step_value_t", d: "step_value_d" },
  { icon: "decide", t: "step_decide_t", d: "step_decide_d" },
];

const TOOLS: { route: Route; icon: IconName; t: string; d: string }[] = [
  { route: "player", icon: "search", t: "nav_player", d: "card_player_d" },
  { route: "cohort", icon: "grid", t: "nav_cohort", d: "card_cohort_d" },
  { route: "results", icon: "chart", t: "nav_results", d: "card_results_d" },
  { route: "simulator", icon: "sliders", t: "nav_simulator", d: "card_simulator_d" },
  { route: "new", icon: "plus", t: "nav_new", d: "card_new_d" },
];

const BOARD_YEAR = 2023;

/** 首頁右側：最新梯次前段順位的預測看板，點選可直接跳到球員頁 */
function CohortBoard({ decided, onPick }: { decided: Decided[]; onPick: (s: Selection) => void }) {
  const tr = useT();
  const rows = decided.filter((p) => p.year_start === BOARD_YEAR).sort((a, b) => a.DraftRank - b.DraftRank).slice(0, 8);
  const max = Math.max(...rows.map((p) => p.Pred_WS), 1);
  return (
    <div className="board">
      <div className="board-head">
        <span>{tr("board_title", { y: BOARD_YEAR })}</span>
        <span className="board-live">● {tr("fc_pred")}</span>
      </div>
      <ul>
        {rows.map((p) => (
          <li key={p.Player}>
            <a href={href("player")} onClick={() => onPick({ year: p.year_start, player: p.Player })}>
              <span className="board-pick">#{p.DraftRank}</span>
              <span className="board-name">{p.Player}</span>
              <span className="board-bar"><i style={{ width: `${Math.max(4, (p.Pred_WS / max) * 100)}%`, background: LIGHT_VAR[p.color] }} /></span>
              <span className="board-ws">{p.Pred_WS.toFixed(1)}</span>
              <Dot color={p.color} />
            </a>
          </li>
        ))}
      </ul>
      <p className="board-caption">{tr("board_caption")}</p>
    </div>
  );
}

export default function Home({ decided, onPick }: { decided: Decided[]; onPick: (s: Selection) => void }) {
  const tr = useT();
  const s = summarize(decided);

  return (
    <>
      <section className="hero-home">
        <CourtBackdrop variant="hero" />
        <div className="container hero-home-inner">
          <div className="hero-home-grid">
          <div>
          <span className="eyebrow eyebrow-pill">{tr("home_kicker")}</span>
          <h1 className="display">
            <span>{tr("home_title_1")}</span>
            <span className="accent">{tr("home_title_2")}</span>
          </h1>
          <p className="lead">{tr("home_sub")}</p>
          <div className="hero-ctas">
            <a className="btn btn-accent btn-lg" href={href("player")}>{tr("cta_try")} <Icons.arrow size={18} /></a>
            <a className="btn btn-ghost btn-lg" href={href("method")}>{tr("cta_method")}</a>
          </div>
          </div>
          <CohortBoard decided={decided} onPick={onPick} />
          </div>
        </div>
        <div className="container">
          <div className="stat-strip">
            <div><b>{s.n}</b><span>{tr("home_stat_players")}</span></div>
            <div><b>{MODEL_META.r2.toFixed(3)}</b><span>{tr("home_stat_r2")}</span></div>
            <div><b>{(s.hitRate * 100).toFixed(1)}%</b><span>{tr("home_stat_hit")}</span></div>
            <div><b>{s.FN}</b><span>{tr("home_stat_fn")}</span></div>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="container split">
          <div>
            <span className="eyebrow">{tr("problem_kicker")}</span>
            <h2 className="h2">{tr("problem_title")}</h2>
          </div>
          <p className="body-lg">{tr("problem_body")}</p>
        </div>
      </section>

      <section className="block block-alt">
        <div className="container">
          <span className="eyebrow">{tr("how_kicker")}</span>
          <h2 className="h2">{tr("how_title")}</h2>
          <ol className="steps">
            {STEPS.map((st, i) => {
              const I = Icons[st.icon];
              return (
                <li key={st.t} className="step">
                  <div className="step-top">
                    <span className="step-icon"><I size={22} /></span>
                    <span className="step-num">0{i + 1}</span>
                  </div>
                  <h3>{tr(st.t)}</h3>
                  <p>{tr(st.d)}</p>
                </li>
              );
            })}
          </ol>
          <a className="link-arrow" href={href("method")}>{tr("cta_full_method")} <Icons.arrow size={16} /></a>
        </div>
      </section>

      <section className="block">
        <div className="container">
          <span className="eyebrow">{tr("findings_kicker")}</span>
          <h2 className="h2">{tr("findings_title")}</h2>
          <div className="findings">
            <div className="finding">
              <b style={{ color: "var(--red)" }}>{s.redBelow} / {s.redLabeled}</b>
              <p>{tr("finding_hit_d")}</p>
            </div>
            <div className="finding">
              <b style={{ color: "var(--green)" }}>{s.FN}</b>
              <p>{tr("finding_fn_d")}</p>
            </div>
            <div className="finding">
              <b style={{ color: "var(--blue)" }}>+{s.net.toFixed(1)}</b>
              <p>{tr("finding_net_d")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="block block-alt">
        <div className="container">
          <span className="eyebrow">{tr("explore_kicker")}</span>
          <h2 className="h2">{tr("explore_title")}</h2>
          <div className="tool-grid">
            {TOOLS.map((tool) => {
              const I = Icons[tool.icon];
              return (
                <a key={tool.route} className="tool-card" href={href(tool.route)}>
                  <span className="tool-icon"><I size={22} /></span>
                  <h3>{tr(tool.t)}</h3>
                  <p>{tr(tool.d)}</p>
                  <span className="tool-open">{tr("open")} <Icons.arrow size={14} /></span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <CourtBackdrop variant="band" />
        <div className="container cta-band-inner">
          <div>
            <h2>{tr("cta_band_title")}</h2>
            <p>{tr("cta_band_body")}</p>
          </div>
          <a className="btn btn-accent btn-lg" href={href("player")}>{tr("cta_try")} <Icons.arrow size={18} /></a>
        </div>
      </section>
    </>
  );
}
