import { useState, type ReactNode } from "react";
import { MODEL_META } from "../lib/engine";
import type { Lang } from "../lib/i18n";
import { href, type Route } from "../lib/router";
import { CourtBackdrop, Icons } from "./Art";
import { useT } from "./ui";

export const REPO_URL = "https://github.com/SaraWang047671020/aqx-databowl-nba-rookie-options";
export const STREAMLIT_URL = "https://aqx-databowl-nba-rookie-options-ca5mtsplouqtjfxwktnrku.streamlit.app/";

export type ThemeMode = "auto" | "light" | "dark";

/** 導覽列上的頁面（首頁由品牌標誌連結） */
export const NAV: { route: Route; key: string }[] = [
  { route: "player", key: "nav_player" },
  { route: "cohort", key: "nav_cohort" },
  { route: "results", key: "nav_results" },
  { route: "live", key: "nav_live" },
  { route: "simulator", key: "nav_simulator" },
  { route: "new", key: "nav_new" },
  { route: "models", key: "nav_models" },
  { route: "method", key: "nav_method" },
  { route: "about", key: "nav_about" },
];

const THEME_NEXT: Record<ThemeMode, ThemeMode> = { auto: "light", light: "dark", dark: "auto" };
const THEME_GLYPH: Record<ThemeMode, string> = { auto: "◐", light: "☀", dark: "☾" };

export function Navbar({ route, lang, setLang, mode, setMode }: {
  route: Route; lang: Lang; setLang: (l: Lang) => void; mode: ThemeMode; setMode: (m: ThemeMode) => void;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const links = NAV.map((n) => (
    <a key={n.route} href={href(n.route)} aria-current={route === n.route ? "page" : undefined} onClick={() => setOpen(false)}>
      {tr(n.key)}
    </a>
  ));
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href={href("home")} onClick={() => setOpen(false)}>
          <span className="nav-logo"><Icons.ball size={20} /></span>
          <span className="nav-brand-text">
            <b>Rookie Option Lab</b>
            <small>{lang === "zh" ? "NBA 新秀選擇權決策" : "NBA team-option decisions"}</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Main">{links}</nav>
        <div className="nav-tools">
          <div className="seg" role="group" aria-label="Language / 語言">
            <button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
            <button aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>中</button>
          </div>
          <button className="nav-icon" onClick={() => setMode(THEME_NEXT[mode])}
            title={`${tr("theme")}: ${tr(`theme_${mode}`)}`} aria-label={`${tr("theme")}: ${tr(`theme_${mode}`)}`}>
            <span aria-hidden>{THEME_GLYPH[mode]}</span>
          </button>
          <a className="nav-icon" href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub"><Icons.github size={18} /></a>
          <button className="nav-icon nav-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={tr("menu")}>
            {open ? <Icons.close size={20} /> : <Icons.menu size={20} />}
          </button>
        </div>
      </div>
      {open && <nav className="nav-drawer" aria-label="Main">{links}</nav>}
    </header>
  );
}

/** 各頁頁首：深色帶狀背景 + 球場線條 */
export function PageHero({ kicker, title, desc, children }: { kicker?: string; title: string; desc?: string; children?: ReactNode }) {
  return (
    <section className="page-hero">
      <CourtBackdrop variant="band" />
      <div className="container page-hero-inner">
        {kicker && <span className="eyebrow">{kicker}</span>}
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
        {children}
      </div>
    </section>
  );
}

export function Footer() {
  const tr = useT();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <a className="nav-brand" href={href("home")}>
            <span className="nav-logo"><Icons.ball size={20} /></span>
            <span className="nav-brand-text"><b>Rookie Option Lab</b></span>
          </a>
          <p className="footer-tag">{tr("footer_tag")}</p>
        </div>
        <div>
          <h4>{tr("footer_pages")}</h4>
          <ul>
            <li><a href={href("home")}>{tr("nav_home")}</a></li>
            {NAV.map((n) => <li key={n.route}><a href={href(n.route)}>{tr(n.key)}</a></li>)}
            <li><a href={href("references")}>{tr("nav_refs")}</a></li>
          </ul>
        </div>
        <div>
          <h4>{tr("footer_project")}</h4>
          <ul>
            <li><a href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a></li>
            <li><a href={STREAMLIT_URL} target="_blank" rel="noreferrer">Streamlit</a></li>
            <li><span className="muted">Lasso · R² {MODEL_META.r2.toFixed(3)} · RMSE {MODEL_META.rmse.toFixed(2)} WS</span></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">{tr("footer_disclaimer")}</div>
    </footer>
  );
}
