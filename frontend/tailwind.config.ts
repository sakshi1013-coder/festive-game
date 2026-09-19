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
        // Pastel Festive Game UI Design System
        background: "#FFF9F2",
        surface: "#FFFFFF",
        "surface-soft": "#FFFCF9",
        "surface-secondary": "#FBF6F0",
        
        // Core Pastel Palette
        pastel: {
          pink: "#F6C6C6",
          "pink-light": "#FDF0F0",
          "pink-dark": "#E5989B",
          blue: "#C9DDF5",
          "blue-light": "#F0F6FD",
          "blue-dark": "#9EC1ED",
          mint: "#CFE8D5",
          "mint-light": "#F1FAF3",
          "mint-dark": "#A7D4B2",
          lavender: "#E8D5F2",
          "lavender-light": "#FAF4FC",
          "lavender-dark": "#D1ADE5",
          yellow: "#F9E7A8",
          "yellow-light": "#FFFDF0",
          "yellow-dark": "#E6CA65",
          peach: "#F8DCC8",
          "peach-light": "#FFF6EF",
          "peach-dark": "#E5B99B",
        },

        // Primary Game Accent (Playful Pastel Purple/Indigo)
        primary: {
          DEFAULT: "#7B73DC",
          light: "#EAE8FD",
          dark: "#5A52BD",
        },

        // Secondary Accents
        maroon: {
          DEFAULT: "#D87A80",
          light: "#FDF0F0",
          dark: "#B8585E",
        },
        gold: {
          DEFAULT: "#E5B842",
          light: "#FFFDF0",
          dark: "#C69720",
        },

        // Text Hierarchy
        "bappa-text": "#3D3542",
        "bappa-secondary": "#756C78",
        "bappa-muted": "#9B929B",
        "bappa-border": "#E9DFE2",

        // Game States
        success: {
          DEFAULT: "#4E9F6E",
          light: "#EAF6EE",
          dark: "#3B8256",
        },
        error: {
          DEFAULT: "#D86B6B",
          light: "#FDF0F0",
          dark: "#B54E4E",
        },

        // Subtle Ganapati Accent (Tiny highlights only)
        ganapati: {
          accent: "#E28743",
          spark: "#F2A65A",
        },
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(61, 53, 66, 0.05), 0 0 0 1px rgba(233, 223, 226, 0.6)",
        "card-hover": "0 12px 36px rgba(61, 53, 66, 0.09), 0 0 0 1px rgba(233, 223, 226, 0.9)",
        "card-lg": "0 16px 44px rgba(61, 53, 66, 0.08)",
        pastel: "0 8px 24px rgba(123, 115, 220, 0.18)",
        "pastel-pink": "0 8px 24px rgba(246, 198, 198, 0.35)",
        "pastel-blue": "0 8px 24px rgba(201, 221, 245, 0.4)",
        "pastel-mint": "0 8px 24px rgba(207, 232, 213, 0.4)",
        "pastel-yellow": "0 8px 24px rgba(249, 231, 168, 0.45)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "28px",
      },
      backgroundImage: {
        "pastel-gradient": "linear-gradient(135deg, #FFF9F2 0%, #FAF4FC 50%, #F0F6FD 100%)",
        "quiz-gradient": "linear-gradient(135deg, #FAF4FC 0%, #FDF0F0 100%)",
        "housie-gradient": "linear-gradient(135deg, #F0F6FD 0%, #F1FAF3 100%)",
        "hero-gradient": "linear-gradient(160deg, #FFF9F2 0%, #FFF4EB 40%, #FAF4FC 100%)",
        "festival-dots": "radial-gradient(circle, rgba(123, 115, 220, 0.08) 1.5px, transparent 1.5px)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "number-pop": "numberPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        numberPop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "70%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
