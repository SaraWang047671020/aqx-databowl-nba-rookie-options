import { useEffect, useState } from "react";

/** 以網址 hash 切換頁面（#/player、#/report/2020/Darius%20Garland），不需額外套件，也能直接分享連結。 */
export const ROUTES = ["home", "method", "player", "cohort", "results", "simulator", "new", "about", "report"] as const;
export type Route = (typeof ROUTES)[number];
export interface Location { route: Route; args: string[] }

// 舊版分頁網址（#lookup 等）導向新頁面
const LEGACY: Record<string, Route> = {
  lookup: "player", backtest: "results", whatif: "simulator", manual: "new", cohort: "cohort",
};

function parse(): Location {
  const [head = "", ...rest] = window.location.hash.replace(/^#\/?/, "").split("/");
  const args = rest.map((a) => decodeURIComponent(a));
  if ((ROUTES as readonly string[]).includes(head)) return { route: head as Route, args };
  return { route: LEGACY[head] ?? "home", args: [] };
}

export function href(route: Route, ...args: (string | number)[]): string {
  if (route === "home") return "#/";
  return `#/${[route, ...args.map((a) => encodeURIComponent(String(a)))].join("/")}`;
}

export function useLocation(): Location {
  const [loc, setLoc] = useState<Location>(parse);
  useEffect(() => {
    const onHash = () => {
      setLoc(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return loc;
}
