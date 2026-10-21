"""Plotly 圖表。決策色以點形狀作為第二編碼，色覺辨識障礙者亦可區分。"""
import plotly.graph_objects as go

from i18n import t

COLOR_HEX = {"blue": "#2a78d6", "green": "#1baf7a", "red": "#e34948"}
COLOR_SYMBOL = {"blue": "circle", "green": "diamond", "red": "x"}
COLOR_ORDER = ["blue", "green", "red"]
MUTED = "#8a8984"


def _base_layout(fig, height=420, **kwargs):
    fig.update_layout(
        height=height,
        margin=dict(l=10, r=10, t=30, b=10),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
        hoverlabel=dict(align="left"),
        **kwargs,
    )
    fig.update_xaxes(showgrid=False, zeroline=False)
    fig.update_yaxes(gridcolor="rgba(128,128,128,0.18)", zeroline=False)
    return fig


def cohort_scatter(df, lang):
    """X＝合約成本，Y＝預期價值；虛線上方為預期獲利。"""
    fig = go.Figure()
    lo = 0
    hi = max(df["Est_Cost_Percent"].max(), df["Pred_Salary_Share_Percent"].max()) * 1.05
    fig.add_trace(go.Scatter(
        x=[lo, hi], y=[lo, hi], mode="lines", line=dict(color=MUTED, dash="dash", width=1.5),
        name=t("breakeven", lang), hoverinfo="skip",
    ))
    for color in COLOR_ORDER:
        d = df[df["color"] == color]
        if d.empty:
            continue
        actual = d["Year3_WS"].map(lambda v: "—" if v != v else f"{v:.1f}")
        stage = d["stage"].map(lambda s: t(f"stage_{s}", lang))
        fig.add_trace(go.Scatter(
            x=d["Est_Cost_Percent"], y=d["Pred_Salary_Share_Percent"], mode="markers",
            name=t(f"color_{color}", lang),
            marker=dict(color=COLOR_HEX[color], symbol=COLOR_SYMBOL[color], size=11,
                        line=dict(width=1.5, color="white")),
            customdata=list(zip(d["Player"], d["DraftRank"].astype(int), d["Pred_WS"], actual, stage)),
            hovertemplate=(
                "<b>%{customdata[0]}</b> · #%{customdata[1]}<br>"
                + t("m_cost", lang) + ": %{x:.2f}<br>"
                + t("m_value", lang) + ": %{y:.2f}<br>"
                + t("m_pred_ws", lang) + ": %{customdata[2]:.2f}<br>"
                + t("m_actual_ws", lang) + ": %{customdata[3]}<br>"
                + t("col_stage", lang) + ": %{customdata[4]}<extra></extra>"
            ),
        ))
    fig.update_xaxes(title=t("m_cost", lang), range=[0, df["Est_Cost_Percent"].max() * 1.08])
    fig.update_yaxes(title=t("m_value", lang))
    return _base_layout(fig, height=480)


def yearly_stacked(df, lang):
    counts = df.groupby(["year_start", "color"]).size().unstack(fill_value=0)
    fig = go.Figure()
    for color in COLOR_ORDER:
        if color not in counts:
            continue
        fig.add_trace(go.Bar(
            x=counts.index.astype(str), y=counts[color], name=t(f"color_{color}", lang),
            marker=dict(color=COLOR_HEX[color], line=dict(width=1, color="white")),
            hovertemplate="%{x}: %{y}<extra>" + t(f"color_{color}", lang) + "</extra>",
        ))
    fig.update_layout(barmode="stack", bargap=0.35)
    fig.update_xaxes(title=t("cohort", lang), type="category")
    return _base_layout(fig, height=360)


def sensitivity_line(sweep, y_col, y_title, current_x, lang, fmt=".1f", y_range=None):
    """單一指標對容錯倍數的曲線；目前設定以垂直線標示（不使用雙 Y 軸）。"""
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=sweep["multiplier"], y=sweep[y_col], mode="lines+markers",
        line=dict(color=COLOR_HEX["blue"], width=2), marker=dict(size=8),
        hovertemplate=t("wi_curve_x", lang) + " %{x:.2f}<br>" + y_title + ": %{y:" + fmt + "}<extra></extra>",
        showlegend=False,
    ))
    fig.add_vline(x=current_x, line=dict(color=MUTED, dash="dot", width=1.5),
                  annotation_text=t("wi_current", lang), annotation_position="top")
    fig.update_xaxes(title=t("wi_curve_x", lang))
    fig.update_yaxes(title=None, range=y_range)
    fig.update_layout(title=dict(text=y_title, font=dict(size=14)))
    return _base_layout(fig, height=300)
