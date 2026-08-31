"""
NBA 新秀選擇權自動化決策系統 — Streamlit 網站入口。

執行方式：
    streamlit run app.py
"""
import streamlit as st

import decision_engine as de
from report_generator import ReportGenerationError, generate_scouting_report

st.set_page_config(page_title="NBA 新秀選擇權決策系統", page_icon="🏀", layout="wide")

COLOR_STYLE = {
    "blue": ("#eff6ff", "#1d428a", "🔵"),
    "green": ("#ecfdf5", "#047857", "🟢"),
    "red": ("#fef2f2", "#b91c1c", "🔴"),
}

POSITIONS = ["PG", "SG", "SF", "PF", "C"]

SHOOTING_FIELDS = ["FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P%", "2PA", "FT", "FTA", "FT%", "3PAr", "FTr", "TS%", "eFG%"]
BOXSCORE_FIELDS = ["ORB", "ORB%", "DRB", "DRB%", "TRB", "TRB%", "AST", "AST%", "STL", "STL%", "BLK", "BLK%", "TOV", "TOV%", "PF", "PTS"]
ADVANCED_FIELDS = ["PER", "USG%", "OWS", "DWS", "WS", "WS/48", "OBPM", "DBPM", "BPM", "VORP"]


def render_decision_card(result: dict):
    color = result.get("color", "red")
    bg, fg, icon = COLOR_STYLE[color]
    st.markdown(
        f"""
        <div style="background:{bg};border-left:6px solid {fg};padding:16px 20px;border-radius:8px;">
            <div style="font-size:1.1rem;font-weight:700;color:{fg};">{icon} {result.get('reason', '')}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    cols = st.columns(4)
    cols[0].metric("預測第三年 WS", f"{result.get('Pred_WS', 0):.2f}")
    cols[1].metric("預期薪資佔比", f"{result.get('Pred_Salary_Share_Percent', 0):.2f}%")
    cols[2].metric("預估合約成本", f"{result.get('Est_Cost_Percent', 0):.2f}%")
    roi = result.get("Pred_ROI")
    cols[3].metric("預估 ROI", f"{roi:.2f}" if roi is not None else "—")

    if not result.get("has_precomputed_sentiment", True):
        st.info("ℹ️ 此球員沒有歷史輿情資料，傷病風險與商業聲量分數暫用中性值計算。")


def render_llm_report_button(key_prefix: str, player_stats: dict, decision_result: dict):
    if st.button("🧠 生成 LLM 球探報告", key=f"{key_prefix}_report_btn"):
        with st.spinner("正在請 Claude 撰寫球探報告..."):
            try:
                report = generate_scouting_report(player_stats, decision_result)
                st.markdown("#### 📝 球探報告")
                st.write(report)
            except ReportGenerationError as e:
                st.error(str(e))


def historical_player_tab():
    st.subheader("查詢歷史球員（2000–2023 梯次）")

    years = de.list_cohort_years()
    year = st.selectbox("選秀年份", years, index=len(years) - 1)
    players = de.list_players_in_cohort(int(year))
    if not players:
        st.warning("該年份查無球員資料。")
        return
    player = st.selectbox("球員", players)

    if st.button("查詢決策結果", key="hist_query_btn"):
        result = de.evaluate_historical_player(int(year), player)
        if result is None:
            st.error("查無此球員的預測資料。")
            return
        st.session_state["hist_result"] = result
        st.session_state["hist_player_stats"] = {"Player": player, "year_start": int(year)}

    if "hist_result" in st.session_state:
        render_decision_card(st.session_state["hist_result"])
        render_llm_report_button("hist", st.session_state["hist_player_stats"], st.session_state["hist_result"])


def manual_player_tab():
    st.subheader("手動輸入新球員")

    with st.form("manual_player_form"):
        c1, c2, c3 = st.columns(3)
        player_name = c1.text_input("球員姓名", value="")
        draft_year_options = de.list_cohort_years()
        compare_year = c2.selectbox(
            "比較梯次（用於同梯次商業聲量 PR70 門檻與機會成本基準）",
            draft_year_options,
            index=len(draft_year_options) - 1,
        )
        draft_rank = c3.number_input("選秀順位", min_value=1, max_value=60, value=15)

        position = st.radio("主要位置", POSITIONS, horizontal=True)

        stats = {}
        with st.expander("投籃效率數據", expanded=True):
            cols = st.columns(4)
            for i, field in enumerate(SHOOTING_FIELDS):
                stats[field] = cols[i % 4].number_input(field, value=0.0, step=0.01, key=f"m_{field}")

        with st.expander("籃板／助攻／防守數據", expanded=False):
            cols = st.columns(4)
            for i, field in enumerate(BOXSCORE_FIELDS):
                stats[field] = cols[i % 4].number_input(field, value=0.0, step=0.1, key=f"m_{field}")

        with st.expander("進階效率數據", expanded=False):
            cols = st.columns(4)
            for i, field in enumerate(ADVANCED_FIELDS):
                stats[field] = cols[i % 4].number_input(field, value=0.0, step=0.1, key=f"m_{field}")

        submitted = st.form_submit_button("計算預測與決策")

    if submitted:
        if not player_name.strip():
            st.error("請輸入球員姓名。")
            return

        for pos in POSITIONS:
            stats[f"Pos_{pos}"] = 1 if pos == position else 0

        stats["Player"] = player_name

        with st.spinner("模型預測中..."):
            result = de.evaluate_manual_player(stats, draft_rank=draft_rank, draft_year=int(compare_year))

        st.session_state["manual_result"] = result
        st.session_state["manual_player_stats"] = stats

    if "manual_result" in st.session_state:
        render_decision_card(st.session_state["manual_result"])
        render_llm_report_button("manual", st.session_state["manual_player_stats"], st.session_state["manual_result"])


def main():
    st.title("🏀 NBA 新秀選擇權自動化決策系統")
    st.caption("Data-Driven Real Options Model — 查詢歷史球員或手動輸入新球員數據，取得財務決策建議與 LLM 球探報告")

    try:
        meta = de.get_model_meta()
    except FileNotFoundError:
        st.error("找不到已訓練的模型，請先在 webapp 資料夾執行：python train_model.py")
        st.stop()

    with st.sidebar:
        st.markdown("### 模型資訊")
        st.write(f"Test R²：{meta['test_r2']:.4f}")
        st.write(f"Test RMSE：{meta['test_rmse']:.4f}")
        st.write(f"最佳 alpha：{meta['best_alpha']:.4f}")
        st.markdown("---")
        st.markdown(
            "**決策燈號說明**\n\n"
            "🔵 絕對獲利　🟢 防護網保留　🔴 建議止損\n\n"
            "詳見 `專題/進度儀表板.html` 技術手冊。"
        )

    tab1, tab2 = st.tabs(["📚 查詢歷史球員", "✍️ 手動輸入新球員"])
    with tab1:
        historical_player_tab()
    with tab2:
        manual_player_tab()


if __name__ == "__main__":
    main()
