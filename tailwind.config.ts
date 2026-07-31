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
        mist: "#f5f2eb",
        paper: "#fffcf7",
        line: "#e4ded4",
        accent: "#c85f45",
        accentDark: "#8f3b2d",
        sage: "#67816f"
      },
      boxShadow: {
        lift: "0 24px 70px rgba(35, 41, 49, 0.12)",
        soft: "0 14px 40px rgba(35, 41, 49, 0.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
