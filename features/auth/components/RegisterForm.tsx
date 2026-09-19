"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { validateRegisterForm } from "../domain/validation";
import { registerWithEmail } from "../data/authRepository";
import Button from "@/shared/ui/Button";

export function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateRegisterForm({
      displayName,
      email,
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
      const res = await registerWithEmail({
        displayName,
        email,
        password,
        confirmPassword,
      });

      if (res.error) {
        setServerError(res.error);
        toast.error(res.error);
        setLoading(false);
        return;
      }

      toast.success("Registration successful! Your account is ready to use.");
      router.push("/host/dashboard");
      router.refresh();
    } catch {
      setServerError("Connection issue. Please try again.");
      toast.error("Failed to connect to server.");
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
          htmlFor="reg-name"
          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5"
        >
          Full Name / Display Name
        </label>
        <input
          id="reg-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g., Alex Mercer"
          autoComplete="name"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-[#0A121B] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-all ${
            errors.displayName
              ? "border-error focus:border-error"
              : "border-[#283E58] focus:border-[#B88B4A] focus:ring-1 focus:ring-[#B88B4A]"
          }`}
        />
        {errors.displayName && (
          <p className="mt-1 text-xs text-error font-medium">
            {errors.displayName}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="reg-email"
          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5"
        >
          Email Address
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-[#0A121B] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-all ${
            errors.email
              ? "border-error focus:border-error"
              : "border-[#283E58] focus:border-[#B88B4A] focus:ring-1 focus:ring-[#B88B4A]"
          }`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-error font-medium">{errors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="reg-password"
          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5"
        >
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 6 characters"
          autoComplete="new-password"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-[#0A121B] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-all ${
            errors.password
              ? "border-error focus:border-error"
              : "border-[#283E58] focus:border-[#B88B4A] focus:ring-1 focus:ring-[#B88B4A]"
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
          htmlFor="reg-confirm"
          className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5"
        >
          Confirm Password
        </label>
        <input
          id="reg-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          autoComplete="new-password"
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl border bg-[#0A121B] text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-all ${
            errors.confirmPassword
              ? "border-error focus:border-error"
              : "border-[#283E58] focus:border-[#B88B4A] focus:ring-1 focus:ring-[#B88B4A]"
          }`}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-error font-medium">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <Button
        variant="primary"
        size="lg"
        type="submit"
        className="w-full mt-4"
        disabled={loading}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </span>
        ) : (
          "Create Account Now"
        )}
      </Button>
    </form>
  );
}
