import json
import os
import sys

import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "決策圖")
YEARS = range(2013, 2024)

PENALTY_WEIGHT = 0.8  # 傷病風險折價


def load_data():
    df_pred = pd.read_csv(os.path.join(BASE_DIR, "NBA_Predicted_WS.csv"))
    df_features = pd.read_csv(os.path.join(BASE_DIR, "NBA_Player_Final_Master_Features.csv"))

    df_pred["Player"] = df_pred["Player"].astype(str).str.strip()
    df_features["Player"] = df_features["Player"].astype(str).str.strip()

    df_all = pd.merge(
        df_pred,
        df_features[["Player", "Worst_Injury_History", "Star_Power_Index"]],
        on="Player",
        how="left",
    )
    df_all["Worst_Injury_History"] = df_all["Worst_Injury_History"].fillna(0).astype(int)
    df_all["Star_Power_Index"] = df_all["Star_Power_Index"].fillna(0)
    return df_all


def load_rmse_buffer():
    meta_path = os.path.join(BASE_DIR, "webapp", "models", "model_meta.json")
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    return meta["test_rmse"]


def apply_waterfall(df_plot, rmse_buffer, star_power_floor):
    df_plot = df_plot.copy()
    df_plot["Risk_Penalty_Percent"] = df_plot["Worst_Injury_History"] * PENALTY_WEIGHT
    df_plot["Adjusted_Pred_Salary"] = df_plot["Pred_Salary_Share_Percent"] - df_plot["Risk_Penalty_Percent"]
    df_plot["Adjusted_Net_Surplus"] = df_plot["Adjusted_Pred_Salary"] - df_plot["Est_Cost_Percent"]

    df_plot["plot_color"] = "red"
    df_plot["decision_reason"] = "🔴 絕對止損 (未達標準)"

    cond_blue = df_plot["Adjusted_Net_Surplus"] > 0
    df_plot.loc[cond_blue, "plot_color"] = "blue"
    df_plot.loc[cond_blue, "decision_reason"] = "🔵 絕對獲利 (實力超越成本)"

    cond_green_buffer = (df_plot["plot_color"] == "red") & (df_plot["Adjusted_Net_Surplus"] >= -rmse_buffer)
    df_plot.loc[cond_green_buffer, "plot_color"] = "green"
    df_plot.loc[cond_green_buffer, "decision_reason"] = "🟢 統計容錯 (財務微虧但在誤差區間)"

    cond_green_dynamic = (df_plot["plot_color"] == "red") & (df_plot["Pred_WS"] >= df_plot["Dynamic_Truth_WS"])
    df_plot.loc[cond_green_dynamic, "plot_color"] = "green"
    df_plot.loc[cond_green_dynamic, "decision_reason"] = "🟢 機會成本救贖 (產能大於自由市場替代品)"

    cond_green_star = (
        (df_plot["plot_color"] == "red")
        & (df_plot["Star_Power_Index"] >= star_power_floor)
        & (df_plot["Adjusted_Net_Surplus"] >= -(rmse_buffer * 1.5))
    )
    df_plot.loc[cond_green_star, "plot_color"] = "green"
    df_plot.loc[cond_green_star, "decision_reason"] = f"🟢 商業聲量救場 (超越同梯 70% 基準線 {star_power_floor:.3f})"

    return df_plot


def plot_year(df_plot, target_year, star_power_floor):
    plt.figure(figsize=(14, 10))

    x = df_plot["Est_Cost_Percent"]
    y = df_plot["Pred_WS"]

    plt.scatter(x, y, c=df_plot["plot_color"], s=120, alpha=0.8, edgecolors="black", linewidth=1.5, zorder=5)

    df_sorted = df_plot.sort_values("Est_Cost_Percent")
    plt.plot(
        df_sorted["Est_Cost_Percent"],
        df_sorted["Dynamic_Truth_WS"],
        color="red",
        linestyle=":",
        linewidth=2,
        alpha=0.6,
        label="Dynamic WS Ceiling (Safety Net)",
        zorder=2,
    )

    plt.axvline(x.mean(), color="black", linestyle="-.", alpha=0.3, label=f"Avg Cost ({x.mean():.2f}%)", zorder=1)
    plt.axhline(y.mean(), color="black", linestyle="-.", alpha=0.3, label=f"Avg WS ({y.mean():.2f})", zorder=1)

    for _, row in df_plot.iterrows():
        plt.text(
            row["Est_Cost_Percent"] + 0.05,
            row["Pred_WS"] + 0.05,
            row["Player"],
            fontsize=9,
            fontweight="bold" if row["Star_Power_Index"] >= star_power_floor else "normal",
        )

    plt.xlabel("Option Cost (Salary % of Cap)", fontsize=12)
    plt.ylabel("Asset Value (Predicted WS)", fontsize=12)
    plt.title(f"Strategic Decision Quadrants ({target_year}): Multi-Layer Real Options Model", fontsize=16)

    blue_patch = mpatches.Patch(color="blue", label="🔵 Exercise: Profitable (絕對獲利)")
    green_patch = mpatches.Patch(color="green", label="🟢 Exercise: Insurance/Saved (多層防護網救回)")
    red_patch = mpatches.Patch(color="red", label="🔴 Expire: Stop-Loss (水貨/溢價止損)")
    plt.legend(handles=[blue_patch, green_patch, red_patch], loc="upper left")

    plt.grid(True, linestyle=":", alpha=0.4)
    plt.xlim(0, x.max() + 1)
    plt.ylim(0, y.max() + 1)

    out_path = os.path.join(OUTPUT_DIR, f"Contract_Decision_{target_year}.png")
    plt.savefig(out_path)
    plt.close()
    return out_path


def print_year_report(df_plot, target_year):
    total_players = len(df_plot)
    blue_count = len(df_plot[df_plot["plot_color"] == "blue"])
    green_count = len(df_plot[df_plot["plot_color"] == "green"])
    red_count = len(df_plot[df_plot["plot_color"] == "red"])

    print("\n" + "=" * 80)
    print(f"[{target_year}] NBA CONTRACT OPTION STRATEGY REPORT (DECISION ENGINE 6.0)")
    print("=" * 80)
    print(f"📊 總分析球員數: {total_players}")
    print(f"🔵 建議執行 (獲利區): {blue_count} 名")
    print(f"🟢 建議執行 (保險/救贖區): {green_count} 名")
    print(f"🔴 建議放棄 (絕對止損區): {red_count} 名")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    df_all = load_data()
    rmse_buffer = load_rmse_buffer()

    saved = []
    skipped = []

    for target_year in YEARS:
        df_plot = df_all[df_all["year_start"] == target_year].copy()
        if df_plot.empty:
            print(f"⚠️  {target_year} 年無資料，跳過。")
            skipped.append(target_year)
            continue

        star_power_floor = df_plot["Star_Power_Index"].quantile(0.70)
        df_plot = apply_waterfall(df_plot, rmse_buffer, star_power_floor)
        out_path = plot_year(df_plot, target_year, star_power_floor)
        print_year_report(df_plot, target_year)
        print(f"💾 已存檔：{out_path}")
        saved.append(target_year)

    print("\n" + "#" * 80)
    print(f"完成。已產出 {len(saved)} 張決策圖：{saved}")
    if skipped:
        print(f"因無資料被跳過的年份：{skipped}")
    print(f"輸出資料夾：{OUTPUT_DIR}")


if __name__ == "__main__":
    main()
