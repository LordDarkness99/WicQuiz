import { supabase, resetBrowserClient } from "@/integrations/supabase/client";
import type {
  RegisterFormData,
  LoginFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
  AuthUser,
} from "../domain/types";

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

/**
 * Register a new user with email, password, and display name.
 */
export async function registerWithEmail(
  data: RegisterFormData
): Promise<AuthResult> {
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          display_name: data.displayName.trim(),
        },
      },
    });

    if (error) {
      return { user: null, error: mapAuthError(error.message) };
    }

    if (!authData.user) {
      return { user: null, error: "Registrasi gagal. Silakan coba lagi." };
    }

    // Explicit fallback insert to profiles to ensure table consistency
    try {
      await supabase.from("profiles").upsert(
        {
          id: authData.user.id,
          display_name: data.displayName.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch {
      // Non-blocking if database trigger already handled it
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || data.email,
        displayName: data.displayName.trim(),
      },
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Terjadi kesalahan pada server.",
    };
  }
}

/**
 * Log in an existing user with email and password.
 */
export async function loginWithEmail(
  data: LoginFormData
): Promise<AuthResult> {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.trim(),
      password: data.password,
    });

    if (error) {
      return { user: null, error: mapAuthError(error.message) };
    }

    if (!authData.user) {
      return { user: null, error: "Login gagal. Periksa kembali email dan password." };
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email || data.email,
        displayName:
          authData.user.user_metadata?.display_name ||
          authData.user.user_metadata?.name,
      },
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat login.",
    };
  }
}

/**
 * Log out current authenticated session.
 */
export async function logoutUser(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };
    // Clear the in-memory singleton so the next user starts with a fresh client
    resetBrowserClient();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal logout." };
  }
}

/**
 * Send password reset email with recovery link.
 */
export async function sendPasswordResetEmail(
  data: ForgotPasswordFormData,
  redirectToUrl?: string
): Promise<{ error: string | null }> {
  try {
    const redirect =
      redirectToUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : undefined);

    const { error } = await supabase.auth.resetPasswordForEmail(
      data.email.trim(),
      { redirectTo: redirect }
    );

    if (error) return { error: mapAuthError(error.message) };
    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Gagal mengirimkan email reset password.",
    };
  }
}

/**
 * Update user's password after clicking reset link.
 */
export async function updatePassword(
  data: ResetPasswordFormData
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) return { error: mapAuthError(error.message) };
    return { error: null };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Gagal memperbarui password.",
    };
  }
}

/**
 * Get current authenticated user.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email || "",
      displayName:
        user.user_metadata?.display_name || user.user_metadata?.name,
    };
  } catch {
    return null;
  }
}

/**
 * Translates Supabase Auth error messages to clear Indonesian user messages.
 */
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email atau password yang kamu masukkan salah.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Email sudah terdaftar. Silakan login atau gunakan email lain.";
  }
  if (lower.includes("password should be at least")) {
    return "Password minimal harus 6 karakter.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Terlalu banyak permintaan. Silakan tunggu beberapa saat.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Periksa kotak masuk email kamu.";
  }
  return message;
}
