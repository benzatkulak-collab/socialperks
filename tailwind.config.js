/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      /* ─── Colors ─── */
      colors: {
        brand: {
          bg: "#0C0F1A",
          surface: "#141825",
          elevated: "#1C2036",
          border: "#2A2F45",
          "border-hover": "#3D4362",
          subtle: "#3D4362",
          muted: "#636B8A",
          dim: "#8E95B4",
          text: "#E8EAF0",
          white: "#FAFBFD",
          cyan: "#22D3EE",
          green: "#34D399",
          amber: "#FBBF24",
          red: "#F87171",
          purple: "#A78BFA",
          pink: "#F472B6",
          orange: "#FB923C",
          cream: "#F5F0E8",
        },
        tier: {
          essential: "#34D399",
          "high-impact": "#FB923C",
          growth: "#22D3EE",
          premium: "#F472B6",
          starter: "#636B8A",
        },
        /* Full shade palettes for primary/semantic colors */
        neutral: {
          50:  "#F8F9FC",
          100: "#F0F1F5",
          150: "#E8EAF0",
          200: "#D4D7E2",
          300: "#B0B5C9",
          400: "#8E95B4",
          500: "#636B8A",
          600: "#4A5170",
          700: "#3D4362",
          800: "#2A2F45",
          850: "#1C2036",
          900: "#141825",
          950: "#0C0F1A",
        },
        cyan: {
          50:  "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
          800: "#155E75",
          900: "#164E63",
          950: "#083344",
        },
        green: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22",
        },
        amber: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          950: "#451A03",
        },
        red: {
          50:  "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
        purple: {
          50:  "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          950: "#2E1065",
        },
        pink: {
          50:  "#FDF2F8",
          100: "#FCE7F3",
          200: "#FBCFE8",
          300: "#F9A8D4",
          400: "#F472B6",
          500: "#EC4899",
          600: "#DB2777",
          700: "#BE185D",
          800: "#9D174D",
          900: "#831843",
          950: "#500724",
        },
        orange: {
          50:  "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
          950: "#431407",
        },
        blue: {
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
      },

      /* ─── Font Families ─── */
      fontFamily: {
        heading: ["'Instrument Serif'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },

      /* ─── Font Sizes (fluid) ─── */
      fontSize: {
        "3xs": ["9px",  { lineHeight: "12px" }],
        "2xs": ["10px", { lineHeight: "14px" }],
        xs:    ["clamp(11px, 0.25vw + 10px, 12px)", { lineHeight: "16px" }],
        sm:    ["clamp(13px, 0.25vw + 12px, 14px)", { lineHeight: "20px" }],
        base:  ["clamp(14px, 0.3vw + 13px, 16px)",  { lineHeight: "24px" }],
        lg:    ["clamp(16px, 0.35vw + 15px, 18px)", { lineHeight: "28px" }],
        xl:    ["clamp(18px, 0.5vw + 16px, 20px)",  { lineHeight: "28px" }],
        "2xl": ["clamp(20px, 0.75vw + 18px, 24px)", { lineHeight: "32px" }],
        "3xl": ["clamp(24px, 1vw + 20px, 30px)",    { lineHeight: "36px" }],
        "4xl": ["clamp(28px, 1.5vw + 22px, 36px)",  { lineHeight: "40px" }],
        "5xl": ["clamp(32px, 2vw + 24px, 48px)",    { lineHeight: "1.15" }],
        "6xl": ["clamp(40px, 3vw + 28px, 60px)",    { lineHeight: "1.1" }],
        "7xl": ["clamp(48px, 4vw + 32px, 72px)",    { lineHeight: "1.1" }],
        "8xl": ["clamp(56px, 5vw + 36px, 96px)",    { lineHeight: "1" }],
        "9xl": ["clamp(64px, 6vw + 40px, 128px)",   { lineHeight: "1" }],
      },

      /* ─── Spacing (extend Tailwind's default) ─── */
      spacing: {
        4.5: "1.125rem",  /* 18px */
        13:  "3.25rem",
        15:  "3.75rem",
        18:  "4.5rem",
        88:  "22rem",
        112: "28rem",
        120: "30rem",
        128: "32rem",
        144: "36rem",
      },

      /* ─── Max Widths ─── */
      maxWidth: {
        "8xl": "88rem",
      },

      /* ─── Border Radius ─── */
      borderRadius: {
        sm:    "4px",
        md:    "6px",
        lg:    "8px",
        xl:    "12px",
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },

      /* ─── Box Shadows ─── */
      boxShadow: {
        xs:  "0 1px 2px rgba(0, 0, 0, 0.2)",
        sm:  "0 1px 3px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.2)",
        md:  "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)",
        lg:  "0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.25)",
        xl:  "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        inner: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
        /* Glow variants */
        "glow-cyan":   "0 0 20px rgba(34, 211, 238, 0.15), 0 0 60px rgba(34, 211, 238, 0.05)",
        "glow-green":  "0 0 20px rgba(52, 211, 153, 0.15), 0 0 60px rgba(52, 211, 153, 0.05)",
        "glow-purple": "0 0 20px rgba(167, 139, 250, 0.15), 0 0 60px rgba(167, 139, 250, 0.05)",
        "glow-amber":  "0 0 20px rgba(251, 191, 36, 0.15), 0 0 60px rgba(251, 191, 36, 0.05)",
        "glow-red":    "0 0 20px rgba(248, 113, 113, 0.15), 0 0 60px rgba(248, 113, 113, 0.05)",
        "glow-pink":   "0 0 20px rgba(244, 114, 182, 0.15), 0 0 60px rgba(244, 114, 182, 0.05)",
        none: "none",
      },

      /* ─── Z-Index ─── */
      zIndex: {
        deep:    "-1",
        base:    "0",
        raised:  "1",
        dropdown: "10",
        sticky:  "20",
        banner:  "30",
        overlay: "40",
        modal:   "50",
        popover: "60",
        tooltip: "70",
        toast:   "80",
        max:     "9999",
      },

      /* ─── Backdrop Blur ─── */
      backdropBlur: {
        xs:  "4px",
        sm:  "8px",
        md:  "12px",
        lg:  "16px",
        xl:  "24px",
        "2xl": "40px",
        "3xl": "64px",
      },

      /* ─── Transition Duration ─── */
      transitionDuration: {
        instant: "50ms",
        fast:    "150ms",
        normal:  "200ms",
        slow:    "300ms",
        slower:  "500ms",
        slowest: "700ms",
      },

      /* ─── Transition Timing ─── */
      transitionTimingFunction: {
        "default": "cubic-bezier(0.4, 0, 0.2, 1)",
        "in":      "cubic-bezier(0.4, 0, 1, 1)",
        "out":     "cubic-bezier(0, 0, 0.2, 1)",
        "in-out":  "cubic-bezier(0.4, 0, 0.2, 1)",
        "bounce":  "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring":  "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "elastic": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth":  "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },

      /* ─── Opacity ─── */
      opacity: {
        2.5: "0.025",
        3:   "0.03",
        4:   "0.04",
        6:   "0.06",
        8:   "0.08",
        12:  "0.12",
        15:  "0.15",
        35:  "0.35",
        85:  "0.85",
      },

      /* ─── Animations ─── */
      animation: {
        "fade-in":       "fadeIn 0.6s cubic-bezier(0, 0, 0.2, 1) both",
        "fade-up":       "fadeUp 0.6s cubic-bezier(0, 0, 0.2, 1) both",
        "fade-down":     "fadeDown 0.5s cubic-bezier(0, 0, 0.2, 1) both",
        "fade-in-scale": "fadeInScale 0.4s cubic-bezier(0, 0, 0.2, 1) both",
        "scale-in":      "scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
        "slide-right":   "slideInRight 0.5s cubic-bezier(0, 0, 0.2, 1) both",
        "slide-left":    "slideInLeft 0.5s cubic-bezier(0, 0, 0.2, 1) both",
        "slide-down":    "slideDown 0.3s cubic-bezier(0, 0, 0.2, 1) both",
        "slide-up":      "slideUp 0.3s cubic-bezier(0, 0, 0.2, 1) both",
        "count-up":      "countUp 0.4s cubic-bezier(0, 0, 0.2, 1) both",
        "pulse-slow":    "pulse 2s infinite",
        "pulse-slower":  "pulse 3s infinite",
        "spin-slow":     "spin 3s linear infinite",
        "bounce-subtle": "bounceSubtle 2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        ticker:          "tickerScroll 40s linear infinite",
        gradient:        "gradientShift 12s ease infinite",
        shimmer:         "shimmer 1.5s ease-in-out infinite",
        "expand-width":  "expandWidth 0.6s cubic-bezier(0, 0, 0.2, 1) both",
        "overlay-in":    "overlayFadeIn 0.2s cubic-bezier(0, 0, 0.2, 1) both",
        "modal-in":      "contentScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
        "dropdown-in":   "slideDown 0.2s cubic-bezier(0, 0, 0.2, 1) both",
        "toast-in":      "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
      },

      /* ─── Keyframes ─── */
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeDown: {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        tickerScroll: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        gradientShift: {
          "0%":   { backgroundPosition: "0% 50%" },
          "50%":  { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        skeletonPulse: {
          "0%":   { opacity: "0.6" },
          "50%":  { opacity: "0.3" },
          "100%": { opacity: "0.6" },
        },
        overlayFadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        contentScaleIn: {
          from: { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        expandWidth: {
          from: { width: "0%" },
          to:   { width: "100%" },
        },
        progressStripe: {
          "0%":   { backgroundPosition: "1rem 0" },
          "100%": { backgroundPosition: "0 0" },
        },
      },

      /* ─── Background Images ─── */
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh":
          "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(139,92,246,0.04), rgba(236,72,153,0.03))",
        "gradient-mesh-warm":
          "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(251,191,36,0.04), rgba(251,146,60,0.03))",
      },

      /* ─── Screens (breakpoints) ─── */
      screens: {
        xs: "475px",
      },
    },
  },
  plugins: [],
};
