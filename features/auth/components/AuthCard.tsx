"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#0D1722] text-[#F8FAFC] relative overflow-hidden tactical-grid">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#2E5339]/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[250px] bg-[#B88B4A]/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1C2D42] to-[#121F2E] border border-[#B88B4A]/40 flex items-center justify-center shadow-[0_0_15px_rgba(184,139,74,0.15)] group-hover:border-[#B88B4A] transition-all">
            <Image
              src="/ikon.png"
              alt="WicQuiz logo"
              width={28}
              height={28}
              className="rounded-md"
            />
          </div>
          <span className="text-2xl font-black text-[#F8FAFC] tracking-tight group-hover:text-[#D4A76A] transition-colors">
            WicQuiz
          </span>
        </Link>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-md bg-[#121F2E]/90 backdrop-blur-xl rounded-3xl border border-[#B88B4A]/25 shadow-[0_20px_60px_rgba(13,23,34,0.8)] p-8 md:p-10 relative overflow-hidden"
      >
        {/* Top accent specular border strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2E5339] via-[#B88B4A] to-[#2E5339]" />

        <div className="mb-6" data-aos="fade-down" data-aos-delay="200">
          <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-wider text-[#D4A76A] bg-[#B88B4A]/15 border border-[#B88B4A]/30 px-3 py-1 rounded-full mb-3">
            {badgeText}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            {title}
          </h1>
          <p className="text-[#94A3B8] text-sm mt-1 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {children}

        {footerContent && (
          <div className="mt-8 pt-6 border-t border-[#283E58]/60 text-center text-sm text-[#94A3B8]">
            {footerContent}
          </div>
        )}
      </motion.div>
    </div>
  );
}
