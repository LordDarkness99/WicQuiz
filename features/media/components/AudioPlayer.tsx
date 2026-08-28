"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AudioPlayerProps {
  audioUrl: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        e.target === document.body
      ) {
        e.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = fraction * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed text-[10px] font-bold uppercase tracking-widest mb-4">
        <span className="material-symbols-outlined text-sm">music_note</span>
        AUDIO ROUND
      </div>

      <div className="bg-primary rounded-xl p-8">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />

        <div className="flex items-center gap-6">
          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-secondary-container text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform shrink-0"
          >
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>

          <div className="flex-1 space-y-2">
            {/* Progress bar */}
            <div
              onClick={handleProgressClick}
              className="h-3 bg-white/20 rounded-full cursor-pointer group relative"
            >
              <div
                className="h-full bg-tertiary-fixed-dim rounded-full transition-[width] duration-100 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs font-bold text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs font-medium mt-4">
          Press spacebar to play/pause
        </p>
      </div>
    </div>
  );
}
