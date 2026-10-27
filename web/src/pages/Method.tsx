import { Icons, type IconName } from "../components/Art";
import { PageHero } from "../components/Shell";
import { LIGHT_VAR, TINT_VAR, useT } from "../components/ui";
import { href } from "../lib/router";
import type { Light } from "../lib/engine";
import modelData from "../data/models.json";

// 統一條件下的六模型比較（與「模型比較」頁同一份數據：scripts/compare_models.py）
interface ModelRow {
  model: string;
  holdout: { test_r2: number; test_rmse: number };
  backtest: { rmse: number; accuracy: number; net: number };
}
const MODELS = (modelData.order as string[]).map((n) => (modelData.models as ModelRow[]).find((m) => m.model === n)!);

const GATES: { stage: string; color: Light; cond: string; d: string }[] = [
  { stage: "profit", color: "blue", cond: "Net surplus > 0", d: "g1_d" },
  { stage: "buffer", color: "green", cond: "Net surplus ≥ −1.25 × RMSE", d: "g2_d" },
  { stage: "opportunity", color: "green", cond: "Forecast WS ≥ replacement bar", d: "g3_d" },
  { stage: "star", color: "green", cond: "Star Power ≥ cohort PR70  ∧  surplus ≥ −1.5 × buffer", d: "g4_d" },
  { stage: "reject", color: "red", cond: "—", d: "g5_d" },
];

function Chapter({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  const I = Icons[icon];
  return (
    <section className="chapter">
      <div className="chapter-head"><span className="step-icon"><I size={22} /></span><h2 className="h3">{title}</h2></div>
      {children}
    </section>
  );
}

export default function Method() {
  const tr = useT();
  return (
    <>
      <PageHero kicker={tr("nav_method")} title={tr("page_method_t")} desc={tr("page_method_d")} />
      <div className="container page-body narrow">
        <Chapter icon="decide" title={tr("m_timing_t")}>
          <p className="body-lg">{tr("m_timing_body")}</p>
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr><th>{tr("m_tt_option")}</th><th>{tr("m_tt_window")}</th><th className="num">{tr("m_tt_seen")}</th><th>{tr("m_tt_fit")}</th></tr>
              </thead>
              <tbody>
                <tr><td>{tr("m_tt_y3")}</td><td>{tr("m_tt_y3_w")}</td><td className="num">1</td><td className="muted">{tr("m_tt_y3_fit")}</td></tr>
                <tr className="row-pick"><td>{tr("m_tt_y4")}</td><td>{tr("m_tt_y4_w")}</td><td className="num">2</td><td>✓ {tr("m_tt_y4_fit")}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="caption" style={{ marginTop: 8 }}>{tr("m_timing_note")}</p>
        </Chapter>

        <Chapter icon="data" title={tr("m_data_t")}>
          <p className="body-lg">{tr("m_data_body")}</p>
        </Chapter>

        <Chapter icon="news" title={tr("m_nlp_t")}>
          <p className="body-lg">{tr("m_nlp_body")}</p>
        </Chapter>

        <Chapter icon="predict" title={tr("m_model_t")}>
          <p className="body-lg">{tr("m_model_body")}</p>
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>{tr("col_model")}</th><th className="num">{tr("mc_test_r2")}</th><th className="num">{tr("mc_test_rmse")}</th>
                  <th className="num">{tr("mc_bt_rmse")}</th><th className="num">{tr("mc_acc")}</th><th className="num">{tr("mc_net")}</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => (
                  <tr key={m.model} className={m.model === "Lasso" ? "row-pick" : undefined}>
                    <td>{m.model}{m.model === "Lasso" && <span className="tag">{tr("selected")}</span>}</td>
                    <td className="num">{m.holdout.test_r2.toFixed(3)}</td><td className="num">{m.holdout.test_rmse.toFixed(2)}</td>
                    <td className="num">{m.backtest.rmse.toFixed(2)}</td>
                    <td className="num">{(m.backtest.accuracy * 100).toFixed(1)}%</td>
                    <td className="num">{m.backtest.net >= 0 ? "+" : ""}{m.backtest.net.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption" style={{ marginTop: 8 }}>
            {tr("m_compare_caption")} <a href={href("models")}>{tr("page_models_t")} →</a>
          </p>
        </Chapter>

        <Chapter icon="value" title={tr("m_value_t")}>
          <p className="body-lg">{tr("m_value_body")}</p>
          <div className="formulas">
            <div className="formula"><span>{tr("m_formula_ws")}</span><code>Cap × 30 teams × BRI ÷ 1,230 games</code></div>
            <div className="formula"><span>{tr("m_formula_share")}</span><code>Forecast WS × value of 1 WS ÷ Cap × 100%</code></div>
            <div className="formula"><span>{tr("m_formula_surplus")}</span><code>Predicted value − rookie-scale cost</code></div>
            <div className="formula"><span>{tr("m_formula_bar")}</span><code>max(cost, 1.8%) ÷ value of 1 WS</code><small>{tr("m_formula_bar_note")}</small></div>
          </div>
        </Chapter>

        <Chapter icon="decide" title={tr("m_gates_t")}>
          <p className="body-lg">{tr("m_gates_body")}</p>
          <ol className="gate-flow">
            {GATES.map((g, i) => (
              <li key={g.stage} style={{ borderColor: LIGHT_VAR[g.color], background: TINT_VAR[g.color] }}>
                <span className="gate-n" style={{ background: LIGHT_VAR[g.color] }}>{i + 1}</span>
                <div>
                  <h3>{tr(`stage_${g.stage}`)} <small>→ {tr(`color_${g.color}`)}</small></h3>
                  <p>{tr(g.d)}</p>
                  {g.cond !== "—" && <code>{g.cond}</code>}
                </div>
              </li>
            ))}
          </ol>
        </Chapter>

        <section className="chapter">
          <h2 className="h3">{tr("m_caveats_t")}</h2>
          <ul className="caveats">
            {[5, 6, 7, 1, 2, 3, 4].map((i) => <li key={i}>{tr(`m_caveat_${i}`)}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
