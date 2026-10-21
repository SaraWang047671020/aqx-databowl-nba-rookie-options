"""網站介面文字（English / 繁體中文）。"""

LANGS = {"en": "English", "zh": "繁體中文"}

STRINGS = {
    "app_title": {
        "en": "🏀 NBA Rookie Team-Option Decision System",
        "zh": "🏀 NBA 新秀選擇權決策系統",
    },
    "app_caption": {
        "en": "Should a team pick up a first-round rookie's option? Machine learning predicts year-3 Win Shares, "
              "NLP measures media buzz, and a real-options waterfall turns both into a decision.",
        "zh": "球隊該不該執行首輪新秀的選擇權？以機器學習預測第三年 Win Shares、以 NLP 量化媒體聲量，"
              "再透過實質選擇權瀑布流產生決策建議。",
    },
    "language": {"en": "Language", "zh": "語言"},
    "model_info": {"en": "Model", "zh": "模型資訊"},
    "model_desc": {
        "en": "Lasso regression on 46 features from a player's first two seasons (trained on 1,252 players, 2000–2023).",
        "zh": "Lasso 迴歸，使用球員前兩季 46 項特徵（2000–2023 梯次共 1,252 人訓練）。",
    },
    "legend_title": {"en": "Decision lights", "zh": "決策燈號"},
    "legend_body": {
        "en": "🔵 Exercise — clear surplus\n\n🟢 Keep — rescued by a safety net\n\n🔴 Decline — stop loss",
        "zh": "🔵 絕對獲利，建議執行\n\n🟢 防護網保留\n\n🔴 建議止損",
    },
    "cohort_note": {
        "en": "Cohort = calendar year the rookie season ended (2020 cohort = 2019 draft).",
        "zh": "梯次＝新秀球季結束之年份（2020 梯次＝2019 年選秀）。",
    },
    "tab_lookup": {"en": "🔎 Player lookup", "zh": "🔎 球員查詢"},
    "tab_cohort": {"en": "🗺️ Cohort explorer", "zh": "🗺️ 梯次總覽"},
    "tab_backtest": {"en": "📊 Backtest", "zh": "📊 歷史回測"},
    "tab_whatif": {"en": "🎛️ What-if", "zh": "🎛️ 參數模擬"},
    "tab_manual": {"en": "✍️ New player", "zh": "✍️ 輸入新球員"},

    # ---- cohort / player labels ----
    "cohort": {"en": "Cohort", "zh": "梯次"},
    "cohort_option": {"en": "{y} cohort (drafted {d})", "zh": "{y} 梯次（{d} 年選秀）"},
    "player": {"en": "Player", "zh": "球員"},
    "pick": {"en": "Pick", "zh": "順位"},
    "pick_n": {"en": "Pick #{n}", "zh": "第 {n} 順位"},

    # ---- stages ----
    "stage_profit": {"en": "Clear surplus", "zh": "絕對獲利"},
    "stage_buffer": {"en": "Statistical buffer", "zh": "統計容錯"},
    "stage_opportunity": {"en": "Opportunity cost", "zh": "機會成本救贖"},
    "stage_star": {"en": "Star-power rescue", "zh": "商業聲量救場"},
    "stage_reject": {"en": "Stop loss", "zh": "絕對止損"},
    "verdict_profit": {"en": "🔵 Exercise the option — value clearly exceeds cost",
                       "zh": "🔵 絕對獲利：實力超越成本，建議執行"},
    "verdict_buffer": {"en": "🟢 Keep — the loss is within the model's error band",
                       "zh": "🟢 統計容錯：財務微虧但落在模型誤差內，建議保留"},
    "verdict_opportunity": {"en": "🟢 Keep — projected output beats a replacement-level player",
                            "zh": "🟢 機會成本救贖：產能高於自由市場替代球員，建議保留"},
    "verdict_star": {"en": "🟢 Keep — rescued by above-average media buzz",
                     "zh": "🟢 商業聲量救場：聲量超越同梯次 70% 球員，建議保留"},
    "verdict_reject": {"en": "🔴 Decline the option — stop loss", "zh": "🔴 絕對止損：建議放棄選擇權"},
    "decision": {"en": "Decision", "zh": "決策"},
    "color_blue": {"en": "Exercise", "zh": "執行"},
    "color_green": {"en": "Keep (safety net)", "zh": "防護網保留"},
    "color_red": {"en": "Decline", "zh": "止損"},

    # ---- metrics ----
    "m_pred_ws": {"en": "Predicted year-3 WS", "zh": "預測第三年 WS"},
    "m_value": {"en": "Predicted value (% of cap)", "zh": "預期價值（佔薪資帽 %）"},
    "m_cost": {"en": "Contract cost (% of cap)", "zh": "合約成本（佔薪資帽 %）"},
    "m_ans": {"en": "Net surplus (% of cap)", "zh": "淨盈餘（佔薪資帽 %）"},
    "m_actual_ws": {"en": "Actual year-3 WS", "zh": "實際第三年 WS"},
    "m_dtw": {"en": "Replacement bar (WS)", "zh": "機會成本基準（WS）"},
    "m_spi": {"en": "Star Power Index", "zh": "商業聲量指數"},
    "no_sentiment": {
        "en": "ℹ️ No news-sentiment data for this player; Star Power Index is treated as 0.",
        "zh": "ℹ️ 此球員沒有新聞輿情資料，商業聲量指數以 0 計算。",
    },
    "no_injury_note": {
        "en": "No separate injury discount is applied; games-played features stay inside the prediction model.",
        "zh": "決策層不另扣傷病風險；出賽場次等特徵仍保留在預測模型中。",
    },

    # ---- waterfall ----
    "waterfall_title": {"en": "How the decision was reached", "zh": "決策是怎麼產生的"},
    "waterfall_caption": {
        "en": "The waterfall stops at the first gate the player passes. Gates below it are not evaluated.",
        "zh": "瀑布流在球員通過的第一關即停止，之後的關卡不再判定。",
    },
    "gate": {"en": "Gate {n}", "zh": "第 {n} 層"},
    "gate_pass": {"en": "✅ Passed → decision", "zh": "✅ 通過 → 決定"},
    "gate_fail": {"en": "❌ Not passed", "zh": "❌ 未通過"},
    "gate_skip": {"en": "— Not evaluated", "zh": "— 未進入"},
    "rule_profit": {"en": "Net surplus {v:+.2f} > 0", "zh": "淨盈餘 {v:+.2f} > 0"},
    "rule_buffer": {"en": "Net surplus {v:+.2f} ≥ −{b:.2f} (1.25 × RMSE buffer)",
                    "zh": "淨盈餘 {v:+.2f} ≥ −{b:.2f}（1.25 倍 RMSE 容錯）"},
    "rule_opportunity": {"en": "Predicted WS {v:.2f} ≥ replacement bar {t:.2f}",
                         "zh": "預測 WS {v:.2f} ≥ 機會成本基準 {t:.2f}"},
    "rule_star": {"en": "Star Power {v:.4f} ≥ cohort PR70 {t:.4f}  and  net surplus {a:+.2f} ≥ {af:.2f}",
                  "zh": "聲量 {v:.4f} ≥ 同梯次 PR70 {t:.4f}　且　淨盈餘 {a:+.2f} ≥ {af:.2f}"},
    "rule_reject": {"en": "All safety nets failed", "zh": "所有防護網皆未通過"},

    # ---- reality check ----
    "vs_pred": {"en": "{d:+.2f} vs. forecast", "zh": "較預測 {d:+.2f}"},
    "reality_title": {"en": "Reality check", "zh": "事後驗證"},
    "reality_correct": {"en": "✅ The model's call held up", "zh": "✅ 模型判斷正確"},
    "reality_wrong": {"en": "❌ The model's call missed", "zh": "❌ 模型判斷失準"},
    "reality_none": {"en": "⚪ No year-3 record (player did not reach a third season)",
                     "zh": "⚪ 無第三年紀錄（球員未能延續至第三年）"},
    "reality_explain": {
        "en": "Correct = the player was kept and reached the replacement bar, or was declined and fell short of it.",
        "zh": "判斷正確＝建議保留且實際產能達到機會成本基準，或建議止損且實際未達基準。",
    },
    "team_kept_y3": {"en": "Team kept player in year 3", "zh": "球團第三年留用"},
    "team_kept_y4": {"en": "Team kept player in year 4", "zh": "球團第四年留用"},
    "outcome_label": {"en": "Team follow-up (stop-loss audit)", "zh": "球團後續處置（止損稽核）"},
    "outcome_Confirmed Bust": {"en": "Confirmed bust", "zh": "確認止損"},
    "outcome_Ambiguous / Traded": {"en": "Ambiguous / traded", "zh": "交易或無法判定"},
    "outcome_Possible False Positive": {"en": "Possible false positive", "zh": "可能誤判"},
    "yes": {"en": "Yes", "zh": "是"},
    "no": {"en": "No", "zh": "否"},

    # ---- LLM ----
    "llm_button": {"en": "🧠 Generate AI scouting report", "zh": "🧠 生成 AI 球探報告"},
    "llm_spinner": {"en": "Claude is writing the scouting report...", "zh": "正在請 Claude 撰寫球探報告..."},
    "llm_title": {"en": "#### 📝 Scouting report", "zh": "#### 📝 球探報告"},
    "llm_limit": {"en": "Report limit reached for this session.", "zh": "本次瀏覽已達報告生成上限。"},

    # ---- cohort explorer ----
    "cohort_title": {"en": "Every first-round pick in a cohort", "zh": "同梯次所有首輪新秀"},
    "cohort_caption": {
        "en": "Points above the dashed line are projected to be worth more than their rookie contract. "
              "Hover a point for details.",
        "zh": "虛線上方的球員，預期價值高於新秀合約成本。滑鼠移到點上可看細節。",
    },
    "breakeven": {"en": "Break-even (value = cost)", "zh": "損益兩平（價值＝成本）"},
    "table_view": {"en": "Table view", "zh": "表格檢視"},
    "col_correct": {"en": "Call correct", "zh": "判斷正確"},
    "col_stage": {"en": "Gate", "zh": "關卡"},

    # ---- backtest ----
    "bt_title": {"en": "Backtest: 329 first-round picks, 2013–2023 cohorts",
                 "zh": "歷史回測：2013–2023 梯次 329 名首輪新秀"},
    "bt_kpi_split": {"en": "Exercise / Keep / Decline", "zh": "執行／保留／止損"},
    "bt_kpi_hit": {"en": "Declined players who really fell short", "zh": "止損名單確實未達標"},
    "bt_kpi_hit_help": {
        "en": "{b} of {n} declined players with a year-3 record produced below the replacement bar.",
        "zh": "具第三年紀錄的 {n} 名止損球員中，{b} 人實際產能低於機會成本基準。",
    },
    "bt_kpi_net": {"en": "Net benefit (cap-% points)", "zh": "淨效益（薪資帽 % 點）"},
    "bt_kpi_net_help": {
        "en": "Losses avoided on correct declines ({a:.1f}) minus value given up on wrong declines ({s:.1f}), "
              "summed across all cohorts using actual year-3 output.",
        "zh": "以實際第三年產能計算：正確止損避免之虧損（{a:.1f}）減去誤判犧牲之價值（{s:.1f}），各梯次加總。",
    },
    "bt_kpi_mae": {"en": "Prediction error on declined players", "zh": "止損球員預測誤差"},
    "bt_kpi_mae_help": {"en": "Mean absolute error in Win Shares.", "zh": "平均絕對誤差（Win Shares）。"},
    "bt_by_year": {"en": "Decisions by cohort", "zh": "各梯次決策分布"},
    "bt_red_list": {"en": "The stop-loss list", "zh": "止損名單"},
    "bt_confusion": {"en": "All 306 players with a year-3 record", "zh": "具第三年紀錄之 306 人"},
    "bt_confusion_caption": {
        "en": "The model is deliberately conservative: it rarely declines a player who turns out good (few misses on the "
            "right), at the price of keeping many who fall short. Teams face the same asymmetry — a cheap rookie "
            "kept one year too long costs little.",
        "zh": "模型刻意偏保守：很少放棄後來表現好的球員，代價是保留了不少未達標者。這與球團的不對稱成本一致——"
              "多留一年便宜新秀的代價有限。",
    },
    "cm_keep_good": {"en": "Kept · reached bar", "zh": "保留・達標"},
    "cm_keep_bad": {"en": "Kept · fell short", "zh": "保留・未達標"},
    "cm_decline_bad": {"en": "Declined · fell short", "zh": "止損・未達標"},
    "cm_decline_good": {"en": "Declined · reached bar", "zh": "止損・達標"},
    "accuracy": {"en": "Overall accuracy {a:.1%}", "zh": "整體正確率 {a:.1%}"},
    "accuracy_short": {"en": "Overall accuracy", "zh": "整體正確率"},

    # ---- what-if ----
    "wi_title": {"en": "What if the front office were more or less cautious?",
                 "zh": "如果球團更保守或更激進？"},
    "wi_caption": {
        "en": "Move the sliders to re-run the whole 329-player backtest live. Defaults are the research settings.",
        "zh": "拖動滑桿即時重跑 329 人回測。預設值即研究設定。",
    },
    "wi_rmse": {"en": "Statistical buffer (× model RMSE)", "zh": "統計容錯倍數（× 模型 RMSE）"},
    "wi_rmse_help": {
        "en": "How much paper loss is forgiven as model noise. Larger = keep more players.",
        "zh": "可容忍多少帳面虧損視為模型誤差。愈大＝保留愈多球員。",
    },
    "wi_pct": {"en": "Star-power bar (cohort percentile)", "zh": "商業聲量門檻（同梯次百分位）"},
    "wi_pct_help": {"en": "Media buzz a player needs to be rescued.", "zh": "球員需達到多少聲量才能被救場。"},
    "wi_star": {"en": "Star-power loss tolerance (× buffer)", "zh": "聲量救場容錯（× 緩衝）"},
    "wi_star_help": {"en": "How deep a loss a high-buzz player can carry.", "zh": "高聲量球員可承擔之虧損深度。"},
    "wi_reset": {"en": "Reset to research defaults", "zh": "回復研究預設值"},
    "wi_delta": {"en": "vs. default", "zh": "相較預設"},
    "wi_curve_red": {"en": "Stop-loss list size", "zh": "止損人數"},
    "wi_curve_net": {"en": "Net benefit (cap-% points)", "zh": "淨效益（薪資帽 % 點）"},
    "wi_curve_hit": {"en": "Declined players who really fell short", "zh": "止損名單確實未達標比例"},
    "wi_curve_x": {"en": "Statistical buffer (× RMSE)", "zh": "統計容錯倍數（× RMSE）"},
    "wi_current": {"en": "Current setting", "zh": "目前設定"},
    "wi_tradeoff": {
        "en": "A tighter buffer catches more busts (higher net benefit) but each extra decline is less certain "
              "(lower hit rate). The research uses 1.25×, close to how teams actually behave.",
        "zh": "容錯愈嚴，抓到的水貨愈多（淨效益愈高），但每多一個止損就愈不確定（命中率下降）。"
              "研究採 1.25 倍，較接近球團實際行為。",
    },
    "wi_changed": {"en": "Players whose decision changed", "zh": "決策改變的球員"},
    "wi_none_changed": {"en": "No decisions changed.", "zh": "沒有球員的決策改變。"},
    "wi_from": {"en": "Default", "zh": "預設"},
    "wi_to": {"en": "Now", "zh": "目前"},

    # ---- manual ----
    "manual_title": {"en": "Evaluate a new player", "zh": "手動輸入新球員"},
    "manual_caption": {
        "en": "Enter a player's per-game and advanced stats averaged over his first two seasons.",
        "zh": "輸入球員前兩季平均之場均與進階數據。",
    },
    "manual_name": {"en": "Player name", "zh": "球員姓名"},
    "manual_compare": {"en": "Compare against cohort (salary cap, replacement bar, star-power bar)",
                       "zh": "比較梯次（薪資帽、機會成本基準、聲量門檻）"},
    "manual_pick": {"en": "Draft pick", "zh": "選秀順位"},
    "manual_pos": {"en": "Primary position", "zh": "主要位置"},
    "manual_shooting": {"en": "Shooting", "zh": "投籃效率數據"},
    "manual_box": {"en": "Rebounds / assists / defense", "zh": "籃板／助攻／防守數據"},
    "manual_adv": {"en": "Advanced", "zh": "進階效率數據"},
    "manual_submit": {"en": "Predict and decide", "zh": "計算預測與決策"},
    "manual_need_name": {"en": "Please enter a player name.", "zh": "請輸入球員姓名。"},
    "manual_spinner": {"en": "Running the model...", "zh": "模型預測中..."},
    "no_model": {"en": "Trained model not found. Run `python train_model.py` in the webapp folder.",
                 "zh": "找不到已訓練的模型，請先在 webapp 資料夾執行：python train_model.py"},
}


def t(key: str, lang: str, **kwargs) -> str:
    entry = STRINGS.get(key)
    if entry is None:
        return key
    text = entry.get(lang) or entry["en"]
    return text.format(**kwargs) if kwargs else text
