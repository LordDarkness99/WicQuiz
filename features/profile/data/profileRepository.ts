import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateInput {
  displayName?: string;
  avatarUrl?: string | null;
}

/** Fetch the profile row for a given auth user id. Returns null if none exists. */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Update the current user's profile (display name / avatar) and keep the
 * auth user_metadata in sync so it's reflected everywhere immediately.
 */
export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput
): Promise<Profile> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.displayName !== undefined) patch.display_name = input.displayName.trim();
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Gagal memperbarui profil.");

  // Keep auth user_metadata in sync (used as fallback display name elsewhere).
  try {
    await supabase.auth.updateUser({
      data: {
        display_name: patch.display_name ?? undefined,
        avatar_url: patch.avatar_url ?? undefined,
      },
    });
  } catch {
    // Non-blocking — profiles table is the source of truth.
  }

  return data as Profile;
}
