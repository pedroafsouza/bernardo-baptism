"use client";

/**
 * Counts an opened invitation, once per visit.
 *
 * A guest opening their invitation five times in an evening is one person
 * looking forward to it, not five arrivals, so the visit is recorded once per
 * browser tab session and never again until they come back another time.
 */
import { useEffect } from "react";

export default function VisitTracker({ code, lang }: { code: string; lang: string }) {
  useEffect(() => {
    const key = `visit:${code}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing without storage: count it and move on.
    }
    void fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, lang, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [code, lang]);

  return null;
}
