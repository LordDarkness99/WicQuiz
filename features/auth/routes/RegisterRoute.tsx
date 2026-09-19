"use client";

import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { RegisterForm } from "../components/RegisterForm";

export function RegisterRoute() {
  return (
    <AuthCard
      title="Create a WicQuiz Account"
      subtitle="Sign up for free to create custom quizzes, manage live host rooms, and save results."
      badgeText="New Registration"
      footerContent={
        <p>
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-[#D4A76A] hover:text-[#B88B4A] hover:underline transition-colors"
          >
            Sign in here
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
