"use client";

import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export function ForgotPasswordRoute() {
  return (
    <AuthCard
      title="Forgot Password?"
      subtitle="Enter your account email. We'll send a link to reset your password."
      badgeText="Account Recovery"
      footerContent={
        <p>
          Remembered your password?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-[#D4A76A] hover:text-[#B88B4A] hover:underline transition-colors"
          >
            Back to Login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
