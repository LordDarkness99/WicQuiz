import { updateSession } from "@/integrations/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Sanitizes returnTo parameter to prevent open redirect vulnerabilities.
 * Only allows absolute internal paths (e.g. "/host/dashboard", not "//evil.com" or "https://evil.com").
 */
export function sanitizeReturnTo(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes(":") &&
    !trimmed.includes("\\")
  ) {
    return trimmed;
  }
  return null;
}

const PROTECTED_PREFIXES = ["/host", "/account"];
const AUTH_PAGES = ["/auth/login", "/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const { supabaseResponse, user } = await updateSession(request);

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.some((path) => pathname === path);

  // 1. Unauthenticated user accessing a protected route -> redirect to login with returnTo
  if (!user && isProtected) {
    const returnTo = sanitizeReturnTo(pathname + (request.nextUrl.search || ""));
    const loginUrl = new URL("/auth/login", request.url);
    if (returnTo) {
      loginUrl.searchParams.set("returnTo", returnTo);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user accessing login/register -> redirect to dashboard or safe returnTo
  if (user && isAuthPage) {
    const rawReturnTo = searchParams.get("returnTo");
    const safeReturnTo = sanitizeReturnTo(rawReturnTo);
    const destination = safeReturnTo || "/host/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, audio, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)",
  ],
};
