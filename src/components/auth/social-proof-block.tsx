import * as React from "react";

export interface SocialProofBlockProps {
  /** Optional className for the wrapping element. */
  className?: string;
  /** Override the default copy. */
  message?: string;
}

interface Avatar {
  initials: string;
  bg: string; // tailwind color class for background
  fg: string; // tailwind color class for foreground text
  label: string;
}

const AVATARS: Avatar[] = [
  {
    initials: "GS",
    bg: "bg-brand-cyan/20",
    fg: "text-brand-cyan",
    label: "Glow Skincare",
  },
  {
    initials: "BB",
    bg: "bg-brand-green/20",
    fg: "text-brand-green",
    label: "Baked Bakery",
  },
  {
    initials: "IY",
    bg: "bg-brand-amber/20",
    fg: "text-brand-amber",
    label: "Iron Yoga",
  },
  {
    initials: "SC",
    bg: "bg-pink-400/20",
    fg: "text-pink-400",
    label: "Sol Coffee",
  },
];

const DEFAULT_MESSAGE = "Join 1,247+ small businesses already using Social Perks";

/**
 * Social proof block with four small business avatars and a count.
 * Drop-in component — pair with `SignupTrustBar` for a polished signup form.
 */
export function SocialProofBlock({
  className,
  message = DEFAULT_MESSAGE,
}: SocialProofBlockProps) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-3 sm:flex-row sm:gap-4",
        className ?? "",
      ]
        .join(" ")
        .trim()}
    >
      <div
        className="flex -space-x-2"
        aria-hidden
      >
        {AVATARS.map((a) => (
          <div
            key={a.initials}
            title={a.label}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-bg font-mono text-[11px] font-semibold",
              a.bg,
              a.fg,
            ].join(" ")}
          >
            {a.initials}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-brand-dim sm:text-left">
        {message}
      </p>
    </div>
  );
}

export default SocialProofBlock;
