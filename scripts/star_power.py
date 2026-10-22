"""
新梯次的商業聲量指數（Star Power Index），步驟與 notebooks/data_pipeline/sentiment_analysis.ipynb 相同：

1. 主角過濾：標題需含球員姓名（忽略 ≤2 字的 Jr./II 等）
2. 領域過濾：內文需含籃球關鍵字
3. RoBERTa（cardiffnlp/twitter-roberta-base-sentiment-latest）情緒極性 = P(正) − P(負)
   分析文字優先取「|」後的摘要（> 50 字時），截斷至 500 字
4. 依球員聚合：文章數、平均情緒
5. 同梯次聲量 PR = 文章數在同梯次的百分位；貝氏平滑：
   Adjusted = (n × 平均 + C × 全體平均) / (n + C)，C = 同梯次文章數中位數
6. Star_Power_Index = 聲量 PR × Adjusted_Sentiment

唯一新增：排除含中文字的新聞（中文標題夾雜英文人名時 langdetect 會誤判為英文，英文 RoBERTa 無法正確評分）。

用法：python scripts/star_power.py 2024 2025
輸出：data/news/NBA_News_{梯次}_Sentiment_Features.csv、data/star_power_2024_2025.csv
"""
import os
import re
import sys

import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
NEWS = os.path.join(HERE, "..", "data", "news")
OUT = os.path.join(HERE, "..", "data", "star_power_2024_2025.csv")
MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"

BASKETBALL_KEYWORDS = [
    'nba', 'basketball', 'draft', 'rookie', 'trade', 'contract', 'hoops',
    'points', 'rebounds', 'assists', 'coach', 'ncaa', 'college', 'guard',
    'forward', 'center', 'scout', 'prospect', 'g-league', 'g league',
    'summer league', 'playoffs', 'championship', 'pick', 'roster', 'minutes',
    'hawks', 'celtics', 'nets', 'hornets', 'bulls', 'cavaliers', 'cavs',
    'mavericks', 'mavs', 'nuggets', 'pistons', 'warriors', 'rockets',
    'pacers', 'clippers', 'lakers', 'grizzlies', 'heat', 'bucks',
    'timberwolves', 'wolves', 'pelicans', 'knicks', 'thunder', 'magic',
    '76ers', 'sixers', 'suns', 'trail blazers', 'blazers', 'kings',
    'spurs', 'raptors', 'jazz', 'wizards', 'injury'
]
CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")


def is_basketball_related(text):
    t = str(text).lower()
    return any(k in t for k in BASKETBALL_KEYWORDS)


def is_player_in_title(player, content):
    title = str(content).split(' | ', 1)[0].lower()
    return any(p.lower() in title for p in str(player).split() if len(p) > 2)


def score_cohort(year, analyzer):
    df = pd.read_csv(os.path.join(NEWS, f"NBA_News_{year}_Full_Cohort.csv"))
    df["Content"] = df["Content"].fillna("").astype(str)
    stats = {"total": len(df), "cjk": 0, "title": 0, "domain": 0}
    rows = []
    for _, r in df.iterrows():
        text = r["Content"]
        if not text.strip():
            continue
        if CJK.search(text):
            stats["cjk"] += 1
            continue
        if not is_player_in_title(r["Player"], text):
            stats["title"] += 1
            continue
        if not is_basketball_related(text):
            stats["domain"] += 1
            continue
        parts = text.split(' | ', 1)
        analysis = parts[1][:500] if len(parts) > 1 and len(parts[1]) > 50 else text[:500]
        res = analyzer(analysis, top_k=None)
        if isinstance(res[0], list):
            res = res[0]
        s = {x["label"]: x["score"] for x in res}
        rows.append({**r.to_dict(), "Sentiment_Score": round(s.get("positive", 0) - s.get("negative", 0), 4)})
    feats = pd.DataFrame(rows)
    feats.to_csv(os.path.join(NEWS, f"NBA_News_{year}_Sentiment_Features.csv"), index=False, encoding="utf-8-sig")
    print(f"[{year}] {stats} -> kept {len(feats)}")

    agg = feats.groupby("Player").agg(Article_Count=("Sentiment_Score", "count"),
                                      Raw_Mean_Sentiment=("Sentiment_Score", "mean")).reset_index()
    agg["Cohort_Buzz_PR"] = agg["Article_Count"].rank(pct=True)
    global_mean = agg["Raw_Mean_Sentiment"].mean()
    c_weight = agg["Article_Count"].median()
    agg["Adjusted_Sentiment"] = ((agg["Article_Count"] * agg["Raw_Mean_Sentiment"]) + c_weight * global_mean) / (
        agg["Article_Count"] + c_weight)
    agg["Star_Power_Index"] = agg["Cohort_Buzz_PR"] * agg["Adjusted_Sentiment"]
    agg["year_start"] = year
    return agg.round(4)


def main():
    years = [int(y) for y in sys.argv[1:]] or [2024, 2025]
    from transformers import pipeline
    analyzer = pipeline("sentiment-analysis", model=MODEL, tokenizer=MODEL, device=-1)
    out = pd.concat([score_cohort(y, analyzer) for y in years], ignore_index=True)
    out.to_csv(OUT, index=False, encoding="utf-8-sig")
    print("wrote", OUT)
    print(out.sort_values(["year_start", "Star_Power_Index"], ascending=[True, False]).to_string(index=False))


if __name__ == "__main__":
    main()
