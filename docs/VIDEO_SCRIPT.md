# 影片腳本：Rookie Option Lab（約 3 分鐘）

- 總長：約 3:00（旁白約 320 個英文字，正常語速約 2 分 15 秒，其餘時間留給停頓與畫面）
- 結構：動畫 0:00–1:00 → 網站 Demo 1:00–2:15 → 動畫 2:15–2:45 → 結尾 2:45–3:00
- 旁白：英文（配合 Devpost）；畫面文字建議也用英文，可加中文字幕
- 畫面比例：1920 × 1080；品牌色：深藍 #08142a、籃球橘 #f07c22；決策色：藍 #2a78d6（執行）、綠 #1baf7a（保留）、紅 #e34948（止損）

---

## 第 1 段：開場（動畫）0:00–0:15

**畫面**
1. 深藍背景，球場線條慢慢畫出來（可沿用網站首頁的球場插畫）。
2. 一條時間軸由左往右展開：`Year 1`、`Year 2`（標示 **Guaranteed**，灰色），`Year 3`、`Year 4`（標示 **Team option**，橘色）。
3. 一個日曆頁翻到 **Oct 31**，橘色圈起來。

**畫面文字**：`Keep the rookie, or cut the loss?`

**旁白**
> Every first-round pick in the NBA signs a rookie contract: two guaranteed seasons, then team options. And by October 31, a front office has to decide — keep paying, or cut the loss.

**中文說明**：用新秀合約的時間軸點出問題：保障兩年，之後是球隊選擇權，10/31 前要決定。

---

## 第 2 段：問題（動畫）0:15–0:30

**畫面**
1. 左右兩張球員卡（剪影即可，不用真人照片）：
   - 左：`#1 pick · forecast 0.68 WS · actual 0.1` → 卡片變紅、蓋上 **BUST**
   - 右：`Late bloomer` → 卡片變綠、箭頭往上
2. 中間浮現一句：`High picks get extra rope — just because they were high picks.`，下方小字 `Staw & Hoang, 1995`

**旁白**
> Keep a bust, and you burn cap space. Cut a late bloomer, and you hand a rival a bargain. Research shows teams give high picks extra rope simply because they were high picks.

**中文說明**：左邊就是 Anthony Bennett（2013 狀元）的數字，但畫面不放名字和照片也可以，避免肖像權問題。

---

## 第 3 段：解法（動畫）0:30–1:00

**畫面**
1. 四個圖示依序出現並以箭頭相連（可直接用網站「運作方式」的四個圖示）：
   `Collect` → `Predict` → `Price` → `Decide`
   - Predict 下方小字：`Lasso · 46 features · 1,252 players`
   - Price 下方小字：`Win Shares → % of salary cap vs. rookie-scale cost`
2. 轉場到「瀑布流」動畫：一顆籃球從上方掉下來，依序經過四道閘門：
   `① Clear surplus` → `② Statistical buffer` → `③ Opportunity cost` → `④ Star-power rescue`
   - 球卡在第 ① 道 → 變藍、顯示 **Exercise**
   - 換一顆球，四道都穿過 → 掉到最下面變紅、顯示 **Stop loss**

**旁白**
> Rookie Option Lab turns two seasons of NBA data into a decision. A Lasso model forecasts a player's year-three Win Shares. We convert that into a share of the salary cap and compare it with his rookie contract. Then a five-gate waterfall adds safety nets — for model error, replacement cost and media buzz. Only a player who fails every safety net is a stop loss.

**中文說明**：這段是動畫重點。瀑布流用「球掉落經過閘門」的比喻，評審一看就懂。

---

## 第 4 段：網站 Demo（螢幕錄影）1:00–2:15

> 錄影前準備請看最下方「錄影準備」。

### 4-1 首頁（1:00–1:10）
**操作**：打開首頁，停 2 秒，滑鼠移到右邊的「2025 COHORT · LIVE CALLS」看板。
**旁白**
> Here's the live app. The board on the right shows our calls for this year's class — published before the teams decide.

### 4-2 球員查詢：Anthony Bennett（1:10–1:35）
**操作**
1. 點導覽列 **Players**（預設就是 2014 梯次 Anthony Bennett）。
2. 往下捲到預測卡片，停在大數字 **0.68 WS** 和右邊的落點圖。
3. 繼續往下，停在五層瀑布流（四道都 ✕，最後 **Stop loss**）。
4. 右邊「Reality check」：**The model's call held up**，實際 **0.1 WS**。

