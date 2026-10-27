/**
 * 六種模型的完整預測指標表（同一個 80/20 測試集），研究方法頁與模型比較頁共用。
 */
import data from "../data/models.json";
import { useT } from "./ui";

export interface FullMetrics {
  cv_r2: number; train_r2: number; test_r2: number; gap: number; mse: number; rmse: number; mae: number;
  median_ae: number; cv_rmse_mean: number; cv_rmse_std: number; spearman: number;
}
interface Rec { model: string; metrics?: FullMetrics }

const ORDER = data.order as string[];
const RECS = data.models as Rec[];
const SELECTED = "Lasso";

type Col = { key: string; label: string; get: (m: FullMetrics) => number; fmt: (m: FullMetrics) => string; higher: boolean };

export default function MetricsTable() {
  const tr = useT();
  const rows = ORDER.map((n) => RECS.find((r) => r.model === n)!).filter((r) => r.metrics);
  if (!rows.length) return null;
  const cols: Col[] = [
    { key: "cv_r2", label: tr("mc_cv_r2"), get: (m) => m.cv_r2, fmt: (m) => m.cv_r2.toFixed(4), higher: true },
    { key: "test_r2", label: tr("mc_test_r2"), get: (m) => m.test_r2, fmt: (m) => m.test_r2.toFixed(4), higher: true },
    { key: "mse", label: tr("mc_mse"), get: (m) => m.mse, fmt: (m) => m.mse.toFixed(4), higher: false },
    { key: "rmse", label: tr("mc_rmse"), get: (m) => m.rmse, fmt: (m) => m.rmse.toFixed(4), higher: false },
    { key: "mae", label: tr("mc_mae"), get: (m) => m.mae, fmt: (m) => m.mae.toFixed(4), higher: false },
    { key: "medae", label: tr("mc_medae"), get: (m) => m.median_ae, fmt: (m) => m.median_ae.toFixed(4), higher: false },
    { key: "cv_rmse", label: tr("mc_cv_rmse"), get: (m) => m.cv_rmse_mean,
      fmt: (m) => `${m.cv_rmse_mean.toFixed(4)} ± ${m.cv_rmse_std.toFixed(4)}`, higher: false },
    { key: "gap", label: tr("mc_gap"), get: (m) => Math.abs(m.gap), fmt: (m) => m.gap.toFixed(4), higher: false },
    { key: "spearman", label: tr("mc_spearman"), get: (m) => m.spearman, fmt: (m) => m.spearman.toFixed(4), higher: true },
  ];
  const best = Object.fromEntries(cols.map((c) => {
    const v = rows.map((r) => c.get(r.metrics!));
    return [c.key, c.higher ? Math.max(...v) : Math.min(...v)];
  }));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{tr("mc_model")}</th>
            {cols.map((c) => <th key={c.key} className="num">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.model} className={r.model === SELECTED ? "row-pick" : undefined}>
              <td>{r.model}{r.model === SELECTED && <span className="tag">{tr("selected")}</span>}</td>
              {cols.map((c) => {
                const isBest = c.get(r.metrics!) === best[c.key];
                return <td key={c.key} className="num">{isBest ? <b>{c.fmt(r.metrics!)}</b> : c.fmt(r.metrics!)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
