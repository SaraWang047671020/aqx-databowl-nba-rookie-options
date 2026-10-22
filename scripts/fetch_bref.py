"""
從 Basketball-Reference 抓取新梯次所需的球季與選秀頁面（Kaggle 資料只更新到 2023-24）。

- 只抓 10 個頁面：2023-24、2024-25、2025-26 的場均與進階數據，以及 2021–2024 選秀頁
- 每次請求間隔 6 秒（Sports Reference 限制每分鐘約 20 次），抓過的頁面快取在 data/raw_bref/，不重複請求
- 解析時保留球員 ID（data-append-csv），避免同名或名字寫法不同造成錯配

用法：python scripts/fetch_bref.py
"""
import io
import os
import re
import time

import pandas as pd
import requests
from bs4 import BeautifulSoup, Comment

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "data", "raw_bref")
BASE = "https://www.basketball-reference.com"
HEADERS = {"User-Agent": "Mozilla/5.0 (student research project; NBA rookie option study; low-volume)"}
DELAY = 6.0

SEASONS = [2024, 2025, 2026]  # 球季結束年份：2023-24、2024-25、2025-26
DRAFTS = [2021, 2022, 2023, 2024]
PAGES = (
    [(f"NBA_{y}_per_game.html", f"/leagues/NBA_{y}_per_game.html") for y in SEASONS]
    + [(f"NBA_{y}_advanced.html", f"/leagues/NBA_{y}_advanced.html") for y in SEASONS]
    + [(f"draft_{y}.html", f"/draft/NBA_{y}.html") for y in DRAFTS]
)


def fetch_all():
    os.makedirs(RAW, exist_ok=True)
    for name, path in PAGES:
        dest = os.path.join(RAW, name)
        if os.path.exists(dest):
            print("cached", name)
            continue
        r = requests.get(BASE + path, headers=HEADERS, timeout=30)
        print(r.status_code, path)
        r.raise_for_status()
        open(dest, "w", encoding="utf-8").write(r.content.decode("utf-8"))
        time.sleep(DELAY)


def parse_table(name, table_id):
    """回傳含 player_id 的 DataFrame；表格可能藏在 HTML 註解中。"""
    html = open(os.path.join(RAW, name), encoding="utf-8").read()
    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id=table_id)
    if table is None:
        for c in soup.find_all(string=lambda s: isinstance(s, Comment)):
            if f'id="{table_id}"' in c:
                table = BeautifulSoup(c, "html.parser").find("table", id=table_id)
                break
    if table is None:
        raise ValueError(f"{table_id} not found in {name}")
    rows = []
    header = None
    for tr in table.find_all("tr"):
        cells = tr.find_all(["th", "td"])
        stats = [c.get("data-stat") for c in cells]
        name_key = "player" if "player" in stats else "name_display" if "name_display" in stats else None
        if name_key is None:
            continue
        if tr.find_parent("thead") is not None:
            header = stats
            continue
        if tr.get("class") and "thead" in tr.get("class"):
            continue
        rec = {c.get("data-stat"): c.get_text(strip=True) for c in cells}
        pc = tr.find(attrs={"data-stat": name_key})
        rec["player_id"] = pc.get("data-append-csv") if pc is not None else None
        if rec["player_id"] is None and pc is not None and pc.find("a"):
            m = re.search(r"/players/\w/(\w+)\.html", pc.find("a")["href"])
            rec["player_id"] = m.group(1) if m else None
        rec["player"] = rec.pop(name_key) if name_key != "player" else rec["player"]
        if rec.get("player") and rec["player"] != "League Average":
            rows.append(rec)
    return pd.DataFrame(rows)


if __name__ == "__main__":
    fetch_all()
    for y in SEASONS:
        pg = parse_table(f"NBA_{y}_per_game.html", "per_game_stats")
        adv = parse_table(f"NBA_{y}_advanced.html", "advanced")
        print(y, "per_game", pg.shape, "advanced", adv.shape, "cols", list(pg.columns)[:12])
    for y in DRAFTS:
        d = parse_table(f"draft_{y}.html", "stats")
        print("draft", y, d.shape, list(d.columns)[:8])
