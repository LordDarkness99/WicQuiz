"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "quiztime-readability-mode";

type ReadabilityContextValue = {
  enabled: boolean;
  toggle: () => void;
};

const ReadabilityContext = createContext<ReadabilityContextValue | null>(
  null
);

/**
 * Wraps the app and applies a dyslexia/low-vision friendly reading mode
 * (Atkinson Hyperlegible font, wider letter/line spacing, calmer contrast)
 * by toggling a class on <html>. Preference is remembered in localStorage.
 */
export function ReadabilityModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "on") setEnabled(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("readability-mode", enabled);
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  }, [enabled, hydrated]);

  const toggle = () => setEnabled((prev) => !prev);

  return (
    <ReadabilityContext.Provider value={{ enabled, toggle }}>
      {children}
    </ReadabilityContext.Provider>
  );
}

export function useReadabilityMode() {
  const ctx = useContext(ReadabilityContext);
  if (!ctx) {
    throw new Error(
      "useReadabilityMode must be used within a ReadabilityModeProvider"
    );
  }
  return ctx;
}