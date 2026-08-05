"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/Icon";

type Mode = "scores" | "answers" | "full";

const OPTIONS: {
  mode: Mode;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}[] = [
  {
    mode: "scores",
    title: "Nulstil topliste",
    description:
      "Sletter point, knogler og spilresultater for alle. Svar på invitationen røres ikke.",
    icon: "trophy",
    color: "bg-pastel-yellow",
  },
  {
    mode: "answers",
    title: "Nulstil svar",
    description:
      "Sætter alle gæster tilbage til \u201eafventer svar\u201c og rydder spilresultater. Gæstelisten og \u201einvitation sendt\u201c bevares.",
    icon: "pending",
    color: "bg-pastel-purple",
  },
  {
    mode: "full",
    title: "Nulstil hele databasen",
    description:
      "Sletter alle gæster og genskaber den oprindelige gæsteliste helt uden svar. Alt andet går tabt.",
    icon: "warning",
    color: "bg-pastel-pink",
  },
];

export default function DangerZone({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Mode | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(mode: Mode) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ mode, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Nulstilling mislykkedes");
      setResult(data.message);
      setPending(null);
      setConfirm("");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const active = OPTIONS.find((o) => o.mode === pending);

  return (
    <section className="mt-8 border-4 border-red-700 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 bg-red-100 text-[10px]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-red-800">
          <Icon name="warning" /> Farezone — nulstil database
        </span>
        <Icon name={open ? "up" : "right"} />
      </button>

      {open && (
        <div className="p-4">
          <p className="text-[9px] opacity-70 mb-4">
            Handlingerne kan ikke fortrydes. Serveren tager automatisk en backup ved hver
            udrulning, men ikke her.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {OPTIONS.map((o) => (
              <div key={o.mode} className={`border-4 border-black p-3 ${o.color}`}>
                <div className="text-[10px] mb-2 flex items-center gap-2">
                  <Icon name={o.icon} /> {o.title}
                </div>
                <p className="text-[8px] leading-relaxed mb-3 opacity-80">{o.description}</p>
                <button
                  onClick={() => {
                    setPending(o.mode);
                    setConfirm("");
                    setError(null);
                    setResult(null);
                  }}
                  className="pixel-btn bg-white border-2 border-black px-2 py-1 text-[9px] w-full"
                >
                  Vælg
                </button>
              </div>
            ))}
          </div>

          {result && (
            <p className="mt-4 text-[9px] text-green-700 flex items-center gap-2">
              <Icon name="done" /> {result}
            </p>
          )}
          {error && !pending && (
            <p className="mt-4 text-[9px] text-red-600 flex items-center gap-2">
              <Icon name="warning" /> {error}
            </p>
          )}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !busy && setPending(null)}
        >
          <div
            className="pixel-border bg-pastel-cream border-4 border-black p-5 w-full max-w-md text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[11px] mb-3 flex items-center gap-2 text-red-800">
              <Icon name="warning" /> {active.title}
            </h2>
            <p className="text-[9px] mb-4 leading-relaxed">{active.description}</p>
            <label className="block text-[8px] mb-1 opacity-70">
              Skriv RESET for at bekræfte
            </label>
            <input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="RESET"
              className="w-full border-4 border-black p-2 text-[10px] bg-white mb-3"
            />
            {error && (
              <p className="text-[9px] text-red-600 mb-3 flex items-center gap-2">
                <Icon name="warning" /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={confirm !== "RESET" || busy}
                onClick={() => run(active.mode)}
                className="pixel-btn bg-pastel-pink border-4 border-black py-2 px-4 text-[9px] flex items-center gap-2 disabled:opacity-40"
              >
                {busy ? <Icon name="spinner" spin /> : <Icon name="trash" />}
                {busy ? "Nulstiller…" : "Nulstil nu"}
              </button>
              <button
                disabled={busy}
                onClick={() => setPending(null)}
                className="pixel-btn bg-white border-4 border-black py-2 px-4 text-[9px] flex items-center gap-2"
              >
                <Icon name="close" /> Annuller
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
