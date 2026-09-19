"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getCurrentUser } from "@/features/auth";
import { getProfile, updateProfile, type Profile } from "../data/profileRepository";
import { getQuizTemplates } from "@/features/quiz-authoring";
import { getSessionResults } from "@/features/session-results";
import { ImageUpload } from "@/features/media";
import { getHostId } from "@/shared/hostIdentity";

export default function ProfileRoute() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/auth/login?returnTo=/host/profile");
          return;
        }
        setUserId(user.id);
        setEmail(user.email);

        const effectiveId = user.id || getHostId();
        const [p, templates, sessions] = await Promise.all([
          getProfile(user.id),
          getQuizTemplates(effectiveId),
          getSessionResults(effectiveId),
        ]);

        const initialName = p?.display_name || user.displayName || "";
        setProfile(p);
        setDisplayName(initialName);
        setAvatarUrl(p?.avatar_url ?? null);
        setTotalQuizzes(templates.length);
        setTotalGames(sessions.length);
        setTotalPlayers(sessions.reduce((sum, s) => sum + s.player_count, 0));
      } catch {
        toast.error("Gagal memuat profil.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    if (!displayName.trim()) {
      toast.warning("Nama tampilan tidak boleh kosong.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(userId, {
        displayName,
        avatarUrl,
      });
      setProfile(updated);
      toast.success("Profil berhasil diperbarui.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui profil.");
    } finally {
      setSaving(false);
    }
  }, [userId, displayName, avatarUrl]);

  const hasChanges =
    displayName.trim() !== (profile?.display_name || "") ||
    (avatarUrl ?? null) !== (profile?.avatar_url ?? null);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="bg-surface-bright border-b border-outline-variant/30 px-8 py-4 flex items-center gap-4 sticky top-0 z-50">
        <button
          onClick={() => router.push("/host/dashboard")}
          className="flex items-center gap-1.5 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Dashboard
        </button>
        <div className="h-8 w-px bg-outline-variant/30" />
        <span className="text-sm font-bold text-on-surface">My Profile</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 shadow-sm p-8"
        >
          <h1 className="text-2xl font-extrabold text-on-surface mb-1">Profile</h1>
          <p className="text-sm text-on-surface-variant mb-8">
            Manage how your name and avatar appear as a quiz host.
          </p>

          {/* Avatar */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">
              Avatar
            </label>
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center flex-shrink-0 border border-outline-variant/20">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[36px] text-outline/40">
                    account_circle
                  </span>
                )}
              </div>
              <div className="flex-1">
                <ImageUpload value={avatarUrl ?? ""} onChange={setAvatarUrl} />
              </div>
            </div>
          </div>

          {/* Display name */}
          <div className="mb-6">
            <label
              htmlFor="displayName"
              className="block text-xs font-bold uppercase tracking-widest text-outline mb-2"
            >
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-widest text-outline mb-2">
              Email
            </label>
            <div className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface-variant font-medium">
              {email}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full py-3.5 rounded-xl bg-secondary-container text-on-secondary-container font-extrabold text-sm shadow-[0px_10px_20px_rgba(255,107,107,0.2)] disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 mt-6"
        >
          {[
            { label: "Quizzes Created", value: totalQuizzes, icon: "quiz" },
            { label: "Games Hosted", value: totalGames, icon: "sports_esports" },
            { label: "Total Players", value: totalPlayers, icon: "group" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-4 text-center"
            >
              <span className="material-symbols-outlined text-outline block mb-1">
                {stat.icon}
              </span>
              <p className="text-xl font-black text-on-surface leading-none">{stat.value}</p>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/host/history")}
            className="text-sm font-bold text-[#D4A76A] hover:text-[#B88B4A] hover:underline inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            View quiz history
          </button>
        </div>
      </main>
    </div>
  );
}
