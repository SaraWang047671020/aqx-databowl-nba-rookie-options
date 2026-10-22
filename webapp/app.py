"""
NBA 新秀選擇權自動化決策系統 — Streamlit 網站入口。

執行方式：
    streamlit run app.py
"""
import numpy as np
import pandas as pd
import streamlit as st

import charts
import decision_engine as de
from i18n import LANGS, t
from report_generator import ReportGenerationError, generate_scouting_report

st.set_page_config(page_title="NBA Rookie Option Decisions", page_icon="🏀", layout="wide")

STAGE_STYLE = {
    "blue": ("rgba(42,120,214,0.12)", "#2a78d6"),
    "green": ("rgba(27,175,122,0.12)", "#1baf7a"),
    "red": ("rgba(227,73,72,0.12)", "#e34948"),
}
POSITIONS = ["PG", "SG", "SF", "PF", "C"]
SHOOTING_FIELDS = ["FG", "FGA", "FG%", "3P", "3PA", "3P%", "2P%", "2PA", "FT", "FTA", "FT%", "3PAr", "FTr", "TS%", "eFG%"]
BOXSCORE_FIELDS = ["ORB", "ORB%", "DRB", "DRB%", "TRB", "TRB%", "AST", "AST%", "STL", "STL%", "BLK", "BLK%", "TOV", "TOV%", "PF", "PTS"]
ADVANCED_FIELDS = ["PER", "USG%", "OWS", "DWS", "WS", "WS/48", "OBPM", "DBPM", "BPM", "VORP"]
MAX_REPORTS_PER_SESSION = 5
REPO_URL = "https://github.com/SaraWang047671020/aqx-databowl-nba-rookie-options"
CSS = """
<style>
.block-container {padding-top: 2.2rem;}
[data-testid="stMetric"] {border: 1px solid rgba(128,128,128,0.22); border-radius: 12px;
  padding: 12px 16px; background: rgba(128,128,128,0.05);}
[data-testid="stMetricValue"] {font-weight: 700;}
[data-baseweb="tab-list"] {gap: 6px;}
[data-baseweb="tab"] p {font-size: 1rem; font-weight: 600;}
.hero {background: linear-gradient(120deg, #0f2a4a 0%, #1d4f8f 55%, #2a78d6 100%); color: #fff;
  border-radius: 16px; padding: 22px 28px; margin-bottom: 18px;}
.hero h1 {color: #fff; font-size: 1.9rem; margin: 6px 0 6px 0; padding: 0;}
.hero p {color: rgba(255,255,255,0.85); margin: 0; max-width: 900px;}
.hero .badge {display: inline-block; font-size: 0.75rem; letter-spacing: .06em; text-transform: uppercase;
  background: rgba(255,255,255,0.16); padding: 3px 10px; border-radius: 999px;}
.hero .stats {display: flex; gap: 28px; flex-wrap: wrap; margin-top: 14px;}
.hero .stats b {font-size: 1.35rem; display: block; color: #fff;}
.hero .stats span {font-size: 0.82rem; color: rgba(255,255,255,0.75);}
.fc-card {border-radius: 16px; padding: 18px 22px; height: 100%;}
.fc-kicker {font-size: 0.78rem; letter-spacing: .06em; text-transform: uppercase; opacity: .75; font-weight: 600;}
.fc-big {font-size: 3.6rem; font-weight: 800; line-height: 1.05; margin: 4px 0 2px 0;}
.fc-big small {font-size: 1.1rem; font-weight: 600; opacity: .7; margin-left: 6px;}
.fc-line {margin: 4px 0; font-size: 0.98rem;}
.fc-note {font-size: 0.8rem; opacity: .7; margin-top: 8px;}
</style>
"""
DEFAULTS = {"wi_rmse": de.RMSE_MULTIPLIER, "wi_pct": int(de.STAR_POWER_PERCENTILE * 100),
            "wi_star": de.STAR_RESCUE_MULTIPLIER}


@st.cache_data
def decided(rmse_multiplier=de.RMSE_MULTIPLIER, star_percentile=de.STAR_POWER_PERCENTILE,
            star_multiplier=de.STAR_RESCUE_MULTIPLIER) -> pd.DataFrame:
    return de.classify_frame(de.load_study_sample(), rmse_multiplier, star_percentile, star_multiplier)


