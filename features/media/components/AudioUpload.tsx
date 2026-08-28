"use client";

import { useCallback, useRef, useState } from "react";
import { uploadQuizAudio } from "@/integrations/supabase/storage";

interface AudioUploadProps {
  onUpload: (url: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function AudioUpload({ onUpload }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.type.startsWith("audio/")) {
        setError("Please upload an audio file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File must be under 10MB.");
        return;
      }

      setUploading(true);
      try {
        const url = await uploadQuizAudio(file);
        onUpload(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-outline-variant rounded-xl p-12 flex flex-col items-center justify-center bg-surface group hover:bg-surface-container transition-all cursor-pointer"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-primary">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-tertiary-fixed/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-3xl">
                audio_file
              </span>
            </div>
            <p className="text-sm font-bold text-primary">
              Drop audio file here or{" "}
              <span className="text-secondary-container underline">
                click to upload
              </span>
            </p>
            <p className="text-xs text-outline mt-2">
              MP3, WAV, OGG up to 10MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
      {error && (
        <p className="text-sm text-[#FF6B6B] font-medium mt-2">{error}</p>
      )}
    </div>
  );
}
