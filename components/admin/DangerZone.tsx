"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { useAdminLang, type AdminDict } from "@/lib/adminI18n";

type Mode = "scores" | "answers" | "full";

function buildOptions(t: AdminDict): {
  mode: Mode;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}[] {
  return [
    {
      mode: "scores",
      title: t.resetScoresTitle,
      description: t.resetScoresBody,
      icon: "trophy",
      color: "bg-pastel-yellow",
    },
    {
      mode: "answers",
      title: t.resetAnswersTitle,
      description: t.resetAnswersBody,
      icon: "pending",
      color: "bg-pastel-purple",
    },
    {
      mode: "full",
      title: t.resetAllTitle,
      description: t.resetAllBody,
      icon: "warning",
      color: "bg-pastel-pink",
    },
  ];
}

export default function DangerZone({ onDone }: { onDone: () => void }) {
  const { t } = useAdminLang();
  const options = buildOptions(t);
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
      if (!res.ok) throw new Error(data.error || t.resetFailed);
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

  const active = options.find((o) => o.mode === pending);

  return (
    <section className="mt-8 border-4 border-red-700 bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-3 bg-red-100 text-[16px]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-red-800">
          <Icon name="warning" /> {t.dangerZone}
        </span>
        <Icon name={open ? "up" : "right"} />
      </button>

      {open && (
        <div className="p-4">
          <p className="text-[14px] opacity-70 mb-4">
            {t.dangerIntro}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {options.map((o) => (
              <div key={o.mode} className={`border-4 border-black p-3 ${o.color}`}>
                <div className="text-[16px] mb-2 flex items-center gap-2">
                  <Icon name={o.icon} /> {o.title}
                </div>
                <p className="text-[13px] leading-relaxed mb-3 opacity-80">{o.description}</p>
                <button
                  onClick={() => {
                    setPending(o.mode);
                    setConfirm("");
                    setError(null);
                    setResult(null);
                  }}
                  className="pixel-btn bg-white border-2 border-black px-2 py-1 text-[14px] w-full"
                >
                  {t.choose}
                </button>
              </div>
            ))}
          </div>

          {result && (
            <p className="mt-4 text-[14px] text-green-700 flex items-center gap-2">
              <Icon name="done" /> {result}
            </p>
          )}
          {error && !pending && (
            <p className="mt-4 text-[14px] text-red-600 flex items-center gap-2">
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
            <h2 className="text-[17px] mb-3 flex items-center gap-2 text-red-800">
              <Icon name="warning" /> {active.title}
            </h2>
            <p className="text-[14px] mb-4 leading-relaxed">{active.description}</p>
            <label className="block text-[13px] mb-1 opacity-70">
              {t.typeResetToConfirm}
            </label>
            <input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="RESET"
              className="w-full border-4 border-black p-2 text-[16px] bg-white mb-3"
            />
            {error && (
              <p className="text-[14px] text-red-600 mb-3 flex items-center gap-2">
                <Icon name="warning" /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                disabled={confirm !== "RESET" || busy}
                onClick={() => run(active.mode)}
                className="pixel-btn bg-pastel-pink border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2 disabled:opacity-40"
              >
                {busy ? <Icon name="spinner" spin /> : <Icon name="trash" />}
                {busy ? t.resetting : t.resetNow}
              </button>
              <button
                disabled={busy}
                onClick={() => setPending(null)}
                className="pixel-btn bg-white border-4 border-black py-2 px-4 text-[14px] flex items-center gap-2"
              >
                <Icon name="close" /> {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