@st.cache_data
def buffer_sweep(star_percentile, star_multiplier) -> pd.DataFrame:
    rows = []
    for mult in np.round(np.arange(0.5, 2.001, 0.125), 3):
        s = de.backtest_summary(decided(float(mult), star_percentile, star_multiplier))
        rows.append(dict(multiplier=mult, red=s["red"], net=s["net"], hit=s["hit_rate"] * 100))
    return pd.DataFrame(rows)


def cohort_label(year, lang):
    return t("cohort_option", lang, y=int(year), d=int(year) - 1)


def color_label(color, lang):
    return t(f"color_{color}", lang)


# ---------------------------------------------------------------- components

def render_header(lang: str, meta: dict):
    s = de.backtest_summary(decided())
    st.markdown(
        f"""<div class="hero"><span class="badge">{t('hero_badge', lang)}</span>
        <h1>{t('app_title', lang)}</h1><p>{t('app_caption', lang)}</p>
        <div class="stats">
          <div><b>{s['n']}</b><span>{t('hero_stat_players', lang)}</span></div>
          <div><b>{meta['test_r2']:.3f}</b><span>{t('hero_stat_r2', lang)}</span></div>
          <div><b>{s['hit_rate']:.1%}</b><span>{t('hero_stat_hit', lang)}</span></div>
          <div><b>+{s['net']:.1f}</b><span>{t('bt_kpi_net', lang)}</span></div>
        </div></div>""",
        unsafe_allow_html=True,
    )


def render_forecast(row: dict, lang: str, show_actual: bool):
    """預測主視覺：大字顯示預測第三年 WS、誤差區間與門檻差距，右側為數線圖。"""
    rmse = de.get_model_meta()["test_rmse"]
    bg, fg = STAGE_STYLE[row["color"]]
    pred, bar = row["Pred_WS"], row["Dynamic_Truth_WS"]
    gap = pred - bar
    if lang == "zh":
        vs = t("fc_vs_bar", lang, b=bar, d=abs(gap), word=t("fc_above" if gap >= 0 else "fc_below", lang))
    else:
        vs = t("fc_vs_bar", lang, b=bar, d=gap)
    left, right = st.columns([2, 3], gap="medium")
    left.markdown(
        f"""<div class="fc-card" style="background:{bg};border:1px solid {fg};">
        <div class="fc-kicker">{t('fc_kicker', lang)}</div>
        <div class="fc-big" style="color:{fg};">{pred:.2f}<small>WS</small></div>
        <div class="fc-line">{t('fc_range', lang, lo=pred - rmse, hi=pred + rmse)}</div>
        <div class="fc-line"><b>{vs}</b></div>
        <div class="fc-note">{t('fc_note', lang)}</div></div>""",
        unsafe_allow_html=True,
    )
    with right:
        st.markdown(f"**{t('fc_strip_title', lang)}**")
        st.plotly_chart(charts.forecast_strip(row, rmse, lang, show_actual), width="stretch",
                        config={"displayModeBar": False})


def render_decision_card(row: dict, lang: str, show_actual: bool = True):
    render_forecast(row, lang, show_actual)
    st.write("")
    bg, fg = STAGE_STYLE[row["color"]]
    st.markdown(
        f"""<div style="background:{bg};border-left:6px solid {fg};padding:14px 18px;border-radius:8px;">
        <div style="font-size:1.1rem;font-weight:700;">{t('verdict_' + row['stage'], lang)}</div></div>""",
        unsafe_allow_html=True,
    )
    st.write("")
    cols = st.columns(3)
    cols[0].metric(t("m_value", lang), f"{row['Pred_Salary_Share_Percent']:.2f}%")
    cols[1].metric(t("m_cost", lang), f"{row['Est_Cost_Percent']:.2f}%")
    cols[2].metric(t("m_ans", lang), f"{row['Adjusted_Net_Surplus']:+.2f}")
    if not row.get("has_sentiment", True):
        st.info(t("no_sentiment", lang))


