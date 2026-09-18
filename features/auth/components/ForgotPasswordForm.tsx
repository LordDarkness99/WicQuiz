"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { validateForgotPasswordForm } from "../domain/validation";
import { sendPasswordResetEmail } from "../data/authRepository";
import Button from "@/shared/ui/Button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateForgotPasswordForm({ email });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await sendPasswordResetEmail({ email });
      if (res.error) {
        setServerError(res.error);
        toast.error(res.error);
        setLoading(false);
        return;
      }

      setSubmitted(true);
      toast.success("Password reset link has been sent to your email.");
    } catch {
      setServerError("Failed to send reset link. Please try again.");
      toast.error("An error occurred while sending the email.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center mx-auto text-primary text-3xl">
          ✉️
        </div>
        <h3 className="text-xl font-bold text-primary">Check Your Email</h3>
        <p className="text-on-surface-variant text-sm leading-relaxed">
          We have sent password recovery instructions to <strong className="text-primary font-bold">{email}</strong>.
        </p>
        <div className="pt-4">
          <Link href="/auth/login">
            <Button variant="primary" size="md" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
          htmlFor="forgot-email"
          className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5"
        >
          Registered Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
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
            Sending link...
          </span>
        ) : (
          "Send Recovery Link"
        )}
      </Button>
    </form>
  );
}
