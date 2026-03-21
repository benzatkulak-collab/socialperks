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
  required?: boolean;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  multiline = false,
  error,
  required = false,
}: FieldProps) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const inputClasses = `
    w-full bg-brand-elevated border rounded-lg px-3.5 py-2.5 text-sm font-body text-brand-text
    placeholder:text-brand-muted
    focus:outline-none focus:ring-2 focus:ring-brand-cyan/40 focus:border-brand-cyan/50
    transition-colors duration-200
    ${error ? "border-brand-red/50" : "border-brand-border"}
  `;

  return (
    <div className="flex flex-col gap-1.5 mb-3">
      <label htmlFor={id} className="text-xs font-medium text-brand-dim font-body">
        {label}
        {required && <span className="text-brand-red ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${inputClasses} resize-y min-h-[80px]`}
          aria-invalid={!!error}
          aria-describedby={errorId}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={errorId}
        />
      )}
      {error && (
        <span id={errorId} className="text-2xs text-brand-red font-body" role="alert">{error}</span>
      )}
    </div>
  );
}