def render_waterfall(row: dict, lang: str):
    st.markdown(f"#### {t('waterfall_title', lang)}")
    st.caption(t("waterfall_caption", lang))
    b = row["RMSE_Buffer"]
    steps = de.waterfall_steps(row, b)
    for i, step in enumerate(steps, start=1):
        stage = step["stage"]
        if stage == "profit":
            rule = t("rule_profit", lang, v=step["value"])
        elif stage == "buffer":
            rule = t("rule_buffer", lang, v=step["value"], b=b)
        elif stage == "opportunity":
            rule = t("rule_opportunity", lang, v=step["value"], t=step["threshold"])
        elif stage == "star":
            e = step["extra"]
            rule = t("rule_star", lang, v=step["value"], t=step["threshold"], a=e["ans"], af=e["ans_floor"])
        else:
            rule = t("rule_reject", lang)

        if not step["reached"]:
            status, border, opacity = t("gate_skip", lang), "rgba(128,128,128,0.35)", "0.5"
        elif step["passed"]:
            status, border, opacity = t("gate_pass", lang), STAGE_STYLE[de.STAGE_COLOR[stage]][1], "1"
        else:
            status, border, opacity = t("gate_fail", lang), "rgba(128,128,128,0.6)", "1"
        weight = "700" if step["reached"] and step["passed"] else "400"
        st.markdown(
            f"""<div style="border:1px solid {border};border-left:6px solid {border};border-radius:8px;
            padding:8px 14px;margin-bottom:6px;opacity:{opacity};display:flex;gap:16px;flex-wrap:wrap;
            align-items:baseline;">
            <span style="min-width:190px;font-weight:{weight};">{t('gate', lang, n=i)} · {t('stage_' + stage, lang)}</span>
            <span style="flex:1;min-width:220px;font-family:monospace;font-size:0.9rem;">{rule}</span>
            <span style="font-weight:{weight};">{status}</span></div>""",
            unsafe_allow_html=True,
        )
    st.caption(t("no_injury_note", lang))


def render_reality(row: dict, lang: str):
    st.markdown(f"#### {t('reality_title', lang)}")
    if not row["has_year3"]:
        st.info(t("reality_none", lang))
    else:
        if row["call_correct"]:
            st.success(t("reality_correct", lang))
        else:
            st.error(t("reality_wrong", lang))
        cols = st.columns(2)
        cols[0].metric(t("m_actual_ws", lang), f"{row['Year3_WS']:.1f}",
                       delta=t("vs_pred", lang, d=row["Year3_WS"] - row["Pred_WS"]),
                       delta_color="off")
        cols[1].metric(t("m_dtw", lang), f"{row['Dynamic_Truth_WS']:.2f}")
        st.caption(t("reality_explain", lang))

    facts = []
    for key, col in [("team_kept_y3", "year_3"), ("team_kept_y4", "year_4")]:
        val = str(row.get(col, "")).strip().lower()
        if val in ("yes", "no"):
            facts.append(f"{t(key, lang)}: **{t(val, lang)}**")
    outcome = row.get("Outcome_Label")
    if row["color"] == "red" and isinstance(outcome, str):
        facts.append(f"{t('outcome_label', lang)}: **{t('outcome_' + outcome, lang)}**")
    if facts:
        st.markdown(" · ".join(facts))


def render_llm_report_button(key_prefix: str, row: dict, lang: str):
    if st.button(t("llm_button", lang), key=f"{key_prefix}_report_btn"):
        used = st.session_state.get("reports_used", 0)
        if used >= MAX_REPORTS_PER_SESSION:
            st.warning(t("llm_limit", lang))
            return
        with st.spinner(t("llm_spinner", lang)):
            try:
                report = generate_scouting_report(row, lang)
                st.session_state["reports_used"] = used + 1
                st.markdown(t("llm_title", lang))
                st.write(report)
            except ReportGenerationError as e:
                st.error(str(e))


# ---------------------------------------------------------------- tabs

def persistent_selectbox(container, label, options, default, format_func, name, lang):
    """選單 key 帶語言，切換語言時選項文字會更新；選取值另存於 session_state 以免切換後被重設。"""
    saved = st.session_state.get(f"{name}_value", default)
    index = options.index(saved) if saved in options else options.index(default) if default in options else 0
    value = container.selectbox(label, options, index=index, format_func=format_func, key=f"{name}_{lang}")
    st.session_state[f"{name}_value"] = value
    return value


