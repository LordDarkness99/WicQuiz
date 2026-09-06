"use client";

import { useEffect, useRef, useState } from "react";
import {
  useReadabilityMode,
  type BgTheme,
  type FontMode,
  type FontSize,
} from "@/shared/hooks/useReadabilityMode";

const FONT_OPTIONS: { value: FontMode; label: string; hint: string }[] = [
  { value: "default", label: "Default", hint: "Plus Jakarta Sans" },
  { value: "readable", label: "Easy reading", hint: "Atkinson Hyperlegible" },
  { value: "dyslexic", label: "Dyslexia-friendly", hint: "OpenDyslexic" },
];

const SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "default", label: "A" },
  { value: "large", label: "A" },
  { value: "xlarge", label: "A" },
];

const BG_OPTIONS: { value: BgTheme; label: string; swatch: string }[] = [
  { value: "default", label: "Default", swatch: "#FAFAF7" },
  { value: "soft", label: "Soft cream", swatch: "#F0EADC" },
  { value: "dark", label: "Dark", swatch: "#1A1A1A" },
  { value: "contrast", label: "High contrast", swatch: "#000000" },
];

/**
 * Floating button + panel for easy-reading accessibility settings: font
 * choice (incl. a dyslexia-tuned typeface), text size, and background
 * theme. Placed once in the root layout so it's available on every page.
 */
export default function ReadabilityToggle() {
  const { settings, setFontMode, setFontSize, setBgTheme, reset, isCustomized } =
    useReadabilityMode();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="Easy reading settings"
          className="absolute bottom-full right-0 mb-3 w-72 rounded-2xl border-2 border-navy/15 bg-white p-4 shadow-xl"
        >
          <p className="mb-3 text-sm font-bold text-navy">Easy reading settings</p>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-navy/60">
              Font
            </legend>
            <div className="flex flex-col gap-1.5">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={settings.fontMode === opt.value}
                  onClick={() => setFontMode(opt.value)}
                  className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                    settings.fontMode === opt.value
                      ? "border-navy bg-navy text-white"
                      : "border-navy/15 text-navy hover:border-navy/40"
                  }`}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span
                    className={`text-xs ${
                      settings.fontMode === opt.value ? "text-white/70" : "text-navy/50"
                    }`}
                  >
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-navy/60">
              Text size
            </legend>
            <div className="flex gap-1.5">
              {SIZE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={settings.fontSize === opt.value}
                  onClick={() => setFontSize(opt.value)}
                  title={opt.value}
                  className={`flex-1 rounded-lg border-2 py-2 font-bold transition-colors cursor-pointer ${
                    settings.fontSize === opt.value
                      ? "border-navy bg-navy text-white"
                      : "border-navy/15 text-navy hover:border-navy/40"
                  }`}
                  style={{ fontSize: `${1 + i * 0.25}rem` }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-navy/60">
              Background
            </legend>
            <div className="flex gap-1.5">
              {BG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={settings.bgTheme === opt.value}
                  onClick={() => setBgTheme(opt.value)}
                  title={opt.label}
                  className={`h-9 flex-1 rounded-lg border-2 transition-transform cursor-pointer ${
                    settings.bgTheme === opt.value
                      ? "border-navy scale-105"
                      : "border-navy/15 hover:border-navy/40"
                  }`}
                  style={{ background: opt.swatch }}
                >
                  <span className="sr-only">{opt.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={reset}
            disabled={!isCustomized}
            className="w-full rounded-lg border-2 border-navy/15 py-1.5 text-xs font-semibold text-navy/70 transition-colors hover:border-navy/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            Reset to default
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-pressed={isCustomized}
        aria-expanded={open}
        title="Easy reading settings"
        className={`
          flex items-center gap-2 rounded-full
          px-4 py-3 font-bold shadow-lg border-2 transition-colors
          cursor-pointer text-sm
          ${
            isCustomized
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
          {isCustomized ? "Easy reading: On" : "Easy reading"}
        </span>
      </button>
    </div>
  );
}
