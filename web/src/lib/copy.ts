/**
 * 多頁版網站新增的文字（首頁、研究方法、關於、導覽列）。內容依 README 的研究說明撰寫。
 */
type Entry = { en: string; zh: string };

export const COPY: Record<string, Entry> = {
  // ---- navigation ----
  nav_home: { en: "Home", zh: "首頁" },
  nav_method: { en: "Method", zh: "研究方法" },
  nav_player: { en: "Players", zh: "球員查詢" },
  nav_cohort: { en: "Cohorts", zh: "梯次總覽" },
  nav_results: { en: "Results", zh: "回測成果" },
  nav_simulator: { en: "Simulator", zh: "參數模擬" },
  nav_new: { en: "New player", zh: "新球員評估" },
  nav_about: { en: "About", zh: "關於" },
  nav_explore: { en: "Explore", zh: "互動工具" },
  menu: { en: "Menu", zh: "選單" },

  // ---- home ----
  home_kicker: { en: "AQX Sports Analytics Data Bowl 4.0", zh: "AQX Sports Analytics Data Bowl 4.0" },
  home_title_1: { en: "Keep the rookie,", zh: "留下新秀，" },
  home_title_2: { en: "or cut the loss?", zh: "還是及早止損？" },
  home_sub: {
    en: "A decision engine for NBA rookie team options. It forecasts a first-round pick's year-3 Win Shares from his first two seasons, prices that output against his contract, and runs a five-gate real-options waterfall to recommend exercise, keep, or decline.",
    zh: "NBA 新秀選擇權決策引擎：以新秀前兩季數據預測第三年 Win Shares，換算成相對於合約的價值，再以五層實質選擇權瀑布流給出「執行、保留或止損」的建議。",
  },
  cta_try: { en: "Look up a player", zh: "查詢球員" },
  cta_method: { en: "How it works", zh: "了解研究方法" },
  cta_full_method: { en: "Read the full method", zh: "閱讀完整研究方法" },
  board_title: { en: "{y} cohort · top picks", zh: "{y} 梯次・前段順位" },
  board_caption: { en: "Forecast year-3 Win Shares. Click a player for the full breakdown.", zh: "預測第三年 Win Shares。點選球員查看完整分析。" },
  home_stat_players: { en: "first-round picks backtested (2013–2023)", zh: "位首輪新秀回測（2013–2023）" },
  home_stat_r2: { en: "held-out test R² (Lasso)", zh: "Lasso 模型測試集 R²" },
  home_stat_hit: { en: "of stop-loss calls fell short of the bar", zh: "止損名單確實未達標" },
  home_stat_fn: { en: "good players wrongly declined", zh: "位好球員被誤判止損" },

  problem_kicker: { en: "The question", zh: "問題" },
  problem_title: { en: "A rookie contract is a cheap option — until it isn't", zh: "新秀合約是一張便宜的選擇權，前提是選對人" },
  problem_body: {
    en: "First-round picks sign rookie-scale contracts with team options for later seasons. A front office has to decide whether to keep paying long before it knows how the player will develop. Keep a bust and you burn cap space; cut a late bloomer and you hand a rival a bargain. We turn that call into a transparent, testable rule.",
    zh: "首輪新秀簽的是新秀合約，後續年份由球隊決定是否執行選擇權。球團必須在還看不清球員發展前就做決定：留下水貨會浪費薪資空間，放走大器晚成的球員則等於把便宜好貨送給對手。我們把這個判斷變成透明、可回測的規則。",
  },

  how_kicker: { en: "How it works", zh: "運作方式" },
  how_title: { en: "From box score to boardroom in four steps", zh: "從數據到決策的四個步驟" },
  step_data_t: { en: "Collect", zh: "蒐集資料" },
  step_data_d: {
    en: "First-two-season stats for 1,252 players (2000–2023), plus news headlines from each player's rookie window.",
    zh: "1,252 名球員（2000–2023）前兩季的基本與進階數據，以及每位新秀菜鳥期間的新聞標題。",
  },
  step_predict_t: { en: "Predict", zh: "預測產能" },
  step_predict_d: {
    en: "A Lasso model (46 features) forecasts year-3 Win Shares. Six models were compared; Lasso generalized best.",
    zh: "Lasso 迴歸（46 項特徵）預測第三年 Win Shares。比較 6 種模型後，Lasso 的泛化能力最穩定。",
  },
  step_value_t: { en: "Price", zh: "換算價值" },
  step_value_d: {
    en: "Win Shares are converted to a share of the salary cap and compared with the rookie-scale cost of that draft slot.",
    zh: "把 Win Shares 換算成薪資帽占比，再與該選秀順位的新秀合約成本比較。",
  },
  step_decide_t: { en: "Decide", zh: "決策" },
  step_decide_d: {
    en: "A five-gate waterfall adds safety nets for model error, replacement cost and media buzz before recommending a stop loss.",
    zh: "五層瀑布流依序檢查模型誤差、機會成本與媒體聲量等防護網，全部未通過才建議止損。",
  },

  explore_kicker: { en: "Interactive tools", zh: "互動工具" },
  explore_title: { en: "Explore the model yourself", zh: "親自操作模型" },
  card_player_d: { en: "Any first-round pick from 2013–2023: forecast, decision path and what really happened.", zh: "2013–2023 任一首輪新秀：預測值、決策路徑與事後結果。" },
  card_cohort_d: { en: "Every pick in a draft class on one value-vs-cost map.", zh: "同一屆所有首輪新秀的「價值 vs 成本」分布圖。" },
  card_results_d: { en: "Hit rate, net benefit, forecast accuracy and the full stop-loss list.", zh: "命中率、淨效益、預測準確度與完整止損名單。" },
  card_simulator_d: { en: "Make the front office more or less cautious and re-run 329 decisions live.", zh: "調整球團保守程度，即時重跑 329 人決策。" },
  card_new_d: { en: "Enter a player's stats and get a forecast and recommendation instantly.", zh: "輸入球員數據，立即得到預測與建議。" },
  open: { en: "Open", zh: "開啟" },

  findings_kicker: { en: "Key findings", zh: "主要發現" },
  findings_title: { en: "Conservative by design, sharp when it says no", zh: "刻意保守，但說「不」的時候很準" },
  finding_hit_d: {
    en: "30 of 32 declined players with a year-3 record produced below the replacement bar.",
    zh: "具第三年紀錄的 32 名止損球員中，30 人實際產能低於機會成本基準。",
  },
  finding_fn_d: {
    en: "Only 2 players who reached the bar were declined. The rule rarely gives away a future contributor.",
    zh: "只有 2 名後來達標的球員被誤判止損，幾乎不會放走未來的主力。",
  },
  finding_net_d: {
    en: "Cap-percentage points saved on correct declines, net of value given up on wrong ones.",
    zh: "正確止損避免的虧損，扣除誤判犧牲的價值後的淨效益（薪資帽 % 點）。",
  },
  cta_band_title: { en: "See the call for your favorite rookie", zh: "看看你喜歡的新秀會被怎麼判斷" },
  cta_band_body: { en: "Search 329 first-round picks from the 2013–2023 cohorts.", zh: "搜尋 2013–2023 梯次共 329 名首輪新秀。" },

  // ---- page headers ----
  page_player_t: { en: "Player lookup", zh: "球員查詢" },
  page_player_d: { en: "Pick a cohort and a player to see the forecast, every gate of the decision, and what actually happened.", zh: "選擇梯次與球員，查看預測值、每一層決策關卡與事後結果。" },
  page_cohort_t: { en: "Cohort explorer", zh: "梯次總覽" },
  page_cohort_d: { en: "Each draft class on one map: points above the dashed line are projected to be worth more than their contract.", zh: "把一整屆新秀放在同一張圖：虛線上方代表預期價值高於合約成本。" },
  page_results_t: { en: "Backtest results", zh: "回測成果" },
  page_results_d: { en: "How the rule would have done on 329 first-round picks from the 2013–2023 cohorts.", zh: "這套規則在 2013–2023 梯次 329 名首輪新秀上的歷史表現。" },
  page_simulator_t: { en: "Policy simulator", zh: "參數模擬" },
  page_simulator_d: { en: "Change how cautious the front office is and watch all 329 decisions update in your browser.", zh: "調整球團的保守程度，329 人的決策會在你的瀏覽器即時更新。" },
  page_new_t: { en: "Evaluate a new player", zh: "新球員評估" },
  page_new_d: { en: "Enter first-two-season averages and a draft slot for an instant forecast and recommendation.", zh: "輸入前兩季平均數據與選秀順位，立即得到預測與建議。" },
  page_method_t: { en: "Research method", zh: "研究方法" },
  page_method_d: { en: "Data, model, valuation and the five-gate decision waterfall, with the formulas and caveats.", zh: "資料、模型、價值換算與五層決策瀑布流，附公式與限制說明。" },
  page_about_t: { en: "About the project", zh: "關於本專案" },
  page_about_d: { en: "A student research project for the AQX Sports Analytics Data Bowl 4.0. Fully open source.", zh: "為 AQX Sports Analytics Data Bowl 4.0 製作的學生研究專案，完全開放原始碼。" },

  // ---- method ----
  m_data_t: { en: "1 · Data", zh: "1 · 資料" },
  m_data_body: {
    en: "Box-score and advanced stats come from Kaggle's NBA/ABA/BAA dataset (Basketball-Reference). For every player entering the league from 2000 to 2023 we average his first two seasons and label it with his year-3 Win Shares. Draft position and college data fill gaps for second-rounders.",
    zh: "基本與進階數據來自 Kaggle 的 NBA/ABA/BAA 資料集（Basketball-Reference）。2000–2023 年進入聯盟的每位球員，取前兩季平均作為特徵，並以第三年 Win Shares 作為標籤；選秀順位與大學數據用來補足二輪秀的缺值。",
  },
  m_nlp_t: { en: "2 · Media buzz (NLP)", zh: "2 · 媒體聲量（NLP）" },
  m_nlp_body: {
    en: "A custom scraper collects headlines from each player's rookie window. Non-English and syndicated duplicates are removed (TF-IDF cosine ≥ 0.85), a Transformer (RoBERTa) model scores sentiment, and Bayesian smoothing stabilizes low-coverage players. The result is the Star Power Index.",
    zh: "自製爬蟲蒐集每位新秀菜鳥期間的新聞標題，去除非英文與轉載重複（TF-IDF 餘弦相似度 ≥ 0.85）後，以 Transformer（RoBERTa）模型評分情緒，並用貝氏平滑穩定報導量少的球員，得到「商業聲量指數」。",
  },
  m_model_t: { en: "3 · Forecasting year-3 Win Shares", zh: "3 · 預測第三年 Win Shares" },
  m_model_body: {
    en: "Six regressors were compared. Lasso was selected for its accuracy and the smallest train–test gap: 46 features, α ≈ 0.049, test R² 0.577, RMSE 1.79 WS (1,001 training / 251 test players). Historical forecasts are out-of-sample: each cohort is predicted by a model that never saw it.",
    zh: "比較 6 種迴歸模型後選用 Lasso，因為準確度佳且訓練與測試落差最小：46 項特徵、α ≈ 0.049、測試集 R² 0.577、RMSE 1.79 WS（訓練 1,001 人、測試 251 人）。歷史預測皆為樣本外：每個梯次都由沒看過該梯次的模型預測。",
  },
  m_compare_caption: {
    en: "Original comparison (indicative: models were not all run on identical data versions and splits).",
    zh: "原始比較結果（僅供參考：各模型的資料版本與切分不完全相同）。",
  },
  m_value_t: { en: "4 · From Win Shares to dollars", zh: "4 · 從 Win Shares 換算價值" },
  m_value_body: {
    en: "One Win Share is worth the league's salary pool divided by the wins it buys. The forecast becomes a share of the salary cap and is compared with the rookie-scale cost of the draft slot (about 8.0% of the cap for pick 1, 1.5% for pick 30).",
    zh: "一個 Win Share 的價值，等於聯盟薪資總額除以可買到的勝場。預測值換算成薪資帽占比後，與該順位的新秀合約成本比較（狀元約 8.0%，第 30 順位約 1.5%）。",
  },
  m_formula_ws: { en: "Value of 1 WS", zh: "1 WS 的價值" },
  m_formula_share: { en: "Predicted value", zh: "預期價值" },
  m_formula_surplus: { en: "Net surplus", zh: "淨盈餘" },
  m_formula_bar: { en: "Replacement bar", zh: "機會成本基準" },
  m_formula_bar_note: {
    en: "Floor: a minimum-salary veteran (about 1.8% of the cap).",
    zh: "下限：底薪老將（約薪資帽 1.8%）。",
  },
  m_gates_t: { en: "5 · The five-gate waterfall", zh: "5 · 五層決策瀑布流" },
  m_gates_body: {
    en: "A single hard threshold is easily fooled by model noise. The waterfall checks each gate from the top and stops at the first one the player passes. Only a player who fails every safety net is declined.",
    zh: "單一門檻很容易被模型誤差誤導。瀑布流從上往下逐層檢查，球員通過任一關即停止；只有所有防護網都未通過，才會建議止損。",
  },
  g1_d: { en: "Expected value exceeds the contract cost.", zh: "預期價值高於合約成本。" },
  g2_d: { en: "The paper loss is within 1.25 × model RMSE: too close to call, so keep a possible late bloomer.", zh: "帳面虧損在 1.25 倍模型 RMSE 以內，差距太小不足以判斷，保留可能大器晚成的球員。" },
  g3_d: { en: "Forecast output still beats a free-market replacement at the same cost.", zh: "預測產能仍高於用同樣成本可買到的替代球員。" },
  g4_d: { en: "Media buzz in the cohort's top 30% and a loss within 1.5× the buffer.", zh: "聲量位居同梯次前 30%，且虧損在 1.5 倍緩衝以內。" },
  g5_d: { en: "Every safety net failed: decline the option and free the cap space.", zh: "所有防護網皆未通過：放棄選擇權，釋出薪資空間。" },
  m_caveats_t: { en: "Caveats", zh: "限制與注意事項" },
  m_caveat_1: {
    en: "With the current formulas, passing gate 3 implies a non-negative surplus, which gates 1–2 already cover, so gate 3 never rescues anyone in practice.",
    zh: "在目前的公式下，通過第 3 關即代表淨盈餘非負，已被第 1–2 關涵蓋，因此第 3 關實際上不會救回任何球員。",
  },
  m_caveat_2: {
    en: "The buffer compares RMSE (in WS) with a salary-cap percentage. Read it as a decision-rule setting, not a calibrated financial confidence interval.",
    zh: "緩衝區以 RMSE（WS 單位）與薪資帽百分比比較，單位不同，應視為決策規則的設定值，而非校準過的財務信賴區間。",
  },
  m_caveat_3: {
    en: "The Star Power Index measures relative media buzz; it has not been validated against real revenue.",
    zh: "商業聲量指數衡量的是相對媒體聲量，尚未與實際營收驗證。",
  },
  m_caveat_4: {
    en: "A call is scored by whether the player reached the replacement bar, not by what the team actually did.",
    zh: "回測以球員是否達到機會成本基準評分，不等同於球團的實際決定。",
  },
  col_model: { en: "Model", zh: "模型" },
  col_cv_r2: { en: "CV R²", zh: "交叉驗證 R²" },
  col_test_r2: { en: "Test R²", zh: "測試 R²" },
  col_gap: { en: "Train–test gap", zh: "訓練-測試落差" },
  selected: { en: "selected", zh: "採用" },

  // ---- about ----
  about_comp_t: { en: "The competition", zh: "競賽" },
  about_comp_body: {
    en: "Built for the AQX Sports Analytics Data Bowl 4.0, a student competition for projects that turn sports data into decisions.",
    zh: "本專案為 AQX Sports Analytics Data Bowl 4.0 製作，這是一個以運動數據產生決策的學生競賽。",
  },
  about_open_t: { en: "Open source", zh: "開放原始碼" },
  about_open_body: {
    en: "Every notebook, script and both web apps are on GitHub, including the data pipeline, model comparison and the backtest that produces every number on this site.",
    zh: "所有 notebook、腳本與兩個網站版本都放在 GitHub，包括資料處理、模型比較，以及產生本站所有數字的回測程式。",
  },
  about_stack_t: { en: "How this site is built", zh: "網站技術" },
  about_stack_body: {
    en: "React + TypeScript on Vercel. The model and the full decision engine run in your browser and are checked against the Python research code (all 329 decisions match). Only the AI scouting report calls a server function, which uses OpenAI.",
    zh: "以 React + TypeScript 製作並部署在 Vercel。模型與完整決策引擎都在你的瀏覽器中執行，並與 Python 研究程式逐一比對（329 人決策完全一致）。只有 AI 球探報告會呼叫伺服器函式（使用 OpenAI）。",
  },
  about_data_t: { en: "Data sources", zh: "資料來源" },
  about_limits_t: { en: "Limitations and next steps", zh: "限制與未來方向" },
  about_limit_1: { en: "Year-3 Win Shares is a single, noisy target; role and minutes changes are not modeled.", zh: "第三年 Win Shares 是單一且有雜訊的目標，未考慮角色與上場時間的變化。" },
  about_limit_2: { en: "Contract cost uses a smooth approximation of the rookie scale, not exact CBA salaries.", zh: "合約成本採新秀薪資表的平滑近似，並非實際 CBA 金額。" },
  about_limit_3: { en: "Injury risk is not discounted in the main analysis; games-played features stay inside the model.", zh: "主分析未另扣傷病風險，出賽場次等特徵仍保留在模型中。" },
  about_live_t: { en: "Also available", zh: "其他版本" },
  about_live_body: { en: "The original Streamlit version of this app is still online as a backup.", zh: "原本的 Streamlit 版網站仍在線上，作為備用。" },

  footer_tag: {
    en: "Turning rookie stats into option decisions. Built for the AQX Sports Analytics Data Bowl 4.0.",
    zh: "把新秀數據變成選擇權決策。為 AQX Sports Analytics Data Bowl 4.0 製作。",
  },
  footer_pages: { en: "Pages", zh: "頁面" },
  footer_project: { en: "Project", zh: "專案" },
  footer_disclaimer: {
    en: "Research prototype. Valuations are an estimation framework, not real market prices. Not affiliated with the NBA.",
    zh: "研究原型。價值換算為估算框架，並非實際市場價格。與 NBA 無任何關聯。",
  },
};