def lookup_tab(lang: str):
    df = decided()
    years = de.list_cohort_years()
    c1, c2 = st.columns([1, 2])
    year = persistent_selectbox(c1, t("cohort", lang), years, 2020,
                                lambda y: cohort_label(y, lang), "lookup_year", lang)
    cohort = df[df["year_start"] == year].sort_values("DraftRank")
    names = cohort["Player"].tolist()
    picks = dict(zip(cohort["Player"], cohort["DraftRank"].astype(int)))
    player = persistent_selectbox(c2, t("player", lang), names, "Darius Garland",
                                  lambda p: f"#{picks[p]} · {p}", "lookup_player", lang)
    st.caption(t("cohort_note", lang))

    row = de.evaluate_historical_player(int(year), player, df)
    render_decision_card(row, lang)
    left, right = st.columns([3, 2], gap="large")
    with left:
        render_waterfall(row, lang)
    with right:
        render_reality(row, lang)
        st.write("")
        render_llm_report_button("hist", row, lang)


def cohort_tab(lang: str):
    df = decided()
    years = de.list_cohort_years()
    year = persistent_selectbox(st, t("cohort", lang), years, 2023,
                                lambda y: cohort_label(y, lang), "cohort_year", lang)
    d = df[df["year_start"] == year]
    st.markdown(f"#### {t('cohort_title', lang)}")
    st.caption(t("cohort_caption", lang))
    st.plotly_chart(charts.cohort_scatter(d, lang), width="stretch")
    with st.expander(t("table_view", lang)):
        st.dataframe(_player_table(d, lang), hide_index=True, width="stretch")


def _player_table(d: pd.DataFrame, lang: str) -> pd.DataFrame:
    out = pd.DataFrame({
        t("pick", lang): d["DraftRank"].astype(int),
        t("player", lang): d["Player"],
        t("decision", lang): d["color"].map(lambda c: color_label(c, lang)),
        t("col_stage", lang): d["stage"].map(lambda s: t(f"stage_{s}", lang)),
        t("m_pred_ws", lang): d["Pred_WS"].round(2),
        t("m_actual_ws", lang): d["Year3_WS"],
        t("m_dtw", lang): d["Dynamic_Truth_WS"].round(2),
        t("m_ans", lang): d["Adjusted_Net_Surplus"].round(2),
        t("col_correct", lang): d["call_correct"].map(
            lambda v: "—" if pd.isna(v) else ("✅" if v else "❌")),
    })
    return out.sort_values(t("pick", lang))


def backtest_tab(lang: str):
    df = decided()
    s = de.backtest_summary(df)
    st.markdown(f"#### {t('bt_title', lang)}")
    k = st.columns(4)
    k[0].metric(t("bt_kpi_split", lang), f"{s['blue']} / {s['green']} / {s['red']}")
    k[1].metric(t("bt_kpi_hit", lang), f"{s['hit_rate']:.1%}",
                help=t("bt_kpi_hit_help", lang, b=s["red_below"], n=s["red_labeled"]))
    k[2].metric(t("bt_kpi_net", lang), f"+{s['net']:.1f}",
                help=t("bt_kpi_net_help", lang, a=s["avoided"], s=s["sacrificed"]))
    k[3].metric(t("bt_kpi_mae", lang), f"{s['red_mae']:.2f} WS", help=t("bt_kpi_mae_help", lang))

    left, right = st.columns([3, 2], gap="large")
    with left:
        st.markdown(f"##### {t('bt_by_year', lang)}")
        st.plotly_chart(charts.yearly_stacked(df, lang), width="stretch")
    with right:
        st.markdown(f"##### {t('bt_confusion', lang)}")
        c = st.columns(2)
        c[0].metric(t("cm_keep_good", lang), s["TP"])
        c[1].metric(t("cm_keep_bad", lang), s["FP"])
        c = st.columns(2)
        c[0].metric(t("cm_decline_bad", lang), s["TN"])
        c[1].metric(t("cm_decline_good", lang), s["FN"])
        st.markdown(f"**{t('accuracy', lang, a=s['accuracy'])}**")
        st.caption(t("bt_confusion_caption", lang))

    st.markdown(f"##### {t('bt_acc_title', lang)}")
    st.caption(t("bt_acc_caption", lang))
    meta = de.get_model_meta()
    rmse = meta["test_rmse"]
    seen = df[df["Year3_WS"].notna()]
    err = (seen["Year3_WS"] - seen["Pred_WS"]).abs()
    left, right = st.columns([3, 1], gap="large")
    left.plotly_chart(charts.pred_vs_actual(df, rmse, lang), width="stretch", config={"displayModeBar": False})
    with right:
        st.metric(t("bt_acc_within", lang), f"{(err <= rmse).mean():.1%}",
                  help=t("bt_acc_within_help", lang, k=int((err <= rmse).sum()), n=len(seen)))
        st.metric(t("bt_acc_mae", lang), f"{err.mean():.2f} WS")
        st.metric(t("bt_acc_r2", lang), f"{meta['test_r2']:.3f}")
        st.metric(t("bt_acc_rmse", lang), f"{rmse:.2f} WS")

    st.markdown(f"##### {t('bt_red_list', lang)}")
    red = df[df["color"] == "red"].sort_values(["year_start", "DraftRank"])
    table = _player_table(red, lang)
    table.insert(0, t("cohort", lang), red["year_start"].values)
    table[t("outcome_label", lang)] = red["Outcome_Label"].map(
        lambda v: t(f"outcome_{v}", lang) if isinstance(v, str) else "—").values
    table = table.drop(columns=[t("decision", lang), t("col_stage", lang)])
    st.dataframe(table, hide_index=True, width="stretch")


