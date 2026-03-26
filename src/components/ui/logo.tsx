"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  glow?: boolean;
}

const sizeMap = {
  sm: { text: "text-lg", icon: "w-6 h-6", svg: "w-3 h-3" },
  md: { text: "text-2xl", icon: "w-7 h-7", svg: "w-3.5 h-3.5" },
  lg: { text: "text-4xl", icon: "w-9 h-9", svg: "w-4.5 h-4.5" },
  xl: { text: "text-5xl", icon: "w-11 h-11", svg: "w-5 h-5" },
};

export function Logo({ size = "md", glow = false }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className="inline-flex items-center gap-2">
      {/* Diamond icon */}
      <div
        className={`
          ${s.icon} flex items-center justify-center rounded-lg
          bg-gradient-to-br from-brand-cyan to-brand-cyan/60
          transition-shadow duration-normal ease-smooth
          ${glow ? "shadow-glow-cyan" : ""}
        `}
      >
        <svg viewBox="0 0 20 20" fill="none" className={s.svg} aria-hidden="true">
          <path
            d="M10 2L18 10L10 18L2 10L10 2Z"
            fill="currentColor"
            className="text-brand-bg"
          />
          <path
            d="M10 5L15 10L10 15L5 10L10 5Z"
            fill="currentColor"
            className="text-brand-bg/60"
          />
        </svg>
      </div>
      <span className={`font-heading italic text-brand-white ${s.text}`}>
        Social<span className="text-brand-cyan">Perks</span>
      </span>
    </div>
  );
}
