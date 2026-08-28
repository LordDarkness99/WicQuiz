"use client";

import { useState } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  startSeconds?: number;
  endSeconds?: number;
}

function extractVideoId(url: string): string | null {
  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v=VIDEO_ID
  const longMatch = url.match(
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];

  // Handle youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

export default function VideoPlayer({
  videoUrl,
  startSeconds = 0,
  endSeconds,
}: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return (
      <div className="bg-primary rounded-xl p-8 text-center max-w-2xl mx-auto">
        <p className="text-white/60 font-medium">Invalid YouTube URL</p>
      </div>
    );
  }

  const params = new URLSearchParams({
    start: String(startSeconds),
    autoplay: "1",
    controls: "1",
  });
  if (endSeconds != null) {
    params.set("end", String(endSeconds));
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest mb-4">
        <span className="material-symbols-outlined text-sm">videocam</span>
        VIDEO ROUND
      </div>

      {playing ? (
        <div className="relative bg-primary rounded-xl overflow-hidden aspect-video">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Video question"
          />
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative bg-primary rounded-xl overflow-hidden aspect-video w-full group cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-secondary-container text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <span
                className="material-symbols-outlined text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_arrow
              </span>
            </div>
            <span className="mt-4 text-white font-bold text-lg">
              Play Clip
            </span>
          </div>
        </button>
      )}
    </div>
  );
}

export { extractVideoId };