def whatif_tab(lang: str):
    st.markdown(f"#### {t('wi_title', lang)}")
    st.caption(t("wi_caption", lang))
    for key, val in DEFAULTS.items():
        st.session_state.setdefault(key, val)
    if st.button(t("wi_reset", lang)):
        for key, val in DEFAULTS.items():
            st.session_state[key] = val

    c = st.columns(3)
    rmse = c[0].slider(t("wi_rmse", lang), 0.5, 2.0, step=0.05, key="wi_rmse", help=t("wi_rmse_help", lang))
    pct = c[1].slider(t("wi_pct", lang), 50, 95, step=5, key="wi_pct", help=t("wi_pct_help", lang))
    star = c[2].slider(t("wi_star", lang), 1.0, 2.5, step=0.1, key="wi_star", help=t("wi_star_help", lang))

    base_df = decided()
    base = de.backtest_summary(base_df)
    now_df = decided(float(rmse), pct / 100, float(star))
    now = de.backtest_summary(now_df)

    k = st.columns(4)
    k[0].metric(t("bt_kpi_split", lang), f"{now['blue']} / {now['green']} / {now['red']}",
                delta=f"{now['red'] - base['red']:+d} {t('color_red', lang)}", delta_color="off")
    k[1].metric(t("bt_kpi_hit", lang), f"{now['hit_rate']:.1%}",
                delta=f"{(now['hit_rate'] - base['hit_rate']) * 100:+.1f} pp")
    k[2].metric(t("bt_kpi_net", lang), f"{now['net']:+.1f}", delta=f"{now['net'] - base['net']:+.1f}")
    k[3].metric(t("accuracy_short", lang), f"{now['accuracy']:.1%}", delta=f"{(now['accuracy'] - base['accuracy']) * 100:+.1f} pp")

    sweep = buffer_sweep(pct / 100, float(star))
    c = st.columns(3)
    c[0].plotly_chart(charts.sensitivity_line(sweep, "red", t("wi_curve_red", lang), rmse, lang, fmt=".0f"),
                      width="stretch")
    c[1].plotly_chart(charts.sensitivity_line(sweep, "net", t("wi_curve_net", lang), rmse, lang),
                      width="stretch")
    c[2].plotly_chart(charts.sensitivity_line(sweep, "hit", t("wi_curve_hit", lang) + " (%)", rmse, lang,
                                              y_range=[0, 105]), width="stretch")
    st.caption(t("wi_tradeoff", lang))

    st.markdown(f"##### {t('wi_changed', lang)}")
    merged = base_df[["Player", "year_start", "DraftRank", "color", "Pred_WS", "Year3_WS", "Dynamic_Truth_WS"]].merge(
        now_df[["Player", "year_start", "color"]], on=["Player", "year_start"], suffixes=("_base", "_now"))
    changed = merged[merged["color_base"] != merged["color_now"]].sort_values(["year_start", "DraftRank"])
    if changed.empty:
        st.write(t("wi_none_changed", lang))
    else:
        st.dataframe(pd.DataFrame({
            t("cohort", lang): changed["year_start"],
            t("pick", lang): changed["DraftRank"].astype(int),
            t("player", lang): changed["Player"],
            t("wi_from", lang): changed["color_base"].map(lambda c: color_label(c, lang)),
            t("wi_to", lang): changed["color_now"].map(lambda c: color_label(c, lang)),
            t("m_pred_ws", lang): changed["Pred_WS"].round(2),
            t("m_actual_ws", lang): changed["Year3_WS"],
            t("m_dtw", lang): changed["Dynamic_Truth_WS"].round(2),
        }), hide_index=True, width="stretch")


