"use client";

import React, { useId } from "react";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  minLength?: number;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  multiline = false,
  error,
  hint,
  required = false,
  disabled = false,
  className = "",
  minLength,
}: FieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const inputClasses = `
    w-full bg-brand-elevated border rounded-lg px-3.5 py-2.5 text-sm font-body text-brand-text
    placeholder:text-brand-muted/60
    transition-all duration-fast ease-smooth
    focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/50
    hover:border-brand-border-hover
    ${error ? "border-brand-red/50 focus:ring-brand-red/30 focus:border-brand-red/50" : "border-brand-border"}
    ${disabled ? "opacity-50 cursor-not-allowed bg-brand-surface" : ""}
  `;

  return (
    <div className={`flex flex-col gap-1.5 mb-3 ${className}`}>
      <label
        htmlFor={id}
        className="text-xs font-medium text-brand-dim font-body flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-brand-red" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          disabled={disabled}
          required={required}
          className={`${inputClasses} resize-y min-h-[80px]`}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={required}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          minLength={minLength}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          aria-required={required}
        />
      )}
      {error && (
        <span
          id={errorId}
          className="text-2xs text-brand-red font-body flex items-center gap-1"
          role="alert"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" />
            <path d="M6 3.5V6.5" stroke="currentColor" strokeLinecap="round" />
            <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
          </svg>
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="text-2xs text-brand-muted font-body">
          {hint}
        </span>
      )}
    </div>
  );
}
