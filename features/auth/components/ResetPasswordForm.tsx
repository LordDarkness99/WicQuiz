"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { validateResetPasswordForm } from "../domain/validation";
import { updatePassword } from "../data/authRepository";
import Button from "@/shared/ui/Button";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateResetPasswordForm({
      password,
      confirmPassword,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await updatePassword({ password, confirmPassword });
      if (res.error) {
        setServerError(res.error);
        toast.error(res.error);
        setLoading(false);
        return;
      }

      toast.success("Password baru berhasil disimpan! Silakan masuk kembali.");
      router.push("/auth/login");
    } catch {
      setServerError("Gagal memperbarui password. Silakan coba lagi.");
      toast.error("Terjadi kendala saat reset password.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{serverError}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="new-password"
          className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5"
        >
          Password Baru
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 6 karakter"
          autoComplete="new-password"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-colors ${
            errors.password
              ? "border-error focus:border-error"
              : "border-outline-variant/60 focus:border-primary"
          }`}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-error font-medium">
            {errors.password}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="new-confirm-password"
          className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5"
        >
          Konfirmasi Password Baru
        </label>
        <input
          id="new-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ulangi password baru"
          autoComplete="new-password"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-colors ${
            errors.confirmPassword
              ? "border-error focus:border-error"
              : "border-outline-variant/60 focus:border-primary"
          }`}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-error font-medium">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <Button
        variant="coral"
        size="lg"
        type="submit"
        className="w-full mt-2"
        disabled={loading}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Menyimpan Password...
          </span>
        ) : (
          "Simpan Password Baru"
        )}
      </Button>
    </form>
  );
}