def manual_tab(lang: str):
    st.markdown(f"#### {t('manual_title', lang)}")
    st.caption(t("manual_caption", lang))
    st.caption(t("manual_model_note", lang))
    years = de.list_cohort_years()
    with st.form("manual_player_form"):
        c1, c2, c3 = st.columns(3)
        player_name = c1.text_input(t("manual_name", lang), value="")
        compare_year = c2.selectbox(t("manual_compare", lang), years, index=len(years) - 1,
                                    format_func=lambda y: cohort_label(y, lang), key=f"manual_year_{lang}")
        draft_rank = c3.number_input(t("manual_pick", lang), min_value=1, max_value=30, value=15)
        position = st.radio(t("manual_pos", lang), POSITIONS, horizontal=True)

        stats = {}
        for title, fields, step, expanded in [("manual_shooting", SHOOTING_FIELDS, 0.01, True),
                                              ("manual_box", BOXSCORE_FIELDS, 0.1, False),
                                              ("manual_adv", ADVANCED_FIELDS, 0.1, False)]:
            with st.expander(t(title, lang), expanded=expanded):
                cols = st.columns(4)
                for i, field in enumerate(fields):
                    stats[field] = cols[i % 4].number_input(field, value=0.0, step=step, key=f"m_{field}")
        submitted = st.form_submit_button(t("manual_submit", lang))

    if submitted:
        if not player_name.strip():
            st.error(t("manual_need_name", lang))
            return
        for pos in POSITIONS:
            stats[f"Pos_{pos}"] = 1 if pos == position else 0
        stats["Player"] = player_name
        with st.spinner(t("manual_spinner", lang)):
            st.session_state["manual_result"] = de.evaluate_manual_player(
                stats, draft_rank=draft_rank, draft_year=int(compare_year))

    if "manual_result" in st.session_state:
        row = st.session_state["manual_result"]
        render_decision_card(row, lang, show_actual=False)
        render_waterfall(row, lang)
        render_llm_report_button("manual", row, lang)


def main():
    with st.sidebar:
        lang = st.radio("Language / 語言", list(LANGS), format_func=LANGS.get, horizontal=True, key="lang")

    st.markdown(CSS, unsafe_allow_html=True)
    try:
        meta = de.get_model_meta()
    except FileNotFoundError:
        st.error(t("no_model", lang))
        st.stop()
    render_header(lang, meta)

    with st.sidebar:
        st.markdown(f"### {t('model_info', lang)}")
        st.caption(t("model_desc", lang))
        st.write(f"Test R²: **{meta['test_r2']:.3f}** · RMSE: **{meta['test_rmse']:.2f}** WS")
        st.markdown("---")
        st.markdown(f"**{t('legend_title', lang)}**\n\n{t('legend_body', lang)}")
        st.markdown("---")
        st.caption(t("cohort_note", lang))
        st.markdown(f"[GitHub]({REPO_URL})")

    tabs = st.tabs([t(k, lang) for k in ["tab_lookup", "tab_cohort", "tab_backtest", "tab_whatif", "tab_manual"]])
    with tabs[0]:
        lookup_tab(lang)
    with tabs[1]:
        cohort_tab(lang)
    with tabs[2]:
        backtest_tab(lang)
    with tabs[3]:
        whatif_tab(lang)
    with tabs[4]:
        manual_tab(lang)


if __name__ == "__main__":
    main()
