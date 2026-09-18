import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // BappaVerse Design Tokens
        background: "#FFFDF8",
        surface: "#FFFFFF",
        "surface-secondary": "#FFF7ED",
        primary: {
          DEFAULT: "#D97706",
          light: "#FFF1D6",
          dark: "#B45309",
        },
        maroon: {
          DEFAULT: "#7F1D1D",
          light: "#FEF2F2",
          dark: "#5B1010",
        },
        gold: {
          DEFAULT: "#C69214",
          light: "#FEF9C3",
          dark: "#A17110",
        },
        "bappa-text": "#292524",
        "bappa-muted": "#78716C",
        "bappa-border": "#E7E0D5",
        success: "#15803D",
        error: "#B91C1C",
        "success-light": "#DCFCE7",
        "error-light": "#FEE2E2",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 4px 0 rgba(41, 37, 36, 0.08), 0 0 0 1px rgba(231, 224, 213, 0.5)",
        "card-hover": "0 4px 16px 0 rgba(41, 37, 36, 0.12), 0 0 0 1px rgba(231, 224, 213, 0.6)",
        "card-lg": "0 8px 32px 0 rgba(41, 37, 36, 0.10)",
        saffron: "0 4px 20px 0 rgba(217, 119, 6, 0.25)",
        gold: "0 4px 20px 0 rgba(198, 146, 20, 0.3)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      backgroundImage: {
        "festival-pattern": "radial-gradient(circle at 20% 80%, rgba(217, 119, 6, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(127, 29, 29, 0.04) 0%, transparent 50%)",
        "saffron-gradient": "linear-gradient(135deg, #D97706, #B45309)",
        "maroon-gradient": "linear-gradient(135deg, #7F1D1D, #5B1010)",
        "gold-gradient": "linear-gradient(135deg, #C69214, #A17110)",
        "hero-gradient": "linear-gradient(160deg, #FFFDF8 0%, #FFF7ED 50%, #FFF1D6 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "number-pop": "numberPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bounce-soft": "bounceSoft 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(198, 146, 20, 0.3)" },
          "50%": { boxShadow: "0 0 0 8px rgba(198, 146, 20, 0)" },
        },
        numberPop: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "70%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        bounceSoft: {
          "0%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-8px)" },
          "70%": { transform: "translateY(-4px)" },
          "100%": { transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
