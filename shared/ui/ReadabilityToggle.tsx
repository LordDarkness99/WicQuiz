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

const BG_OPTIONS: { value: BgTheme; label: string; swatch: string; border: string }[] = [
  { value: "soft", label: "Soft cream", swatch: "#F5F2EB", border: "#D6D0C4" },
  { value: "default", label: "Obsidian", swatch: "#0D1722", border: "#B88B4A" },
  { value: "dark", label: "Dark slate", swatch: "#16181D", border: "#333944" },
  { value: "contrast", label: "High contrast", swatch: "#000000", border: "#FFFFFF" },
];

/**
 * Floating button + panel for easy-reading accessibility settings: font
 * choice (incl. a dyslexia-tuned typeface), text size, and background
 * theme. Placed once in the root layout so it's available on every page.
 */
export default function ReadabilityToggle() {
  const {
    settings,
    setFontMode,
    setFontSize,
    setBgTheme,
    setColorMode,
    setSpeakText,
    reset,
    isCustomized,
  } = useReadabilityMode();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleToggleSpeak = () => {
    const next = !settings.speakText;
    setSpeakText(next);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        next
          ? "Voice reader assistance activated. Quiz questions will be read aloud."
          : "Voice reader assistance deactivated."
      );
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTestSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "This is an example of quiz question reading with WicQuiz audio assistance."
      );
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

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
          className="readability-panel absolute bottom-full right-0 mb-3 w-[calc(100vw-2rem)] sm:w-84 rounded-2xl border border-[#B88B4A]/30 bg-[#121F2E]/95 backdrop-blur-xl p-5 shadow-2xl text-[#F8FAFC]"
        >
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#283E58]">
            <p className="text-sm font-extrabold text-[#F8FAFC] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#B88B4A]">tune</span>
              Reading Settings
            </p>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B88B4A] bg-[#B88B4A]/10 px-2 py-0.5 rounded">
              Accessibility
            </span>
          </div>

          <fieldset className="mb-4">
            <legend className="mb-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              Typography
            </legend>
            <div className="flex flex-col gap-1.5">
              {FONT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={settings.fontMode === opt.value}
                  onClick={() => setFontMode(opt.value)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all cursor-pointer ${settings.fontMode === opt.value
                    ? "border-[#B88B4A] bg-[#B88B4A]/20 text-[#F8FAFC] shadow-xs"
                    : "border-[#283E58] bg-[#162536]/40 text-[#94A3B8] hover:border-[#B88B4A]/40 hover:text-white"
                    }`}
                >
                  <span className="font-semibold text-xs">{opt.label}</span>
                  <span
                    className={`text-[11px] ${settings.fontMode === opt.value ? "text-[#B88B4A]" : "text-[#64748B]"
                      }`}
                  >
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
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
                  className={`flex-1 rounded-xl border py-1.5 font-bold transition-all cursor-pointer ${settings.fontSize === opt.value
                    ? "border-[#B88B4A] bg-[#B88B4A] text-[#0D1722] shadow-xs"
                    : "border-[#283E58] bg-[#162536]/40 text-[#94A3B8] hover:border-[#B88B4A]/40 hover:text-white"
                    }`}
                  style={{ fontSize: `${1 + i * 0.2}rem` }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              Theme & Contrast
            </legend>
            <div className="grid grid-cols-4 gap-1.5">
              {BG_OPTIONS.map((opt) => {
                const isLight = opt.value === "soft";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={settings.bgTheme === opt.value}
                    onClick={() => setBgTheme(opt.value)}
                    title={opt.label}
                    className={`h-9 flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer ${isLight ? "theme-swatch-soft" : "theme-swatch-dark"
                      } ${settings.bgTheme === opt.value
                        ? "border-[#B88B4A] scale-105 shadow-md ring-2 ring-[#B88B4A]/40"
                        : "border-[#283E58] hover:border-[#B88B4A]/50"
                      }`}
                    style={{
                      background: opt.swatch,
                      borderColor: settings.bgTheme === opt.value ? "#B88B4A" : opt.border,
                    }}
                  >
                    <span
                      className="text-[9px] font-bold tracking-tight"
                      style={{ color: isLight ? "#1A1A1A" : "#FFFFFF" }}
                    >
                      {opt.label.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={reset}
            disabled={!isCustomized}
            className="w-full rounded-xl border border-[#283E58] py-2 text-xs font-bold text-[#94A3B8] transition-colors hover:border-[#B88B4A]/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
          >
            Reset to default
          </button>

          <fieldset className="mt-4">
            <legend className="mb-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]">
              Assistance
            </legend>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-pressed={settings.colorMode === "colorblind"}
                onClick={() =>
                  setColorMode(settings.colorMode === "colorblind" ? "default" : "colorblind")
                }
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors cursor-pointer ${settings.colorMode === "colorblind"
                  ? "border-[#B88B4A] bg-[#B88B4A]/20 text-[#F8FAFC]"
                  : "border-[#283E58] bg-[#162536]/40 text-[#94A3B8] hover:border-[#B88B4A]/40 hover:text-white"
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>Colorblind indicator</span>
                  {settings.colorMode === "colorblind" && (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/40">
                      Active
                    </span>
                  )}
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#B88B4A]" aria-hidden="true">
                  palette
                </span>
              </button>

              <div
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${settings.speakText
                  ? "border-[#B88B4A] bg-[#B88B4A]/20 text-[#F8FAFC]"
                  : "border-[#283E58] bg-[#162536]/40 text-[#94A3B8]"
                  }`}
              >
                <button
                  type="button"
                  aria-pressed={settings.speakText}
                  onClick={handleToggleSpeak}
                  className="flex items-center gap-1.5 flex-1 text-left cursor-pointer hover:text-white"
                >
                  <span>Read questions aloud</span>
                  {settings.speakText && (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/40">
                      Active
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleTestSpeech}
                    title="Try voice test now"
                    className="text-[10px] px-2 py-0.5 rounded bg-[#B88B4A]/30 text-[#D4A76A] hover:bg-[#B88B4A]/50 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[12px]">play_arrow</span>
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleSpeak}
                    aria-label="Toggle voice"
                    className="p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#B88B4A]" aria-hidden="true">
                      volume_up
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-pressed={isCustomized}
        aria-expanded={open}
        title="Easy reading settings"
        className={`
          readability-trigger flex items-center gap-2 rounded-full
          px-4 py-2.5 font-extrabold shadow-xl border transition-all
          cursor-pointer text-xs tracking-wide
          ${isCustomized
            ? "bg-[#B88B4A] text-[#0D1722] border-[#B88B4A] shadow-[0_0_20px_rgba(184,139,74,0.35)]"
            : "bg-[#142232]/90 backdrop-blur-md text-[#F8FAFC] border-[#283E58] hover:border-[#B88B4A]/70 hover:shadow-[0_0_15px_rgba(184,139,74,0.2)]"
          }
        `}
      >
        <span
          className="material-symbols-outlined text-[#B88B4A]"
          style={{ fontSize: "18px" }}
          aria-hidden="true"
        >
          visibility
        </span>
        <span className="hidden sm:inline">
          {isCustomized ? "Reading: Active" : "Accessibility"}
        </span>
      </button>
    </div>
  );
}
