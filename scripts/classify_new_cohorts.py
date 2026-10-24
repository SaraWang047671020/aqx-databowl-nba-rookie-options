"""
2024、2025 梯次套用研究的五層瀑布流（規則與 scripts/research_no_injury.py 相同），並與實際結果比對。

- 2024 梯次：時間外驗證。模型只用 2023 梯次以前的資料訓練；第三年（2025-26）實際 WS 已知；
  另對照球團 2025 年 10 月的第四年選擇權實際決定（Hoops Rumors 整理）
- 2025 梯次：即時預測。第四年選擇權期限為 2026 年 11 月 2 日（10/31 為週六，順延至下一個工作日）

輸出：data/new_cohorts_decisions.csv
"""
import os

import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
RMSE = 1.7858204103190793  # 正式模型測試集 RMSE（與研究相同）
BUFFER = 1.25 * RMSE

# 球團實際的第四年（2026/27）選擇權決定，期限 2025-10-31
# 來源：https://www.hoopsrumors.com/2025/08/decisions-on-2026-27-rookie-scale-team-options.html
TEAM_DECISION_2024 = {
    **{p: "exercised" for p in [
        "Victor Wembanyama", "Brandon Miller", "Scoot Henderson", "Amen Thompson", "Ausar Thompson",
        "Anthony Black", "Bilal Coulibaly", "Jarace Walker", "Taylor Hendricks", "Cason Wallace",
        "Dereck Lively II", "Gradey Dick", "Jordan Hawkins", "Keyonte George", "Jaime Jaquez Jr.",
        "Brandin Podziemski", "Cam Whitmore", "Noah Clowney", "Kris Murray", "Marcus Sasser",
        "Ben Sheppard", "Brice Sensabaugh", "Julian Strawther"]},
    "Jett Howard": "declined", "Kobe Brown": "declined",
    "Kobe Bufkin": "waived", "Dariq Whitehead": "waived", "Nick Smith Jr.": "waived",
    "Olivier-Maxence Prosper": "waived",
    # 不適用：Holmgren 為 2022 年選秀（第四年選擇權已於 2024 年決定）；Hood-Schifino 已不在新秀合約
    "Chet Holmgren": "n/a", "Jalen Hood-Schifino": "n/a",
}


# 2025 梯次（2024 年選秀）第四年（2027/28）選擇權，期限 2026-11-02；尚未公布者為 pending
# 來源：https://www.hoopsrumors.com/2026/09/decisions-on-2027-28-rookie-scale-team-options.html
TEAM_DECISION_2025_AS_OF = "2026-10-24"
TEAM_DECISION_2025 = {
    **{p: "exercised" for p in ["Stephon Castle", "Ron Holland", "Matas Buzelis", "Zach Edey", "Yves Missi",
                                "Tristan Da Silva", "Ryan Dunn", "Jaylon Tyson", "Ja'Kobe Walter"]},
    "Rob Dillingham": "waived", "Dalton Knecht": "waived", "Devin Carter": "waived",
    "AJ Johnson": "declined",
}


def decide(ans, pred, dtw, spi, floor):
    if ans > 0:
        return "profit"
    if ans >= -BUFFER:
        return "buffer"
    if pred >= dtw:
        return "opportunity"
    if spi >= floor and ans >= -BUFFER * 1.5:
        return "star"
    return "reject"


