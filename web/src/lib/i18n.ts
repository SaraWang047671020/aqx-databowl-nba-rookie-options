/**
 * 介面文字：主體沿用 Streamlit 版（webapp/i18n.py → src/data/strings.json），
 * 本檔只補網頁版新增或需改寫的字串。佔位符沿用 Python format 語法，例如 {v:+.2f}、{a:.1%}。
 */
import base from "../data/strings.json" with { type: "json" };
import { COPY } from "./copy";

export type Lang = "en" | "zh";
type Entry = { en: string; zh?: string };

const EXTRA: Record<string, Entry> = {
  app_title: { en: "NBA Rookie Team-Option Decision System", zh: "NBA 新秀選擇權決策系統" },
  legend_profit: { en: "Exercise — clear surplus", zh: "絕對獲利，建議執行" },
  legend_keep: { en: "Keep — rescued by a safety net", zh: "防護網保留" },
  legend_reject: { en: "Decline — stop loss", zh: "建議止損" },
  llm_title: { en: "Scouting report", zh: "球探報告" },
  llm_note: {
    en: "Written by an OpenAI model from the numbers on this page only.",
    zh: "由 OpenAI 模型僅根據本頁數據撰寫。",
  },
  llm_error: { en: "The report could not be generated. Please try again.", zh: "報告生成失敗，請再試一次。" },
  theme: { en: "Theme", zh: "主題" },
  theme_light: { en: "Light", zh: "淺色" },
  theme_dark: { en: "Dark", zh: "深色" },
  theme_auto: { en: "Auto", zh: "自動" },
  footer: {
    en: "Built for the AQX Sports Analytics Data Bowl 4.0. Data: Basketball-Reference, news sentiment (NLP). Open source.",
    zh: "為 AQX Sports Analytics Data Bowl 4.0 製作。資料來源：Basketball-Reference、新聞輿情 NLP。開放原始碼。",
  },
  search_player: { en: "Search any player…", zh: "搜尋球員…" },
  no_match: { en: "No matching player", zh: "找不到符合的球員" },
  show_table: { en: "Show table", zh: "顯示表格" },
  hide_table: { en: "Hide table", zh: "隱藏表格" },
  manual_example: { en: "Fill with an example player", zh: "填入範例數據" },
  manual_reset: { en: "Clear", zh: "清除" },
  manual_spi_found: { en: "Star Power Index found for this name: {v:.4f}", zh: "找到此球員的商業聲量指數：{v:.4f}" },
  manual_blank: {
    en: "Leave a field blank if unknown; the model fills it with the training median.",
    zh: "不確定的欄位可留空，模型會以訓練資料的中位數補值。",
  },
  wi_hint: { en: "Changes are computed instantly in your browser.", zh: "所有重算都在你的瀏覽器即時完成。" },
};

const STRINGS: Record<string, Entry> = { ...(base as Record<string, Entry>), ...EXTRA, ...COPY };

const SPEC = /\{(\w+)(?::([+]?)(?:\.(\d+))?([fd%]))?\}/g;

/** 支援 {x}、{x:.2f}、{x:+.2f}、{x:.1%}、{x:+d}。 */
export function format(template: string, args: Record<string, string | number> = {}): string {
  return template.replace(SPEC, (whole, name: string, sign: string, digits: string, kind: string) => {
    if (!(name in args)) return whole;
    const v = args[name];
    if (!kind || typeof v !== "number") return String(v);
    let n = v;
    let suffix = "";
    if (kind === "%") { n = v * 100; suffix = "%"; }
    const text = kind === "d" ? Math.round(n).toString() : n.toFixed(digits ? Number(digits) : 6);
    const signed = sign === "+" && n >= 0 ? `+${text}` : text;
    return signed + suffix;
  });
}

export function t(key: string, lang: Lang, args?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return format(entry[lang] ?? entry.en, args);
}

/** 去掉 Streamlit 版字串開頭的 emoji 圖示（網頁版改用自己的圖示）。 */
export function plain(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{2139}⚪✅❌🔵🟢🔴]+\s*/u, "");
}
