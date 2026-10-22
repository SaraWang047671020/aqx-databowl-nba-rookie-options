import { Icons, type IconName } from "../components/Art";
import { PageHero } from "../components/Shell";
import { LIGHT_VAR, TINT_VAR, useT } from "../components/ui";
import type { Light } from "../lib/engine";

// 原始模型比較（README「Model comparison」表）
const MODELS = [
  { name: "Lasso", cv: 0.5562, test: 0.5756, rmse: 1.5411, gap: -0.2112, pick: true },
  { name: "Elastic Net", cv: 0.5562, test: 0.5788, rmse: 1.5487, gap: -0.2098 },
  { name: "PLS", cv: 0.5486, test: 0.5816, rmse: 1.5436, gap: -0.1852 },
  { name: "Ridge", cv: 0.553, test: 0.591, rmse: 1.5696, gap: -0.1357 },
  { name: "Gradient Boost", cv: 0.5718, test: 0.5626, rmse: 1.6916, gap: 0.1775 },
  { name: "Random Forest", cv: 0.557, test: 0.528, rmse: 1.7572, gap: 0.2411 },
];

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
                  <th>{tr("col_model")}</th><th className="num">{tr("col_cv_r2")}</th><th className="num">{tr("col_test_r2")}</th>
                  <th className="num">RMSE</th><th className="num">{tr("col_gap")}</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m) => (
                  <tr key={m.name} className={m.pick ? "row-pick" : undefined}>
                    <td>{m.name}{m.pick && <span className="tag">{tr("selected")}</span>}</td>
                    <td className="num">{m.cv.toFixed(4)}</td><td className="num">{m.test.toFixed(4)}</td>
                    <td className="num">{m.rmse.toFixed(4)}</td><td className="num">{m.gap.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption" style={{ marginTop: 8 }}>{tr("m_compare_caption")}</p>
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
            {[1, 2, 3, 4].map((i) => <li key={i}>{tr(`m_caveat_${i}`)}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
