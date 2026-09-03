"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { validateLoginForm, sanitizeReturnTo } from "../domain/validation";
import { loginWithEmail } from "../data/authRepository";
import Button from "@/shared/ui/Button";

interface LoginFormProps {
  returnTo?: string;
}

export function LoginForm({ returnTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateLoginForm({ email, password });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await loginWithEmail({ email, password });
      if (res.error) {
        setServerError(res.error);
        toast.error(res.error);
        setLoading(false);
        return;
      }

      toast.success("Login berhasil! Selamat datang kembali 🏇");
      const safePath = sanitizeReturnTo(returnTo);
      router.push(safePath);
      router.refresh();
    } catch {
      setServerError("Terjadi kendala koneksi. Silakan coba lagi.");
      toast.error("Gagal terhubung ke server.");
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
          htmlFor="login-email"
          className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-surface text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-colors ${
            errors.email
              ? "border-error focus:border-error"
              : "border-outline-variant/60 focus:border-primary"
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-error font-medium">{errors.email}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label
            htmlFor="login-password"
            className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-bold text-secondary hover:underline transition-colors"
          >
            Lupa password?
          </Link>
        </div>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
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
            Memproses...
          </span>
        ) : (
          "Masuk ke WicQuiz"
        )}
      </Button>
    </form>
  );
}
