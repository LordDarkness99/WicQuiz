"use client";

import { useReadabilityMode } from "@/shared/hooks/useReadabilityMode";

/**
 * Floating button that turns dyslexia/low-vision friendly reading mode
 * on and off. Placed once in the root layout so it's available on every page.
 */
export default function ReadabilityToggle() {
  const { enabled, toggle } = useReadabilityMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={
        enabled ? "Turn off easy-reading mode" : "Turn on easy-reading mode"
      }
      className={`
        fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full
        px-4 py-3 font-bold shadow-lg border-2 transition-colors
        cursor-pointer text-sm
        ${
          enabled
            ? "bg-navy text-white border-navy"
            : "bg-white text-navy border-navy/30 hover:border-navy"
        }
      `}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: "20px" }}
        aria-hidden="true"
      >
        visibility
      </span>
      <span className="hidden sm:inline">
        {enabled ? "Easy reading: On" : "Easy reading"}
      </span>
    </button>
  );
}