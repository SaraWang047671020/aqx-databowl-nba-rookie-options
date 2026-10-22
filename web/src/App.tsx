import { useEffect, useMemo, useState } from "react";
import { Dot, UiContext } from "./components/ui";
import { classify, MODEL_META, summarize } from "./lib/engine";
import { t, type Lang } from "./lib/i18n";
import { readTheme, type ChartTheme } from "./lib/theme";
import Backtest from "./tabs/Backtest";
import Cohort from "./tabs/Cohort";
import Lookup, { type Selection } from "./tabs/Lookup";
import Manual from "./tabs/Manual";
import WhatIf from "./tabs/WhatIf";

const REPO_URL = "https://github.com/SaraWang047671020/aqx-databowl-nba-rookie-options";
const TABS = [
  ["lookup", "tab_lookup"], ["cohort", "tab_cohort"], ["backtest", "tab_backtest"],
  ["whatif", "tab_whatif"], ["manual", "tab_manual"],
] as const;
type Tab = (typeof TABS)[number][0];
type ThemeMode = "auto" | "light" | "dark";

function load<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* 無痕模式等情況忽略 */ }
}

function initialTab(): Tab {
  const h = window.location.hash.slice(1) as Tab;
  return TABS.some(([k]) => k === h) ? h : "lookup";
}

export default function App() {
  const browserLang: Lang = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  const [lang, setLang] = useState<Lang>(() => load("lang", ["en", "zh"] as const, browserLang));
  const [mode, setMode] = useState<ThemeMode>(() => load("theme", ["auto", "light", "dark"] as const, "auto"));
  const [theme, setTheme] = useState<ChartTheme>(readTheme);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sel, setSel] = useState<Selection>({ year: 2020, player: "Darius Garland" });
  const [cohortYear, setCohortYear] = useState(2023);

  const decided = useMemo(() => classify(), []);
  const s = useMemo(() => summarize(decided), [decided]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    document.title = t("app_title", lang);
    save("lang", lang);
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", mode);
    save("theme", mode);
    setTheme(readTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(readTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  useEffect(() => {
    const onHash = () => setTab(initialTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function openTab(k: Tab) {
    setTab(k);
    history.replaceState(null, "", `#${k}`);
  }

  const tr = (key: string, args?: Record<string, string | number>) => t(key, lang, args);

  return (
    <UiContext.Provider value={{ lang, theme }}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><span className="brand-mark" aria-hidden>🏀</span><span className="brand-text">{tr("app_title")}</span></div>
          <div className="toggle" role="group" aria-label="Language / 語言">
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
            <button aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>繁中</button>
          </div>
          <div className="toggle" role="group" aria-label={tr("theme")}>
            {(["auto", "light", "dark"] as const).map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{tr(`theme_${m}`)}</button>
            ))}
          </div>
          <a className="icon-link" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <span className="badge">{tr("hero_badge")}</span>
          <h1>{tr("app_title")}</h1>
          <p>{tr("app_caption")}</p>
          <div className="hero-stats">
            <div className="hero-stat"><b>{s.n}</b><span>{tr("hero_stat_players")}</span></div>
            <div className="hero-stat"><b>{MODEL_META.r2.toFixed(3)}</b><span>{tr("hero_stat_r2")}</span></div>
            <div className="hero-stat"><b>{(s.hitRate * 100).toFixed(1)}%</b><span>{tr("hero_stat_hit")}</span></div>
            <div className="hero-stat"><b>+{s.net.toFixed(1)}</b><span>{tr("bt_kpi_net")}</span></div>
          </div>
        </section>

        <nav className="tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => openTab(k)}>{tr(label)}</button>
          ))}
        </nav>

        <div className="legend-row" style={{ marginBottom: 16 }}>
          <span><Dot color="blue" />{tr("legend_profit")}</span>
          <span><Dot color="green" />{tr("legend_keep")}</span>
          <span><Dot color="red" />{tr("legend_reject")}</span>
        </div>

        <div role="tabpanel">
          {tab === "lookup" && <Lookup decided={decided} sel={sel} setSel={setSel} />}
          {tab === "cohort" && <Cohort decided={decided} year={cohortYear} setYear={setCohortYear} />}
          {tab === "backtest" && <Backtest decided={decided} />}
          {tab === "whatif" && <WhatIf base={decided} />}
          {tab === "manual" && <Manual />}
        </div>

        <footer className="footer">
          <span>{tr("footer")}</span>
          <span>Lasso · Test R² {MODEL_META.r2.toFixed(3)} · RMSE {MODEL_META.rmse.toFixed(2)} WS · <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a></span>
        </footer>
      </main>
    </UiContext.Provider>
  );
}
