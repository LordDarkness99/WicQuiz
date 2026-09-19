"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { clearHostId } from "@/shared/hostIdentity";
import { getCurrentUser, logoutUser } from "@/features/auth";
import { getProfile } from "@/features/profile";

export function HostHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUserEmail(currentUser.email);
          setUserDisplayName(currentUser.displayName || null);
          const profile = await getProfile(currentUser.id);
          setUserAvatarUrl(profile?.avatar_url ?? null);
        }
      } catch {
        // Silently handle
      }
    }
    loadUser();
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      clearHostId();
      const { error } = await logoutUser();
      if (error) {
        toast.error("Failed to logout: " + error);
        setLoggingOut(false);
        return;
      }
      toast.success("Successfully logged out. See you! 👋");
      router.push("/auth/login");
      router.refresh();
    } catch {
      toast.error("An error occurred during logout.");
      setLoggingOut(false);
    }
  }, [router]);

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="bg-[#0D1722]/85 backdrop-blur-xl border-b border-[#283E58]/60 px-4 sm:px-8 py-4 sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            className="sm:hidden p-1.5 -ml-1.5 rounded-lg text-[#94A3B8] hover:bg-[#1C2D42] hover:text-[#F8FAFC] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>

          <span
            className="text-lg sm:text-xl font-black text-[#F8FAFC] tracking-tight cursor-pointer hover:text-[#D4A76A] transition-colors"
            onClick={() => router.push("/")}
          >
            WicQuiz
          </span>
          <div className="hidden sm:block h-6 w-px bg-[#283E58]" />
          <span className="hidden sm:block text-xs font-mono uppercase tracking-widest text-[#B88B4A]">
            Host Console
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={() => router.push("/host/dashboard")}
            title="Dashboard"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              pathname === "/host/dashboard"
                ? "bg-[#1C2D42] text-[#F8FAFC] border-[#283E58]"
                : "text-[#94A3B8] hover:bg-[#1C2D42] hover:text-[#F8FAFC] border-transparent hover:border-[#283E58]"
            } border`}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Dashboard
          </button>

          <button
            onClick={() => router.push("/host/history")}
            title="Quiz History"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
              pathname === "/host/history"
                ? "bg-[#1C2D42] text-[#F8FAFC] border-[#283E58]"
                : "text-[#94A3B8] hover:bg-[#1C2D42] hover:text-[#F8FAFC] border-transparent hover:border-[#283E58]"
            } border`}
          >
            <span className="material-symbols-outlined text-[18px] text-[#B88B4A]">history</span>
            History
          </button>

          {userEmail && (
            <button
              onClick={() => router.push("/host/profile")}
              title="My Profile"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                pathname === "/host/profile"
                  ? "bg-[#1C2D42] border-[#B88B4A]/50 text-[#F8FAFC]"
                  : "bg-[#142232] border-[#283E58] hover:border-[#B88B4A]/50"
              }`}
            >
              <span className="w-6 h-6 rounded-full overflow-hidden bg-[#1C2D42] flex items-center justify-center flex-shrink-0 border border-[#283E58]">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userAvatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setUserAvatarUrl(null)}
                  />
                ) : (
                  <span className="material-symbols-outlined text-[16px] text-[#B88B4A]">
                    account_circle
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-[#F8FAFC] truncate max-w-[140px]">
                {userDisplayName || userEmail}
              </span>
            </button>
          )}

          <motion.button
            onClick={() => router.push("/host/new")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#B88B4A] text-[#0D1722] hover:bg-[#D4A76A] px-5 py-2 rounded-xl font-black text-xs shadow-[0_4px_18px_rgba(184,139,74,0.25)] flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Quiz
          </motion.button>

          <motion.button
            onClick={handleLogout}
            disabled={loggingOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            title="Logout"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border border-[#283E58] bg-[#142232] text-[#94A3B8] hover:bg-error/15 hover:text-error hover:border-error/40 transition-colors disabled:opacity-50"
          >
            {loggingOut ? (
              <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">logout</span>
            )}
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </motion.button>
        </div>

        {/* Mobile Quick Actions (if any) */}
        <div className="flex sm:hidden items-center gap-2">
          {userEmail && (
            <button
              onClick={() => router.push("/host/profile")}
              className="w-8 h-8 rounded-full overflow-hidden bg-[#1C2D42] flex items-center justify-center flex-shrink-0 border border-[#283E58]"
            >
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setUserAvatarUrl(null)}
                />
              ) : (
                <span className="material-symbols-outlined text-[18px] text-[#B88B4A]">
                  account_circle
                </span>
              )}
            </button>
          )}
        </div>
      </div>
      </header>

      {/* Mobile Menu Overlay - Placed outside header to avoid backdrop-blur containing block issue */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-[#0D1722]/80 backdrop-blur-sm z-40 sm:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-[#121F2E] border-r border-[#283E58] shadow-2xl z-50 flex flex-col sm:hidden"
            >
              <div className="p-4 border-b border-[#283E58]/60 flex items-center justify-between">
                <span className="text-xl font-black text-[#F8FAFC] tracking-tight">WicQuiz</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-[#94A3B8] hover:bg-[#1C2D42] hover:text-[#F8FAFC]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1 overflow-y-auto">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B88B4A] mb-2 px-2">
                  Navigation
                </span>
                
                <button
                  onClick={() => router.push("/host/dashboard")}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all text-left ${
                    pathname === "/host/dashboard"
                      ? "bg-[#1C2D42] text-[#F8FAFC] border border-[#283E58]"
                      : "text-[#94A3B8] hover:bg-[#1C2D42] hover:text-[#F8FAFC] border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined">dashboard</span>
                  Dashboard
                </button>

                <button
                  onClick={() => router.push("/host/history")}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all text-left ${
                    pathname === "/host/history"
                      ? "bg-[#1C2D42] text-[#F8FAFC] border border-[#283E58]"
                      : "text-[#94A3B8] hover:bg-[#1C2D42] hover:text-[#F8FAFC] border border-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-[#B88B4A]">history</span>
                  History
                </button>

                <button
                  onClick={() => router.push("/host/new")}
                  className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-[#B88B4A] text-[#0D1722] font-black text-sm transition-all text-left shadow-sm"
                >
                  <span className="material-symbols-outlined">add</span>
                  New Quiz
                </button>
              </div>

              <div className="p-4 border-t border-[#283E58]/60">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl font-bold text-sm border border-[#283E58] bg-[#142232] text-error hover:bg-error/15 hover:border-error/40 transition-colors"
                >
                  {loggingOut ? (
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined">logout</span>
                  )}
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
