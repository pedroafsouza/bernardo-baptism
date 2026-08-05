"use client";

import { useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";

export const LANG_PARAM = "lang";

/**
 * The `?lang=` query parameter is the single source of truth for the language:
 * nothing is remembered in storage, so a link always opens in the language it
 * carries and the current language is always visible (and shareable) in the URL.
 *
 * Updates go through `window.history.replaceState`, which Next keeps in sync
 * with `useSearchParams`, so the switch is instant and does not reset the page.
 */
export function useLangParam(): [string | null, (next: string) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  const current = params.get(LANG_PARAM);

  const setParam = useCallback(
    (next: string) => {
      if (typeof window === "undefined") return;
      const search = new URLSearchParams(window.location.search);
      search.set(LANG_PARAM, next);
      window.history.replaceState(null, "", `${pathname}?${search.toString()}`);
    },
    [pathname]
  );

  return [current, setParam];
}
