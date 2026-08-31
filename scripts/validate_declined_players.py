import os
import sys

import matplotlib.pyplot as plt
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_CSV = os.path.join(BASE_DIR, "Declined_Players_Report.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "Declined_Players_Validation.csv")
CHART_DIR = os.path.join(BASE_DIR, "決策圖")
CHART_PATH = os.path.join(CHART_DIR, "Validation_Summary.png")

CONFIRMED_BUST = "Confirmed Bust"
AMBIGUOUS_TRADED = "Ambiguous / Traded"
POSSIBLE_FALSE_POSITIVE = "Possible False Positive"


def classify(row):
    actual = str(row["Actual"]).strip()
    year4 = str(row["Year4"]).strip()

    if actual == "no":
        return CONFIRMED_BUST
    if "right after" in actual:
        return CONFIRMED_BUST
    if year4 == "x":
        return CONFIRMED_BUST
    if year4 == "v(waived in mid)":
        return CONFIRMED_BUST
    if year4.startswith("v(trade"):
        return AMBIGUOUS_TRADED
    if year4 == "v":
        return POSSIBLE_FALSE_POSITIVE

    return f"Unclassified (Year4={year4!r}, Actual={actual!r})"


def main():
    df = pd.read_csv(INPUT_CSV)
    df["Outcome_Label"] = df.apply(classify, axis=1)

    df["Year3_WS_Numeric"] = pd.to_numeric(df["Year3_WS"], errors="coerce")
    df["Never_Reached_Year3"] = df["Year3_WS"].astype(str).str.strip() == "X"
    df["Production_Confirmed_Bust"] = df["Never_Reached_Year3"] | (
        df["Year3_WS_Numeric"] <= df["Dynamic_Truth_WS"]
    )
    df["Pred_Error"] = df["Pred_WS"] - df["Year3_WS_Numeric"]

    unclassified = df[df["Outcome_Label"].str.startswith("Unclassified")]
    if not unclassified.empty:
        print("⚠️  以下列無法分類，請檢查 Year4/Actual 的值：")
        print(unclassified[["Draft_Year", "Player", "Year4", "Actual"]].to_string(index=False))

    df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"💾 已存檔逐球員驗證結果：{OUTPUT_CSV}")

    total = len(df)
    counts = df["Outcome_Label"].value_counts()
    confirmed = counts.get(CONFIRMED_BUST, 0)
    ambiguous = counts.get(AMBIGUOUS_TRADED, 0)
    false_pos = counts.get(POSSIBLE_FALSE_POSITIVE, 0)

    hit_rate_overall = confirmed / total if total else float("nan")
    denom_excl_ambiguous = confirmed + false_pos
    precision_excl_ambiguous = confirmed / denom_excl_ambiguous if denom_excl_ambiguous else float("nan")

    print("\n" + "=" * 80)
    print("止損建議整體驗證結果")
    print("=" * 80)
    print(f"📊 模型判定「止損」的總筆數: {total}")
    print(f"✅ Confirmed Bust（模型判斷正確）: {confirmed} 筆")
    print(f"🔀 Ambiguous / Traded（無法單純二分）: {ambiguous} 筆")
    print(f"❓ Possible False Positive（模型可能誤判）: {false_pos} 筆")
    print("-" * 80)
    print(f"整體命中率（Confirmed / 全部）: {hit_rate_overall:.1%}")
    print(f"排除 Ambiguous 後的 Precision（Confirmed / (Confirmed + FalsePositive)）: {precision_excl_ambiguous:.1%}")

    print("\n" + "-" * 80)
    print("逐年命中率")
    print("-" * 80)
    per_year = df.groupby("Draft_Year")["Outcome_Label"].apply(
        lambda s: (s == CONFIRMED_BUST).sum() / len(s)
    )
    for year, rate in per_year.items():
        n = len(df[df["Draft_Year"] == year])
        print(f"{year}: {rate:.1%}（{n} 筆）")

    print("\n" + "=" * 80)
    print("財務反事實分析（Adjusted_Net_Surplus，單位：佔薪資帽 %）")
    print("=" * 80)
    confirmed_surplus = df.loc[df["Outcome_Label"] == CONFIRMED_BUST, "Adjusted_Net_Surplus"].abs().sum()
    false_pos_surplus = df.loc[df["Outcome_Label"] == POSSIBLE_FALSE_POSITIVE, "Adjusted_Net_Surplus"].abs().sum()
    ambiguous_surplus = df.loc[df["Outcome_Label"] == AMBIGUOUS_TRADED, "Adjusted_Net_Surplus"].abs().sum()

    print(f"💰 Confirmed Bust 群組：若聽模型建議可避免的預估虧損總和 = {confirmed_surplus:.2f}%")
    print(f"⚠️  Possible False Positive 群組：模型可能犧牲掉的潛在留用價值總和 = {false_pos_surplus:.2f}%")
    print(f"🔀 Ambiguous / Traded 群組：{ambiguous_surplus:.2f}%（不計入淨效益，僅供參考）")
    net_benefit = confirmed_surplus - false_pos_surplus
    print(f"📈 淨效益（避免虧損 - 犧牲價值）= {net_benefit:.2f}%")

    print("\n" + "=" * 80)
    print("實際產能驗證（Year3_WS vs Dynamic_Truth_WS / Pred_WS）")
    print("=" * 80)
    never_reached = int(df["Never_Reached_Year3"].sum())
    print(f"🚫 根本沒打到第三年（Year3_WS = X）: {never_reached} 筆")

    numeric_df = df[df["Year3_WS_Numeric"].notna()]
    below_floor = int((numeric_df["Year3_WS_Numeric"] <= numeric_df["Dynamic_Truth_WS"]).sum())
    print(f"📉 有打但實際 WS 仍低於當初安全門檻(Dynamic_Truth_WS): {below_floor} / {len(numeric_df)} 筆")

    production_confirmed_total = int(df["Production_Confirmed_Bust"].sum())
    production_hit_rate = production_confirmed_total / total if total else float("nan")
    print(f"✅ 產能面確認止損（沒打到第三年 或 WS 未達安全門檻）: {production_confirmed_total} / {total}"
          f"（{production_hit_rate:.1%}）")

    mae = numeric_df["Pred_Error"].abs().mean()
    bias = numeric_df["Pred_Error"].mean()
    print(f"📐 對此紅區子集的預測誤差 — MAE: {mae:.3f}｜平均偏差 (Pred - Actual): {bias:+.3f}"
          f"（正值代表模型高估、負值代表模型低估，n={len(numeric_df)}）")

    print("\n" + "-" * 80)
    print("三層證據交叉比對（Outcome_Label 與 產能面確認 是否一致）")
    print("-" * 80)
    cross_tab = pd.crosstab(df["Outcome_Label"], df["Production_Confirmed_Bust"])
    print(cross_tab.to_string())

    os.makedirs(CHART_DIR, exist_ok=True)
    order = [CONFIRMED_BUST, AMBIGUOUS_TRADED, POSSIBLE_FALSE_POSITIVE]
    values = [counts.get(label, 0) for label in order]
    colors = ["#2ca02c", "#ff7f0e", "#d62728"]

    plt.figure(figsize=(8, 6))
    bars = plt.bar(order, values, color=colors, edgecolor="black")
    for bar, value in zip(bars, values):
        plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3, str(value),
                  ha="center", va="bottom", fontsize=12, fontweight="bold")
    plt.ylabel("球員數")
    plt.title(f"止損建議驗證結果 (2013-2023, n={total})\n整體命中率 = {hit_rate_overall:.1%}")
    plt.tight_layout()
    plt.savefig(CHART_PATH)
    plt.close()
    print(f"\n💾 已存檔長條圖：{CHART_PATH}")


if __name__ == "__main__":
    main()
