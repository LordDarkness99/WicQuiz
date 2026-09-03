"use client";

import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export function ResetPasswordRoute() {
  return (
    <AuthCard
      title="Atur Ulang Kata Sandi"
      subtitle="Silakan masukkan kata sandi baru untuk akun WicQuiz kamu."
      badgeText="Kata Sandi Baru"
      footerContent={
        <p>
          <Link
            href="/auth/login"
            className="font-bold text-primary hover:text-secondary-container transition-colors"
          >
            Batal dan Kembali ke Login
          </Link>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
