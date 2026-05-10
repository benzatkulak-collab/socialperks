import * as React from "react";

export interface SignupTrustBarProps {
  /** Optional className for the wrapping element. */
  className?: string;
  /** Layout direction. Defaults to row on sm+ and column below. */
  layout?: "auto" | "row" | "column";
}

const ITEMS: string[] = [
  "14-day free trial",
  "No credit card required",
  "Cancel anytime",
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 flex-shrink-0 text-brand-green"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006L3.296 9.85a1 1 0 1 1 1.408-1.42l3.785 3.751 6.8-6.89a1 1 0 0 1 1.415-.001Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Reusable trust bar with three checkmark items, designed to sit
 * above or below the signup form.
 */
export function SignupTrustBar({
  className,
  layout = "auto",
}: SignupTrustBarProps) {
  const layoutClass =
    layout === "row"
      ? "flex flex-row flex-wrap items-center justify-center gap-x-5 gap-y-2"
      : layout === "column"
        ? "flex flex-col items-start gap-2"
        : "flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5 sm:gap-y-2";

  return (
    <ul
      role="list"
      className={[layoutClass, className ?? ""].join(" ").trim()}
      aria-label="Trial details"
    >
      {ITEMS.map((item) => (
        <li
          key={item}
          className="inline-flex items-center gap-2 text-sm text-brand-dim"
        >
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default SignupTrustBar;
