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
    <div className="min-h-screen bg-[#0D1722] text-[#F8FAFC] flex items-center justify-center p-6 tactical-grid relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#2E5339]/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[250px] bg-[#B88B4A]/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.push("/host/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#94A3B8] hover:text-[#F8FAFC] transition-colors mb-6"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Kembali ke Dashboard
          </button>
          <div className="w-16 h-16 bg-[#1C2D42] border border-[#B88B4A]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#B88B4A]">
            <span
              className="material-symbols-outlined text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              quiz
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#F8FAFC] tracking-tight">
            Buat Quiz Baru
          </h1>
          <p className="text-[#94A3B8] mt-2 text-sm">
            Beri nama dulu, lalu tambahkan pertanyaanmu di editor.
          </p>
        </div>

        {/* Card */}
        <div className="tactical-card rounded-3xl border border-[#283E58]/60 bg-[#121F2E] p-8 sm:p-10 shadow-2xl">
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label
                htmlFor="quiz-title"
                className="block text-[11px] font-mono font-bold uppercase tracking-widest text-[#94A3B8] mb-2"
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
                placeholder="contoh: Kuis Sejarah & Sains 2026"
                autoFocus
                autoComplete="off"
                maxLength={120}
                disabled={creating}
                className={`w-full px-4 py-3.5 rounded-xl border bg-[#0A121B] text-[#F8FAFC] text-base font-semibold placeholder:text-[#64748B] focus:outline-none transition-all ${error
                  ? "border-error focus:border-error"
                  : "border-[#283E58] focus:border-[#B88B4A] focus:ring-1 focus:ring-[#B88B4A]"
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
              <p className="mt-1.5 text-xs text-[#64748B] font-mono">
                {title.length}/120 karakter
              </p>
            </div>

            {/* Tips */}
            <div className="bg-[#142232] border border-[#283E58]/60 rounded-xl p-4 flex items-start gap-3">
              <span
                className="material-symbols-outlined text-[#B88B4A] text-[20px] mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lightbulb
              </span>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Kamu bisa mengubah nama quiz kapan saja di editor. Setelah memberi nama, quiz akan langsung tersimpan sebagai draft dan kamu bisa mulai menambahkan pertanyaan.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={creating || !title.trim()}
              whileHover={{ scale: creating ? 1 : 1.02 }}
              whileTap={{ scale: creating ? 1 : 0.97 }}
              className="w-full py-4 rounded-xl bg-[#B88B4A] text-[#0D1722] hover:bg-[#D4A76A] font-black text-sm shadow-[0_4px_20px_rgba(184,139,74,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0D1722]/30 border-t-[#0D1722] rounded-full animate-spin" />
                  Membuat Quiz...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-[18px]"
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
        <p className="text-center text-xs text-[#64748B] mt-6 font-mono">
          Quiz tersimpan otomatis saat kamu mengedit pertanyaan.
        </p>
      </motion.div>
    </div>
  );
}
