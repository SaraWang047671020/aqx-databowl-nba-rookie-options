"""
找出研究樣本中「選秀後延後出賽」的首輪新秀：首個出賽球季（梯次）晚於選秀隔年。

梯次依首個出賽球季計，但選擇權期限依合約年份（簽約當年起算）。若球員簽約後因傷缺席，
第四年選擇權期限會早於他打滿兩季，模型在真正的決策日沒有兩季數據可用。
海外留洋（draft-and-stash）的球員到 NBA 才簽新秀合約，合約年份與出賽年份一致，不受影響，
因此本程式只列出候選名單，是否為「已簽約但未出賽」需逐一人工確認（見 CONTRACT_DELAYED）。

用法：python scripts/delayed_debut.py
輸出：data/delayed_debut_players.csv
"""
import os
import time

import pandas as pd
import requests

from fetch_bref import BASE, DELAY, HEADERS, RAW, parse_table

HERE = os.path.dirname(os.path.abspath(__file__))
DRAFTS = range(2008, 2023)
STUDY = os.path.join(HERE, "..", "web", "src", "data", "study.json")
OUT = os.path.join(HERE, "..", "data", "delayed_debut_players.csv")

# 人工確認：選秀當年即簽下新秀合約、但第一季未出賽（多為傷病），選擇權時程因此早於模型假設
CONTRACT_DELAYED = {
    "Nerlens Noel": "ACL tear, missed 2013-14",
    "Joel Embiid": "foot injuries, missed 2014-15 and 2015-16",
    "Ben Simmons": "foot fracture, missed 2016-17",
    "Harry Giles": "knee injuries, sat out 2017-18",
    "Michael Porter Jr.": "back surgery, missed 2018-19",
    "Dylan Windler": "leg stress reaction, missed 2019-20",
}
# 研究後新增的梯次另由 scripts/classify_new_cohorts.py 判斷（2024 梯次的 Chet Holmgren：foot injury, missed 2022-23）


def fetch_drafts():
    for y in DRAFTS:
        dest = os.path.join(RAW, f"draft_{y}.html")
        if os.path.exists(dest):
            continue
        r = requests.get(f"{BASE}/draft/NBA_{y}.html", headers=HEADERS, timeout=30)
        print(r.status_code, y)
        r.raise_for_status()
        open(dest, "w", encoding="utf-8").write(r.content.decode("utf-8"))
        time.sleep(DELAY)


def main():
    fetch_drafts()
    drafts = pd.concat([parse_table(f"draft_{y}.html", "stats")[["player", "pick_overall"]].assign(draft_year=y)
                        for y in DRAFTS])
    drafts = drafts[drafts["pick_overall"].str.isdigit()].astype({"pick_overall": int})
    study = pd.read_json(STUDY)[["Player", "year_start", "DraftRank"]]
    m = study.merge(drafts, left_on=["Player", "DraftRank"], right_on=["player", "pick_overall"], how="left")
    missing = m[m["draft_year"].isna()]
    if len(missing):
        print("unmatched (name/pick):")
        print(missing[["Player", "year_start", "DraftRank"]].to_string(index=False))
    late = m[m["draft_year"].notna() & (m["year_start"] - m["draft_year"] > 1)].copy()
    late["draft_year"] = late["draft_year"].astype(int)
    late["contract_delayed"] = late["Player"].isin(CONTRACT_DELAYED)
    late["note"] = late["Player"].map(CONTRACT_DELAYED).fillna("")
    print(late[["Player", "draft_year", "year_start", "DraftRank", "contract_delayed", "note"]].to_string(index=False))
    late[["Player", "draft_year", "year_start", "DraftRank", "contract_delayed", "note"]].to_csv(OUT, index=False)


if __name__ == "__main__":
    main()
