"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getHostId } from "@/shared/hostIdentity";
import { createDraftTemplate } from "@/features/quiz-authoring";

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Masukkan nama quiz terlebih dahulu.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const hostId = getHostId();
      const templateId = await createDraftTemplate(hostId, trimmed);
      toast.success(`Quiz "${trimmed}" dibuat! Tambahkan pertanyaanmu 🎉`);
      router.push(`/host/quiz/${templateId}/edit`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat quiz.";
      setError(msg);
      toast.error(msg);
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-container/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-outline hover:text-primary transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke Dashboard
          </button>
          <div className="w-16 h-16 bg-secondary-container/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span
              className="material-symbols-outlined text-[32px] text-secondary-container"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              quiz
            </span>
          </div>
          <h1 className="text-3xl font-black text-primary tracking-tight">
            Buat Quiz Baru
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Beri nama dulu, lalu tambahkan pertanyaanmu di editor.
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-[0px_20px_60px_rgba(27,43,94,0.06)] p-8">
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label
                htmlFor="quiz-title"
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2"
              >
                Nama Quiz
              </label>
              <input
                id="quiz-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="contoh: Kuis Sejarah Indonesia 2024"
                autoFocus
                autoComplete="off"
                maxLength={120}
                disabled={creating}
                className={`w-full px-4 py-3.5 rounded-xl border bg-surface text-on-surface text-lg font-semibold placeholder:text-on-surface-variant/30 focus:outline-none transition-colors ${
                  error
                    ? "border-error focus:border-error"
                    : "border-outline-variant/40 focus:border-primary"
                }`}
              />
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2 text-xs text-error font-medium flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <p className="mt-1.5 text-xs text-outline">
                {title.length}/120 karakter
              </p>
            </div>

            {/* Tips */}
            <div className="bg-surface-container rounded-xl p-4 flex items-start gap-3">
              <span
                className="material-symbols-outlined text-primary text-[18px] mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lightbulb
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Kamu bisa mengubah nama quiz kapan saja di editor. Setelah memberi nama, quiz akan langsung tersimpan sebagai draft dan kamu bisa mulai menambahkan pertanyaan.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={creating || !title.trim()}
              whileHover={{ scale: creating ? 1 : 1.02 }}
              whileTap={{ scale: creating ? 1 : 0.97 }}
              className="w-full py-4 rounded-xl bg-secondary-container text-white font-extrabold text-base shadow-[0px_10px_30px_rgba(174,47,52,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Membuat Quiz...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    edit_note
                  </span>
                  Lanjut ke Editor
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-outline mt-6">
          Quiz tersimpan otomatis saat kamu mengedit pertanyaan.
        </p>
      </motion.div>
    </div>
  );
}
