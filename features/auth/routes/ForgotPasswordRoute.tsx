"use client";

import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export function ForgotPasswordRoute() {
  return (
    <AuthCard
      title="Lupa Kata Sandi?"
      subtitle="Masukkan alamat email akun kamu. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi."
      badgeText="Pemulihan Akun"
      footerContent={
        <p>
          Ingat kata sandi?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-primary hover:text-secondary-container transition-colors"
          >
            Kembali ke Login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
