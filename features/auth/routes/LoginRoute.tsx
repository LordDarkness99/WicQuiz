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
      title="Welcome Back"
      subtitle="Sign in to your WicQuiz account to create quizzes, open a host room, and view score history."
      badgeText="Sign In"
      footerContent={
        <p>
          Do not have a WicQuiz account?{" "}
          <Link
            href="/auth/register"
            className="font-bold text-[#D4A76A] hover:text-[#B88B4A] hover:underline transition-colors"
          >
            Sign up now
          </Link>
        </p>
      }
    >
      <LoginForm returnTo={returnTo} />
    </AuthCard>
  );
}
