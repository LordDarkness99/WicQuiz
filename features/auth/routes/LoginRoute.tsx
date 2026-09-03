"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCard } from "../components/AuthCard";
import { LoginForm } from "../components/LoginForm";

export function LoginRoute() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || undefined;

  return (
    <AuthCard
      title="Selamat Datang Kembali"
      subtitle="Masuk ke akun WicQuiz untuk membuat kuis, membuka room host, dan melihat riwayat skor."
      badgeText="Masuk Akun"
      footerContent={
        <p>
          Belum punya akun WicQuiz?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-primary hover:text-secondary-container transition-colors"
          >
            Daftar sekarang
          </Link>
        </p>
      }
    >
      <LoginForm returnTo={returnTo} />
    </AuthCard>
  );
}
