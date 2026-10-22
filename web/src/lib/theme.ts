/** 讀取目前 CSS 主題色，供 Plotly 使用（Plotly 不吃 CSS 變數）。 */
export interface ChartTheme {
  text: string; muted: string; grid: string; band: string; actual: string; surface: string; neutral: string;
}

export function readTheme(): ChartTheme {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    text: v("--text-2"), muted: v("--muted"), grid: v("--grid"), band: v("--band"),
    actual: v("--actual"), surface: v("--surface"), neutral: v("--neutral"),
  };
}

export const LIGHT_HEX = { blue: "#2a78d6", green: "#1baf7a", red: "#e34948" } as const;
export const LIGHT_SYMBOL = { blue: "circle", green: "diamond", red: "x" } as const;
export const LIGHT_ORDER = ["blue", "green", "red"] as const;
