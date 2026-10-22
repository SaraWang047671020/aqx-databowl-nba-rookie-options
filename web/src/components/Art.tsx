/**
 * 網站插圖：籃球場線條與圖示，全部是自繪 SVG（無版權問題、任何解析度都清晰）。
 * 球場比例依 NBA 規格（94 × 50 英尺，1 英尺 = 10 單位）。
 */
import type { ReactNode, SVGProps } from "react";

function HalfCourt() {
  return (
    <g>
      {/* 禁區、罰球圈 */}
      <rect x="0" y="170" width="190" height="160" />
      <circle cx="190" cy="250" r="60" />
      {/* 籃框、籃板、合理衝撞區 */}
      <line x1="40" y1="220" x2="40" y2="280" />
      <circle cx="52.5" cy="250" r="7.5" />
      <path d="M52.5 210 A40 40 0 0 1 52.5 290" />
      {/* 三分線：底角直線 + 弧線 */}
      <line x1="0" y1="30" x2="140" y2="30" />
      <line x1="0" y1="470" x2="140" y2="470" />
      <path d="M140 30 A237.5 237.5 0 0 1 140 470" />
    </g>
  );
}

export function Court(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="-10 -10 960 520" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden {...props}>
      <rect x="0" y="0" width="940" height="500" />
      <line x1="470" y1="0" x2="470" y2="500" />
      <circle cx="470" cy="250" r="60" />
      <circle cx="470" cy="250" r="20" />
      <HalfCourt />
      <g transform="translate(940 0) scale(-1 1)"><HalfCourt /></g>
    </svg>
  );
}

/**
 * 主視覺背景：照片（選用）+ 深色漸層 + 透視球場 + 光暈。
 * 照片放在 public/images/hero.jpg（首頁）與 band.jpg（各頁頁首），檔案不存在時只顯示插畫。
 */
export function CourtBackdrop({ variant = "hero" }: { variant?: "hero" | "band" }) {
  return (
    <div className={`backdrop backdrop-${variant}`} aria-hidden>
      <div className="backdrop-photo" />
      <div className="backdrop-glow" />
      <Court className="backdrop-court" />
      <div className="backdrop-grain" />
    </div>
  );
}

type IconProps = { size?: number };
function Icon({ size = 24, children }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const Icons = {
  ball: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18" /><path d="M5.6 5.6c3 2.6 3 10.2 0 12.8M18.4 5.6c-3 2.6-3 10.2 0 12.8" /></Icon>
  ),
  data: (p: IconProps) => (
    <Icon {...p}><ellipse cx="12" cy="5.5" rx="7" ry="2.5" /><path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" /><path d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" /></Icon>
  ),
  predict: (p: IconProps) => (
    <Icon {...p}><path d="M3 20h18" /><path d="M5 16l4-5 3 3 6-8" /><path d="M15 6h3v3" /></Icon>
  ),
  value: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.5-.9-1.5-1.4-2.6-1.4-1.5 0-2.6.8-2.6 2s1.1 1.7 2.7 2.1c1.6.4 2.7.9 2.7 2.2s-1.2 2.1-2.8 2.1c-1.2 0-2.3-.6-2.8-1.5M12 6.3v1.5M12 16.2v1.5" /></Icon>
  ),
  decide: (p: IconProps) => (
    <Icon {...p}><path d="M4 4h16l-6 7v6l-4 3v-9z" /></Icon>
  ),
  news: (p: IconProps) => (
    <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></Icon>
  ),
  search: (p: IconProps) => (
    <Icon {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></Icon>
  ),
  grid: (p: IconProps) => (
    <Icon {...p}><circle cx="7" cy="16" r="1.6" /><circle cx="11" cy="9" r="1.6" /><circle cx="16" cy="13" r="1.6" /><circle cx="18" cy="6" r="1.6" /><path d="M3 21h18M3 3v18" /></Icon>
  ),
  chart: (p: IconProps) => (
    <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>
  ),
  sliders: (p: IconProps) => (
    <Icon {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Icon>
  ),
  plus: (p: IconProps) => (
    <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Icon>
  ),
  arrow: (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>,
  menu: (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>,
  close: (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>,
  sparkle: (p: IconProps) => (
    <Icon {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" /></Icon>
  ),
  github: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
};
export type IconName = keyof typeof Icons;
