"use client";

import { cn } from "@/shared/utils/cn";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-container-high",
        className
      )}
    />
  );
}

/** Skeleton for one quiz card row in the dashboard */
export function QuizCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-5 flex items-center gap-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}

/** Skeleton for the stats cards row in dashboard */
export function StatCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

/** Skeleton for a leaderboard row */
export function LeaderboardRowSkeleton() {
  return (
    <div className="grid grid-cols-[3rem_1fr_1fr_5rem] gap-2 px-6 py-4 items-center border-b border-navy/5">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-12 ml-auto" />
    </div>
  );
}

/** Full leaderboard skeleton */
export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-cream border border-navy/10 shadow-lg">
      <div className="bg-navy px-6 py-4">
        <Skeleton className="h-6 w-32 bg-white/20" />
      </div>
      <div className="divide-y divide-navy/5">
        {Array.from({ length: rows }).map((_, i) => (
          <LeaderboardRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Question loading skeleton for the player view */
export function QuestionSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-5 w-full">
      {/* Progress + timer */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-8" />
      </div>
      {/* Timer bar */}
      <Skeleton className="h-2.5 w-full rounded-full" />
      {/* Question card */}
      <div className="bg-white rounded-3xl shadow-md p-6 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-6 w-3/5" />
      </div>
      {/* Answer buttons */}
      <div className="mt-auto grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
