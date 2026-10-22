// 逐人比對瀏覽器端決策引擎與 Python 版（webapp/decision_engine.py）的結果。
// 執行：npm run verify
import expected from "../src/data/expected.json" with { type: "json" };
import { classify, evaluateManual, summarize } from "../src/lib/engine.ts";

const decided = classify();
let mismatch = 0;
for (const p of decided) {
  const want = (expected.stages as Record<string, string>)[`${p.year_start}|${p.Player}`];
  if (want !== p.stage) {
    mismatch++;
    console.log("MISMATCH", p.year_start, p.Player, p.stage, "expected", want);
  }
}
console.log(`stages: ${decided.length - mismatch}/${decided.length} match`);

const s = summarize(decided);
const e = expected.summary as Record<string, number>;
const pairs: [string, number, number][] = [
  ["blue", s.blue, e.blue], ["green", s.green, e.green], ["red", s.red, e.red],
  ["red_below", s.redBelow, e.red_below], ["hit_rate", s.hitRate, e.hit_rate], ["net", s.net, e.net],
  ["avoided", s.avoided, e.avoided], ["TP", s.TP, e.TP], ["FP", s.FP, e.FP], ["TN", s.TN, e.TN],
  ["FN", s.FN, e.FN], ["accuracy", s.accuracy, e.accuracy], ["red_mae", s.redMae, e.red_mae],
];
let bad = mismatch;
for (const [k, got, want] of pairs) {
  const ok = Math.abs(got - want) < 1e-9;
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${k}: ${got} (python ${want})`);
}
for (const c of expected.manual) {
  const r = evaluateManual(c.name, c.stats as unknown as Record<string, number>, c.pick, c.year);
  const ok = Math.abs(r.Pred_WS - c.pred_ws) < 1e-9 && Math.abs(r.ans - c.ans) < 1e-9 && r.stage === c.stage
    && Math.abs(r.floor - c.floor) < 1e-12 && Math.abs(r.Dynamic_Truth_WS - c.dtw) < 1e-9 && (r.Star_Power_Index ?? null) === (c.spi ?? null);
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} manual ${c.name}: pred ${r.Pred_WS.toFixed(4)} stage ${r.stage} bar ${r.Dynamic_Truth_WS} (python ${c.dtw}, ${c.pred_ws.toFixed(4)} ${c.stage})`);
}
const tight = summarize(classify({ rmseMultiplier: 0.5, starPercentile: 0.7, starMultiplier: 1.5 }));
const tightOk = tight.red === 68;
if (!tightOk) bad++;
console.log(`${tightOk ? "ok " : "BAD"} sensitivity 0.5x buffer: ${tight.red} declines (research 68)`);
if (bad) { console.log(`${bad} problems`); process.exit(1); }
console.log("ALL MATCH");
