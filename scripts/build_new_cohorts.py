"""
建立 2024、2025 梯次的首輪新秀資料，格式與 data/NBA_Normalized_Final.csv 完全相同。

資料慣例（依原資料反推並驗證）：
- 梯次 year_start = 新秀球季結束年份（2024 梯次 = 2023-24 新秀季 = 2023 年選秀）
- 特徵 = 前兩季的場均與進階數據直接平均；被交易球員使用整季合計列（B-Ref 的 2TM/3TM/TOT）
- Year3_WS = 第三季 WS；year_3 = 是否在第三季出賽；season = 已出賽季數
- Salary_Cap_At_Start = 梯次第二季的薪資帽（2013 梯次 → 2013-14），BRI_Factor = 1.20
- 機會成本基準 = max(合約成本, 1.8) / 1 WS 價值，四捨五入至小數第二位

原研究檔案不會被修改；輸出另存 data/NBA_Normalized_Final_2025.csv（原資料 + 新梯次）。
用法：python scripts/build_new_cohorts.py
"""
import os

import numpy as np
import pandas as pd

from fetch_bref import parse_table

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")

NEW_COHORTS = [2024, 2025]
SEASONS = [2024, 2025, 2026]
SALARY_CAP = {2024: 140.588, 2025: 154.647}  # 2024-25、2025-26（NBA 官方公告，百萬美元）
BRI = 1.20
DRAFTS = [2021, 2022, 2023, 2024]

PER_GAME = {
    "fg_per_g": "FG", "fga_per_g": "FGA", "fg_pct": "FG%", "fg3_per_g": "3P", "fg3a_per_g": "3PA", "fg3_pct": "3P%",
    "fg2_per_g": "2P", "fg2a_per_g": "2PA", "fg2_pct": "2P%", "efg_pct": "eFG%", "ft_per_g": "FT", "fta_per_g": "FTA",
    "ft_pct": "FT%", "orb_per_g": "ORB", "drb_per_g": "DRB", "trb_per_g": "TRB", "ast_per_g": "AST", "stl_per_g": "STL",
    "blk_per_g": "BLK", "tov_per_g": "TOV", "pf_per_g": "PF", "pts_per_g": "PTS",
    "games": "G", "games_started": "GS", "mp_per_g": "MP", "age": "Age",
}
ADVANCED = {
    "per": "PER", "ts_pct": "TS%", "fg3a_per_fga_pct": "3PAr", "fta_per_fga_pct": "FTr", "orb_pct": "ORB%",
    "drb_pct": "DRB%", "trb_pct": "TRB%", "ast_pct": "AST%", "stl_pct": "STL%", "blk_pct": "BLK%", "tov_pct": "TOV%",
    "usg_pct": "USG%", "ows": "OWS", "dws": "DWS", "ws": "WS", "ws_per_48": "WS/48", "obpm": "OBPM", "dbpm": "DBPM",
    "bpm": "BPM", "vorp": "VORP",
}


def season_table(year):
    """每位球員一列（被交易者取整季合計列，即該球員的第一列）。"""
    pg = parse_table(f"NBA_{year}_per_game.html", "per_game_stats").drop_duplicates("player_id")
    adv = parse_table(f"NBA_{year}_advanced.html", "advanced").drop_duplicates("player_id")
    pg = pg[["player_id", "player", "pos", *PER_GAME]].rename(columns=PER_GAME)
    adv = adv[["player_id", *ADVANCED]].rename(columns=ADVANCED)
    t = pg.merge(adv, on="player_id", how="left")
    for c in [*PER_GAME.values(), *ADVANCED.values()]:
        t[c] = pd.to_numeric(t[c], errors="coerce")
    t["Year"] = year
    return t


def first_round_picks():
    rows = []
    for y in DRAFTS:
        d = parse_table(f"draft_{y}.html", "stats")
        d["pick_overall"] = pd.to_numeric(d["pick_overall"], errors="coerce")
        d = d[d["pick_overall"].between(1, 30)]
        rows.append(d[["player_id", "player", "pick_overall"]].assign(draft_year=y))
    return pd.concat(rows, ignore_index=True)


def cost_percent(rank):
    return 8.0 - (rank - 1) * (6.5 / 29) if 1 <= rank <= 30 else 1.1


def main():
    base = pd.read_csv(os.path.join(DATA, "NBA_Normalized_Final.csv"))
    known = set(base.loc[base["year_start"] <= 2023, "Player"].astype(str).str.strip())

    seasons = pd.concat([season_table(y) for y in SEASONS], ignore_index=True)
    picks = first_round_picks()

    out = []
    for _, pk in picks.iterrows():
        if pk["player"] in known:
            continue  # 已在原資料（2023 梯次以前出道）
        hist = seasons[seasons["player_id"] == pk["player_id"]].sort_values("Year")
        if hist.empty:
            continue
        debut = int(hist["Year"].min())
        if debut not in NEW_COHORTS:
            continue
        first2 = hist[hist["Year"].between(debut, debut + 1)]
        feats = first2[[*PER_GAME.values(), *ADVANCED.values()]].mean(numeric_only=True)
        pos = first2["pos"].astype(str).str.split("-").str[0].mode().iloc[0]
        y3 = hist[hist["Year"] == debut + 2]
        rank = int(pk["pick_overall"])
        cap = SALARY_CAP[debut]
        ws_value_pct = 30 * BRI / 1230 * 100
        cost = cost_percent(rank)
        row = {
            "Player": pk["player"], "year_start": float(debut), "DraftRank": float(rank), "Is_Undrafted": False,
            "season": float(len(hist)), "Is_Active": True, "Salary_Cap_At_Start": cap, "BRI_Factor": BRI,
            "Year3_WS": float(y3["WS"].iloc[0]) if not y3.empty else np.nan,
            "Year4_WS": np.nan,
            "Pos": pos, **{f"Pos_{p}": pos == p for p in ["PG", "SG", "SF", "PF", "C"]},
            **feats.to_dict(),
            "year_3": ("yes" if not y3.empty else "no") if debut + 2 <= max(SEASONS) else np.nan,
            "year_4": np.nan,
            "Est_Cost_Percent": round(cost, 2),
            "Dynamic_Truth_WS": round(max(cost, 1.8) / ws_value_pct, 2),
            "player_id": pk["player_id"], "draft_year": int(pk["draft_year"]),
        }
        out.append(row)

    new = pd.DataFrame(out)
    new["Fg%"] = new["FG%"]  # 原資料有重複欄位 Fg%
    new["Salary_Percentage"] = np.nan  # 原資料中未被模型或決策使用
    cols = list(base.columns)
    full = pd.concat([base, new[cols]], ignore_index=True)
    full.to_csv(os.path.join(DATA, "NBA_Normalized_Final_2025.csv"), index=False)
    new.to_csv(os.path.join(DATA, "new_cohorts_2024_2025.csv"), index=False)

    for y in NEW_COHORTS:
        c = new[new["year_start"] == y].sort_values("DraftRank")
        print(f"\n{y} cohort: {len(c)} first-round picks, {int((c['season'] > 1).sum())} with 2+ seasons, "
              f"{int(c['Year3_WS'].notna().sum())} with year-3 WS")
        print(c[["DraftRank", "Player", "draft_year", "season", "G", "PTS", "WS", "Year3_WS", "Pos"]].to_string(index=False))


if __name__ == "__main__":
    main()
