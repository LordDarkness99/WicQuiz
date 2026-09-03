"use client";

import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { RegisterForm } from "../components/RegisterForm";

export function RegisterRoute() {
  return (
    <AuthCard
      title="Buat Akun WicQuiz"
      subtitle="Daftar gratis untuk membuat kuis kustom, mengelola arena pacuan kuda langsung, dan menyimpan catatan hasil."
      badgeText="Pendaftaran Baru"
      footerContent={
        <p>
          Sudah punya akun?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-primary hover:text-secondary-container transition-colors"
          >
            Masuk di sini
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
