"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "quiztime-accessibility-settings";

export type FontMode = "default" | "readable" | "dyslexic";
export type FontSize = "default" | "large" | "xlarge";
export type BgTheme = "default" | "soft" | "dark" | "contrast";
export type ColorMode = "default" | "colorblind";

export type AccessibilitySettings = {
  fontMode: FontMode;
  fontSize: FontSize;
  bgTheme: BgTheme;
  colorMode: ColorMode;
  speakText: boolean;
};

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontMode: "default",
  fontSize: "default",
  bgTheme: "default",
  colorMode: "default",
  speakText: false,
};

type AccessibilityContextValue = {
  settings: AccessibilitySettings;
  setFontMode: (mode: FontMode) => void;
  setFontSize: (size: FontSize) => void;
  setBgTheme: (theme: BgTheme) => void;
  setColorMode: (mode: ColorMode) => void;
  setSpeakText: (enabled: boolean) => void;
  reset: () => void;
  /** True if any setting differs from the defaults. */
  isCustomized: boolean;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null
);

function readStoredSettings(): AccessibilitySettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Wraps the app and applies "easy reading" accessibility preferences —
 * font choice (a friendlier default typeface, or a dyslexia-tuned one),
 * text size, and a calmer background theme — by setting data attributes
 * on <html>. Preferences are remembered in localStorage.
 */
export function ReadabilityModeProvider({ children }: { children: ReactNode }) {
  // Server-rendered markup always starts from the defaults; the real
  // (possibly customized) settings are read once we're on the client.
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setSettings(readStoredSettings());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const html = document.documentElement;
    html.setAttribute("data-font-mode", settings.fontMode);
    html.setAttribute("data-font-size", settings.fontSize);
    html.setAttribute("data-bg-theme", settings.bgTheme);
    html.setAttribute("data-color-mode", settings.colorMode);
    // Kept for any old styles/tests that still key off this class.
    html.classList.toggle("readability-mode", settings.fontMode !== "default");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  const setFontMode = (fontMode: FontMode) =>
    setSettings((prev) => ({ ...prev, fontMode }));
  const setFontSize = (fontSize: FontSize) =>
    setSettings((prev) => ({ ...prev, fontSize }));
  const setBgTheme = (bgTheme: BgTheme) =>
    setSettings((prev) => ({ ...prev, bgTheme }));
  const setColorMode = (colorMode: ColorMode) =>
    setSettings((prev) => ({ ...prev, colorMode }));
  const setSpeakText = (speakText: boolean) =>
    setSettings((prev) => ({ ...prev, speakText }));
  const reset = () => setSettings(DEFAULT_SETTINGS);

  const isCustomized =
    settings.fontMode !== DEFAULT_SETTINGS.fontMode ||
    settings.fontSize !== DEFAULT_SETTINGS.fontSize ||
    settings.bgTheme !== DEFAULT_SETTINGS.bgTheme ||
    settings.colorMode !== DEFAULT_SETTINGS.colorMode ||
    settings.speakText !== DEFAULT_SETTINGS.speakText;

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        setFontMode,
        setFontSize,
        setBgTheme,
        setColorMode,
        setSpeakText,
        reset,
        isCustomized,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useReadabilityMode() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useReadabilityMode must be used within a ReadabilityModeProvider"
    );
  }
  return ctx;
}

// Preferred name going forward — same hook, clearer now that it covers
// more than just the old on/off reading mode.
export const useAccessibilitySettings = useReadabilityMode;
