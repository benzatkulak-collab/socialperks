"use client";

import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger";
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-brand-cyan text-brand-bg hover:bg-brand-cyan/90 font-semibold shadow-sm",
  secondary:
    "bg-transparent border border-brand-border text-brand-text hover:border-brand-border-hover hover:text-brand-white",
  ghost:
    "bg-transparent text-brand-dim hover:text-brand-text hover:bg-brand-surface",
  success:
    "bg-brand-green text-brand-bg hover:bg-brand-green/90 font-semibold shadow-sm",
  danger:
    "bg-brand-red text-brand-bg hover:bg-brand-red/90 font-semibold shadow-sm",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-lg",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  size = "md",
  className = "",
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 font-body transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
