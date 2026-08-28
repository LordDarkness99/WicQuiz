/**
 * Utility: merge Tailwind class names safely.
 * Simple implementation without clsx/tailwind-merge dep.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
