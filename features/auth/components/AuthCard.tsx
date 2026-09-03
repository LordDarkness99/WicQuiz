"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface AuthCardProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
}

export function AuthCard({
  title,
  subtitle,
  badgeText = "WicQuiz Account",
  children,
  footerContent,
}: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-surface text-on-surface">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <Link href="/" className="inline-flex items-center gap-2 group">
          <span className="text-3xl">🐎</span>
          <span className="text-2xl font-black text-primary tracking-tight group-hover:text-secondary-container transition-colors">
            WicQuiz
          </span>
        </Link>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xl p-8 md:p-10 relative overflow-hidden"
      >
        {/* Top accent border strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-secondary-container via-tertiary-fixed-dim to-primary" />

        <div className="mb-6">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest text-primary/60 bg-primary-fixed/40 px-3 py-1 rounded-full mb-3">
            {badgeText}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
            {title}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {children}

        {footerContent && (
          <div className="mt-8 pt-6 border-t border-outline-variant/30 text-center text-sm text-on-surface-variant">
            {footerContent}
          </div>
        )}
      </motion.div>
    </div>
  );
}
