"use client";

import { useEffect, useRef, useState } from "react";

interface SpeakButtonProps {
  text: string;
  className?: string;
  /** Speak automatically once when `text` changes (used with the "Read
   * questions aloud" accessibility setting so new questions are announced
   * without the player needing to tap anything). */
  autoSpeak?: boolean;
  lang?: string;
}

/**
 * Small speaker-icon button that reads the given text aloud using the
 * browser's built-in speech synthesis — no external dependency required.
 * Helps low-vision, dyslexic, or non-reading players follow along.
 */
export default function SpeakButton({
  text,
  className = "",
  autoSpeak = false,
  lang = "id-ID",
}: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const lastAutoSpokenRef = useRef<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
  }, []);

  function speak() {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  useEffect(() => {
    if (!autoSpeak || !supported) return;
    if (!text.trim()) return;
    if (lastAutoSpokenRef.current === text) return;
    lastAutoSpokenRef.current = text;
    speak();
    return () => {
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoSpeak, supported]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      aria-label={speaking ? "Stop reading aloud" : "Read aloud"}
      title={speaking ? "Stop reading aloud" : "Read aloud"}
      className={`inline-flex items-center justify-center rounded-full transition-colors cursor-pointer ${className}`}
    >
      <span
        className={`material-symbols-outlined ${speaking ? "animate-pulse" : ""}`}
        aria-hidden="true"
      >
        {speaking ? "volume_up" : "volume_up"}
      </span>
    </button>
  );
}
