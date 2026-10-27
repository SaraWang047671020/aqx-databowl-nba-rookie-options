import { useEffect, useMemo, useState } from "react";
import { Footer, Navbar, type ThemeMode } from "./components/Shell";
import { UiContext } from "./components/ui";
import { classify, classifyAll, type Decided } from "./lib/engine";
import { t, type Lang } from "./lib/i18n";
import { useLocation } from "./lib/router";
import { readTheme, type ChartTheme } from "./lib/theme";
import About from "./pages/About";
import Backtest from "./pages/Backtest";
import Cohort from "./pages/Cohort";
import Home from "./pages/Home";
import Live from "./pages/Live";
import Lookup, { type Selection } from "./pages/Lookup";
import Manual from "./pages/Manual";
import Method from "./pages/Method";
import Models from "./pages/Models";
import References from "./pages/References";
import Report from "./pages/Report";
import WhatIf from "./pages/WhatIf";

const NAV_TITLE: Record<string, string> = {
  method: "nav_method", player: "nav_player", cohort: "nav_cohort", results: "nav_results",
  simulator: "nav_simulator", new: "nav_new", about: "nav_about", report: "nav_report", live: "nav_live", models: "nav_models", references: "nav_refs",
};

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

export default function App() {
  const browserLang: Lang = navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
  const [lang, setLang] = useState<Lang>(() => load("lang", ["en", "zh"] as const, browserLang));
  const [mode, setMode] = useState<ThemeMode>(() => load("theme", ["auto", "light", "dark"] as const, "auto"));
  const [theme, setTheme] = useState<ChartTheme>(readTheme);
  const { route, args } = useLocation();
  const [manualResult, setManualResult] = useState<Decided | null>(null);
  const [sel, setSel] = useState<Selection>({ year: 2014, player: "Anthony Bennett" });
  const [cohortYear, setCohortYear] = useState(2023);

  const decided = useMemo(() => classify(), []); // 研究樣本：回測、參數模擬
  const decidedAll = useMemo(() => classifyAll(), []); // 含 2024、2025 新梯次

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    save("lang", lang);
  }, [lang]);

  useEffect(() => {
    const page = NAV_TITLE[route];
    const who = route === "report" && args[1] ? `${args[1]} · ` : "";
    document.title = page ? `${who}${t(page, lang)} · Rookie Option Lab` : `Rookie Option Lab · ${t("app_title", lang)}`;
  }, [route, args, lang]);

  // 報告頁：#/report/<梯次>/<球員> 或 #/report/new（新球員評估的結果）
  const reportManual = route === "report" && args[0] === "new";
  const reportPlayer = route !== "report" ? null
    : reportManual ? manualResult
      : decidedAll.find((p) => p.year_start === Number(args[0]) && p.Player === args[1]) ?? null;

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

  return (
    <UiContext.Provider value={{ lang, theme }}>
      <Navbar route={route} lang={lang} setLang={setLang} mode={mode} setMode={setMode} />
      <main>
        {route === "home" && <Home decided={decided} all={decidedAll} onPick={setSel} />}
        {route === "method" && <Method />}
        {route === "player" && <Lookup decided={decidedAll} sel={sel} setSel={setSel} />}
        {route === "cohort" && <Cohort decided={decidedAll} year={cohortYear} setYear={setCohortYear} />}
        {route === "results" && <Backtest decided={decided} all={decidedAll} />}
        {route === "live" && <Live decided={decidedAll} />}
        {route === "models" && <Models />}
        {route === "references" && <References />}
        {route === "simulator" && <WhatIf base={decided} />}
        {route === "new" && <Manual result={manualResult} setResult={setManualResult} />}
        {route === "report" && <Report p={reportPlayer} decided={decidedAll} isManual={reportManual} />}
        {route === "about" && <About />}
      </main>
      <Footer />
    </UiContext.Provider>
  );
}
