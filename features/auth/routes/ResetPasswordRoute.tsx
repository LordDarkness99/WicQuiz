"use client";

import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export function ResetPasswordRoute() {
  return (
    <AuthCard
      title="Reset Password"
      subtitle="Please enter a new password for your WicQuiz account."
      badgeText="New Password"
      footerContent={
        <p>
          <Link
            href="/auth/login"
            className="font-bold text-[#D4A76A] hover:text-[#B88B4A] hover:underline transition-colors"
          >
            Cancel and return to Login
          </Link>
        </p>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
