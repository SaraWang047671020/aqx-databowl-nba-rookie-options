"""
彙整 scripts/compare_models.py 的結果，輸出網站用的 web/src/data/models.json 與表格 data/model_comparison/summary_table.csv。
指標定義與研究相同（scripts/research_no_injury.py）：
- 止損命中率：具第三年 WS 的止損球員中，實際低於機會成本基準的比例
- 淨效益：正確止損避免的虧損 − 誤判止損犧牲的價值（以實際第三年 WS 換算薪資帽 %）
- 正確率：保留（藍＋綠）且達標，或止損且未達標
"""
import json
import os

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(DATA, "model_comparison")
WEB = os.path.join(HERE, "..", "web", "src", "data", "models.json")
ORDER = ["Lasso", "Ridge", "Elastic Net", "PLS", "Random Forest", "Gradient Boosting"]
COLOR = {"profit": "blue", "buffer": "green", "opportunity": "green", "star": "green", "reject": "red"}


def forecast_metrics(d):
    d = d[d["Year3_WS"].notna()]
    e = d["Year3_WS"] - d["Pred_WS"]
    return {"n": int(len(d)), "r2": float(1 - (e ** 2).sum() / ((d["Year3_WS"] - d["Year3_WS"].mean()) ** 2).sum()),
            "rmse": float(np.sqrt((e ** 2).mean())), "mae": float(e.abs().mean())}


def decision_metrics(d):
    color = d["stage"].map(COLOR)
    red = d[color == "red"]
    red_l = red[red["Year3_WS"].notna()]
    actual = red_l["Year3_WS"] * (30 * red_l["BRI_Factor"] / 1230 * 100) - red_l["Est_Cost_Percent"]
    lab = d[d["Year3_WS"].notna()]
    keep = lab["stage"].map(COLOR) != "red"
    good = lab["Year3_WS"] >= lab["Dynamic_Truth_WS"]
    return {
        "blue": int((color == "blue").sum()), "green": int((color == "green").sum()), "red": int((color == "red").sum()),
        "red_labeled": int(len(red_l)), "red_below": int((red_l["Year3_WS"] < red_l["Dynamic_Truth_WS"]).sum()),
        "hit_rate": float((red_l["Year3_WS"] < red_l["Dynamic_Truth_WS"]).mean()) if len(red_l) else None,
        "TP": int((keep & good).sum()), "FP": int((keep & ~good).sum()),
        "TN": int((~keep & ~good).sum()), "FN": int((~keep & good).sum()),
        "accuracy": float((keep == good).mean()),
        "net": float((-actual.clip(upper=0)).sum() - actual.clip(lower=0).sum()),
    }


def main():
    pred = pd.read_csv(os.path.join(OUT, "predictions.csv"))
    summ = json.load(open(os.path.join(OUT, "summary.json"), encoding="utf-8"))
    models, table = [], []
    for name in ORDER:
        d = pred[pred["model"] == name]
        bt, oot = d[d["year_start"] <= 2023], d[d["year_start"] == 2024]
        h = summ["holdout"][name]
        rec = {"model": name, "holdout": h, "buffer": 1.25 * h["test_rmse"],
               "backtest": {**forecast_metrics(bt), **decision_metrics(bt)},
               "oot": {**forecast_metrics(oot), **decision_metrics(oot)}}
        models.append(rec)
        table.append({"model": name, "test_r2": h["test_r2"], "test_rmse": h["test_rmse"], "cv_r2": h["cv_r2"],
                      **{f"bt_{k}": v for k, v in rec["backtest"].items()}, **{f"oot_{k}": v for k, v in rec["oot"].items()}})
    pd.DataFrame(table).to_csv(os.path.join(OUT, "summary_table.csv"), index=False)

    # 球員層級：各模型的預測與燈號；標記模型間是否對「保留 vs 止損」意見分歧
    players = []
    wide = pred.pivot_table(index=["Player", "year_start"], columns="model", values=["Pred_WS", "stage"], aggfunc="first")
    base = pred[pred["model"] == "Lasso"].set_index(["Player", "year_start"])
    for key in wide.index:
        stages = {m: wide.loc[key, ("stage", m)] for m in ORDER}
        reds = sum(COLOR[s] == "red" for s in stages.values())
        b = base.loc[key]
        players.append({
            "Player": key[0], "year_start": int(key[1]), "DraftRank": int(b["DraftRank"]),
            "Year3_WS": None if pd.isna(b["Year3_WS"]) else float(b["Year3_WS"]), "bar": float(b["Dynamic_Truth_WS"]),
            "pred": {m: round(float(wide.loc[key, ("Pred_WS", m)]), 3) for m in ORDER},
            "stage": stages, "declines": int(reds),
        })
    # 完整預測指標（scripts/model_metrics.py）：MSE、MAE、MedianAE、CV RMSE、Train–Test Gap、Spearman
    mfile = os.path.join(OUT, "holdout_metrics.json")
    if os.path.exists(mfile):
        full = json.load(open(mfile, encoding="utf-8"))
        for rec in models:
            rec["metrics"] = {k: v for k, v in full[rec["model"]].items() if k != "params"}
    out = {"order": ORDER, "models": models, "players": players,
           "research_lasso_mean_abs_diff": summ["research_lasso_check"]}
    json.dump(out, open(WEB, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    split = sum(1 for p in players if 0 < p["declines"] < 6 and p["year_start"] <= 2023)
    print(f"wrote {WEB}; {len(players)} players, {split} research-sample players with split calls")
    print(pd.DataFrame(table)[["model", "test_r2", "test_rmse", "bt_r2", "bt_rmse", "bt_blue", "bt_green", "bt_red",
                               "bt_hit_rate", "bt_FN", "bt_accuracy", "bt_net", "oot_r2", "oot_red", "oot_red_below"]]
          .round(3).to_string(index=False))


if __name__ == "__main__":
    main()
