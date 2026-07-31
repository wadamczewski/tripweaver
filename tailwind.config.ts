import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        inkSoft: "#1c3149",
        mist: "#f5f2eb",
        paper: "#fffcf7",
        surface: "#fbf7ef",
        line: "#e4ded4",
        accent: "#c85f45",
        accentDark: "#8f3b2d",
        accentSoft: "#f4e2dc",
        sage: "#67816f",
        sageDark: "#4c6355"
      },
      boxShadow: {
        lift: "0 24px 70px rgba(35, 41, 49, 0.12)",
        soft: "0 14px 40px rgba(35, 41, 49, 0.08)",
        glow: "0 0 0 4px rgba(200, 95, 69, 0.14)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.35" }],
        sm: ["0.9375rem", { lineHeight: "1.5" }]
      },
      transitionTimingFunction: {
        springy: "cubic-bezier(0.34, 1.56, 0.64, 1)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
