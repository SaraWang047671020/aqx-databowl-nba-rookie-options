import { useEffect, useState } from "react";

/** 以網址 hash 切換頁面（#/player），不需額外套件，也能直接分享某一頁的連結。 */
export const ROUTES = ["home", "method", "player", "cohort", "results", "simulator", "new", "about"] as const;
export type Route = (typeof ROUTES)[number];

// 舊版分頁網址（#lookup 等）導向新頁面
const LEGACY: Record<string, Route> = {
  lookup: "player", backtest: "results", whatif: "simulator", manual: "new", cohort: "cohort",
};

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "");
  if ((ROUTES as readonly string[]).includes(raw)) return raw as Route;
  return LEGACY[raw] ?? "home";
}

export function href(route: Route): string {
  return route === "home" ? "#/" : `#/${route}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onHash = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