def main():
    pred = pd.read_csv(os.path.join(DATA, "NBA_Predicted_WS_2024_2025.csv"))
    spi = pd.read_csv(os.path.join(DATA, "star_power_2024_2025.csv"))
    new = pd.read_csv(os.path.join(DATA, "new_cohorts_2024_2025.csv"))[["Player", "year_start", "player_id", "draft_year"]]
    x = pred.merge(spi[["Player", "year_start", "Star_Power_Index", "Article_Count"]], on=["Player", "year_start"], how="left",
                   validate="one_to_one").merge(new, on=["Player", "year_start"], how="left", validate="one_to_one")
    x["has_sentiment"] = x["Star_Power_Index"].notna()
    x["SPI_Filled"] = x["Star_Power_Index"].fillna(0)
    x["Star_Power_Floor"] = x.groupby("year_start")["SPI_Filled"].transform(lambda s: s.quantile(0.70))
    x["Adjusted_Net_Surplus"] = x["Pred_Salary_Share_Percent"] - x["Est_Cost_Percent"]
    x["stage"] = [decide(r.Adjusted_Net_Surplus, r.Pred_WS, r.Dynamic_Truth_WS, r.SPI_Filled, r.Star_Power_Floor)
                  for r in x.itertuples()]
    x["color"] = x["stage"].map({"profit": "blue", "buffer": "green", "opportunity": "green", "star": "green", "reject": "red"})
    x["team_decision"] = np.where(x["year_start"] == 2024, x["Player"].map(TEAM_DECISION_2024),
                                  x["Player"].map(TEAM_DECISION_2025).fillna("pending"))

    cols = ["Player", "player_id", "year_start", "draft_year", "DraftRank", "Pred_WS", "Year3_WS", "Pred_Salary_Share_Percent",
            "Est_Cost_Percent", "Dynamic_Truth_WS", "BRI_Factor", "Star_Power_Index", "Article_Count", "has_sentiment",
            "Star_Power_Floor", "Adjusted_Net_Surplus", "stage", "color", "year_3", "year_4", "team_decision"]
    x[cols].sort_values(["year_start", "DraftRank"]).to_csv(os.path.join(DATA, "new_cohorts_decisions.csv"), index=False)

    for y in (2024, 2025):
        c = x[x["year_start"] == y]
        print(f"\n===== {y}: blue {int((c.color == 'blue').sum())} / green {int((c.color == 'green').sum())} / "
              f"red {int((c.color == 'red').sum())}; SPI floor {c['Star_Power_Floor'].iloc[0]:.4f}")
        print(c.sort_values("DraftRank")[["DraftRank", "Player", "Pred_WS", "Year3_WS", "Dynamic_Truth_WS",
                                          "Adjusted_Net_Surplus", "SPI_Filled", "stage", "team_decision"]]
              .round(2).to_string(index=False))

    c = x[(x["year_start"] == 2024) & x["Year3_WS"].notna()].copy()
    keep = c["color"] != "red"
    good = c["Year3_WS"] >= c["Dynamic_Truth_WS"]
    e = c["Year3_WS"] - c["Pred_WS"]
    red = c[~keep]
    print("\n===== 2024 out-of-time validation")
    print(f"forecast: n={len(c)} MAE={e.abs().mean():.3f} RMSE={np.sqrt((e ** 2).mean()):.3f} "
          f"R2={1 - (e ** 2).sum() / ((c.Year3_WS - c.Year3_WS.mean()) ** 2).sum():.3f}")
    print(f"decisions: TP={int((keep & good).sum())} FP={int((keep & ~good).sum())} TN={int((~keep & ~good).sum())} "
          f"FN={int((~keep & good).sum())} accuracy={(keep == good).mean():.3f}")
    print(f"red hit rate: {int((red.Year3_WS < red.Dynamic_Truth_WS).sum())}/{len(red)}")
    t = x[(x["year_start"] == 2024) & x["team_decision"].isin(["exercised", "declined", "waived"])]
    team_keep = t["team_decision"] == "exercised"
    model_keep = t["color"] != "red"
    print(f"vs team 4th-year decisions: agree {(team_keep == model_keep).sum()}/{len(t)}")
    print(t[team_keep != model_keep][["Player", "stage", "team_decision", "Pred_WS", "Year3_WS", "Dynamic_Truth_WS"]]
          .round(2).to_string(index=False))
    u = x[(x["year_start"] == 2025) & (x["team_decision"] != "pending")]
    agree = ((u["team_decision"] == "exercised") == (u["color"] != "red"))
    print(f"\n2025 live (as of {TEAM_DECISION_2025_AS_OF}): announced {len(u)}/28, agree {int(agree.sum())}")
    print(u[["Player", "stage", "team_decision"]].to_string(index=False))


if __name__ == "__main__":
    main()