**旁白**
> Take Anthony Bennett, the 2013 number-one pick. The model forecast just 0.68 Win Shares, far below the 2.73 his contract needed. Every safety net fails, so it says decline. In reality? 0.1 Win Shares.

### 4-3 AI 球探報告（1:35–1:50）
**操作**：點「Open full scouting report」，報告**事先生成好**（避免現場等 10–30 秒），快速往下捲過：摘要 → 優勢與隱憂 → 歷史相似球員 → 結論；最後停在「Print / save as PDF」按鈕。
**旁白**
> Every player gets a printable scouting report. The AI only sees what a team knew on decision day — never the player's future.

### 4-4 即時預測（1:50–2:05）
**操作**：點 **Live 2026**，停在倒數卡片，再捲到「Teams' calls announced 13 / 28」「Agree with the model 11 / 13」，最後掃過表格的「Team's call」欄。
**旁白**
> And it's live. Teams must decide on the 2024 draft class by November 2. So far, eleven of thirteen announced decisions match our model.

### 4-5 回測成果：時間外驗證（2:05–2:15）
**操作**：點 **Results**，捲到「Out-of-time test: the 2024 cohort」，停在 R² 0.699 與「Model vs. the teams' real decisions」表格（Scoot Henderson、Bilal Coulibaly 那兩列）。
**旁白**
> On a cohort the model had never seen, teams kept Scoot Henderson and Bilal Coulibaly. The model said decline — and both produced just one Win Share.

---

## 第 5 段：成果（動畫）2:15–2:45

**畫面**：深藍背景，四個大數字依序跳出（數字從 0 往上跑的計數動畫）：

| 大數字 | 下方小字 |
|---|---|
| **93.75%** | of stop-loss calls fell short (30 / 32) |
| **2** | good players wrongly declined, out of 329 |
| **0.70** | forecast R² on the unseen 2024 cohort |
| **4 – 3** | model vs. teams, where they disagreed |

最後一行小字淡入：`Six models compared under identical conditions — Lasso made the best decisions.`

**旁白**
> Across 329 first-round picks from 2013 to 2023, nearly ninety-four percent of our stop-loss calls were right, and only two good players were wrongly cut. On a brand-new cohort, the forecast held up — and where the model and the teams disagreed, the model was right more often.

---

## 第 6 段：結尾（動畫）2:45–3:00

**畫面**
1. 網站 Logo「ROOKIE OPTION LAB」置中，下方：`aqx-databowl-nba-rookie-options.vercel.app`
2. 再下方：GitHub 圖示 + `github.com/SaraWang047671020/aqx-databowl-nba-rookie-options`
3. 最後一行：`AQX Sports Analytics Data Bowl 4.0`

**旁白**
> Rookie Option Lab: a transparent, testable rule for one of the NBA's hardest calls. Try it yourself — it's open source.

---

## 錄影準備（Demo 段落）

1. **語言設成 English**，主題選 **Light**（錄影比較清楚）或 Dark（比較有質感），整支影片統一。
2. **先生成 Anthony Bennett 的 AI 報告**：開報告頁按一次生成，等它完成。之後同一個瀏覽器分頁再打開會直接顯示，不必等待，也不會再花 API 費用。
3. 瀏覽器縮放 **110%**，視窗 1920 × 1080，關掉書籤列和其他分頁。
4. 滑鼠移動要慢、停留要夠久（每個重點停 2–3 秒），後製再剪短。
5. Demo 段可以錄長一點，剪輯時配合旁白長度裁切。

## 動畫製作方式（建議）

| 方式 | 適合 | 難度 |
|---|---|---|
| **PowerPoint / Google 簡報「轉化」轉場** | 時間軸、四步驟、數字跳出 | 最簡單 |
| **Canva 影片** | 有現成動畫模板、可直接配音 | 簡單 |
| **我幫你做成網頁動畫，你用螢幕錄影錄下來** | 瀑布流「球掉落」動畫、數字計數，風格和網站一致 | 你只要錄影 |

建議：第 1、2、5、6 段用簡報或 Canva；第 3 段的瀑布流動畫由我做成網頁，風格會和網站完全一致。
