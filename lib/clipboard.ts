"use client";

/**
 * Copy text to the clipboard.
 *
 * `navigator.clipboard` only exists in secure contexts (https / localhost), so
 * on a plain-http admin session it is undefined and the copy silently fails.
 * Fall back to a hidden textarea + execCommand so the buttons work everywhere,
 * and report success so the UI can show a real error instead of a fake
 * "Kopieret!".
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
