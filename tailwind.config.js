/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
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
      },
      fontFamily: {
        heading: ["'Instrument Serif'", "Georgia", "serif"],
        body: ["'DM Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        "3xs": ["9px", { lineHeight: "12px" }],
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
        120: "30rem",
      },
      maxWidth: {
        "8xl": "88rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.8s ease-out both",
        "fade-in-scale": "fadeInScale 0.4s ease-out both",
        "slide-right": "slideInRight 0.5s ease-out both",
        "slide-left": "slideInLeft 0.5s ease-out both",
        "pulse-slow": "pulse 2s infinite",
        "pulse-slower": "pulse 3s infinite",
        ticker: "tickerScroll 40s linear infinite",
        gradient: "gradientShift 12s ease infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "count-up": "countUp 0.4s ease-out both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeInScale: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        tickerScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh":
          "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(139,92,246,0.04), rgba(236,72,153,0.03))",
      },
    },
  },
  plugins: [],
};
