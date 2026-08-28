"use client";

import { useCallback, useRef, useState } from "react";
import { uploadQuizImage } from "@/integrations/supabase/storage";

interface ImageUploadProps {
  value: string;
  onChange: (url: string | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File must be under 5MB.");
        return;
      }

      setUploading(true);
      try {
        const url = await uploadQuizImage(file);
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
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

  // Preview mode — show uploaded image
  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden">
        <img
          src={value}
          alt="Question image"
          className="w-full max-h-64 object-contain bg-surface-container-low rounded-xl"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-on-surface/70 text-white flex items-center justify-center hover:bg-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    );
  }

  // Dropzone mode
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
            <p className="text-sm font-bold text-primary">Uploading…</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary-fixed/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">
                cloud_upload
              </span>
            </div>
            <p className="text-sm font-bold text-primary">
              Drop image here or{" "}
              <span className="text-secondary-container underline">
                click to upload
              </span>
            </p>
            <p className="text-xs text-outline mt-2">
              PNG, JPG, GIF up to 5MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
