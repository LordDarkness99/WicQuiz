import type {
  RegisterFormData,
  LoginFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
} from "./types";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email wajib diisi.";
  if (!EMAIL_REGEX.test(trimmed)) return "Format email tidak valid.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password wajib diisi.";
  if (password.length < 6) return "Password minimal harus 6 karakter.";
  return null;
}

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Nama lengkap / display name wajib diisi.";
  if (trimmed.length < 2) return "Nama terlalu pendek (minimal 2 karakter).";
  if (trimmed.length > 50) return "Nama maksimal 50 karakter.";
  return null;
}

export function validateRegisterForm(data: RegisterFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameError = validateDisplayName(data.displayName);
  if (nameError) errors.displayName = nameError;

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Konfirmasi password tidak cocok.";
  }

  return errors;
}

export function validateLoginForm(data: LoginFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  return errors;
}

export function validateForgotPasswordForm(
  data: ForgotPasswordFormData
): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(data.email);
  if (emailError) errors.email = emailError;
  return errors;
}

export function validateResetPasswordForm(
  data: ResetPasswordFormData
): Record<string, string> {
  const errors: Record<string, string> = {};

  const passwordError = validatePassword(data.password);
  if (passwordError) errors.password = passwordError;

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Konfirmasi password tidak cocok.";
  }

  return errors;
}

export function sanitizeReturnTo(path: string | null | undefined): string {
  if (!path) return "/host/dashboard";
  const trimmed = path.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes(":") &&
    !trimmed.includes("\\")
  ) {
    return trimmed;
  }
  return "/host/dashboard";
}
