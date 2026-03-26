"use client";

import React from "react";

interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "disabled"
  > {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "success"
    | "danger"
    | "link";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const variantClasses: Record<string, string> = {
  primary: [
    "bg-brand-cyan text-brand-bg font-semibold shadow-sm",
    "hover:bg-cyan-300 hover:shadow-md hover:shadow-brand-cyan/10",
    "active:bg-cyan-500",
    "focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  secondary: [
    "bg-brand-elevated border border-brand-border text-brand-text font-medium",
    "hover:border-brand-border-hover hover:bg-brand-surface hover:text-brand-white",
    "active:bg-brand-elevated",
    "focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  outline: [
    "bg-transparent border border-brand-border text-brand-dim font-medium",
    "hover:border-brand-cyan/40 hover:text-brand-cyan hover:bg-brand-cyan/5",
    "active:bg-brand-cyan/10",
    "focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  ghost: [
    "bg-transparent text-brand-dim",
    "hover:text-brand-text hover:bg-brand-surface",
    "active:bg-brand-elevated",
    "focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  destructive: [
    "bg-brand-red text-white font-semibold shadow-sm",
    "hover:bg-red-500 hover:shadow-md hover:shadow-brand-red/10",
    "active:bg-red-600",
    "focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  success: [
    "bg-brand-green text-brand-bg font-semibold shadow-sm",
    "hover:bg-green-300 hover:shadow-md hover:shadow-brand-green/10",
    "active:bg-green-500",
    "focus-visible:ring-2 focus-visible:ring-brand-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  danger: [
    "bg-brand-red text-white font-semibold shadow-sm",
    "hover:bg-red-500 hover:shadow-md hover:shadow-brand-red/10",
    "active:bg-red-600",
    "focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
  ].join(" "),
  link: [
    "bg-transparent text-brand-cyan underline-offset-4 font-medium p-0",
    "hover:text-cyan-300 hover:underline",
    "active:text-cyan-500",
    "focus-visible:ring-2 focus-visible:ring-brand-cyan/40 focus-visible:rounded-sm",
  ].join(" "),
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg min-h-[32px] gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg min-h-[40px] gap-2",
  lg: "px-5 py-2.5 text-sm rounded-xl min-h-[44px] gap-2",
  xl: "px-6 py-3 text-base rounded-xl min-h-[48px] gap-2.5",
};

const iconSizeClasses: Record<string, string> = {
  sm: "w-8 h-8 p-0 rounded-lg",
  md: "w-10 h-10 p-0 rounded-lg",
  lg: "w-11 h-11 p-0 rounded-xl",
  xl: "w-12 h-12 p-0 rounded-xl",
};

const spinnerSizeClasses: Record<string, string> = {
  sm: "w-3.5 h-3.5 border-[1.5px]",
  md: "w-4 h-4 border-2",
  lg: "w-4.5 h-4.5 border-2",
  xl: "w-5 h-5 border-2",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = false,
  size = "md",
  icon = false,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const isLink = variant === "link";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`
        relative inline-flex items-center justify-center font-body
        transition-all duration-fast ease-smooth
        ${!isLink ? "hover:scale-[1.02] active:scale-[0.98]" : ""}
        ${variantClasses[variant]}
        ${icon ? iconSizeClasses[size] : sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
        ${className}
      `}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={`inline-block border-current border-t-transparent rounded-full animate-spin ${spinnerSizeClasses[size]}`}
            aria-hidden="true"
          />
        </span>
      )}
      <span className={loading && !icon ? "invisible" : ""}>
        {children}
      </span>
      {loading && <span className="sr-only">Loading</span>}
    </button>
  );
}
