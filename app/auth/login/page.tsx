import { Suspense } from "react";
import { LoginRoute } from "@/features/auth";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <LoginRoute />
    </Suspense>
  );
}
