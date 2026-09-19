"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "coral" | "ghost" | "forest";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const variants = {
  primary:
    "bg-[#B88B4A] text-[#0D1722] hover:bg-[#D4A76A] shadow-[0_4px_20px_rgba(184,139,74,0.28)] border border-[#B88B4A]/80 font-extrabold tracking-wide",
  secondary:
    "bg-[#2E5339] text-[#F8FAFC] hover:bg-[#3D6E4C] border border-[#2E5339]/80 shadow-[0_4px_16px_rgba(46,83,57,0.3)] font-bold tracking-wide",
  coral:
    "bg-gradient-to-r from-[#B88B4A] to-[#D4A76A] text-[#0D1722] hover:opacity-95 shadow-[0_4px_20px_rgba(184,139,74,0.35)] border border-[#B88B4A]/80 font-extrabold tracking-wide",
  forest:
    "bg-[#2E5339] text-[#F8FAFC] hover:bg-[#3D6E4C] border border-[#2E5339]/80 shadow-[0_4px_16px_rgba(46,83,57,0.3)] font-bold tracking-wide",
  ghost:
    "bg-surface-container-lowest/60 text-[#F8FAFC] border border-[#283E58] hover:border-[#B88B4A]/50 hover:bg-[#1C2D42]/60 hover:text-white font-semibold backdrop-blur-sm",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      {...props}
      className={`
        font-bold rounded-2xl transition-colors cursor-pointer
        ${variants[variant]} ${sizes[size]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
