import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      colors: {
        felt: {
          DEFAULT: "#143d32",
          muted: "#1f5646",
          light: "#2a6b56",
        },
        ink: "#17110d",
        parchment: "#fff9f0",
        cream: "#faf3e8",
        cherry: {
          DEFAULT: "#b4232f",
          glow: "#e85d6a",
        },
      },
      boxShadow: {
        card: "0 22px 56px rgba(20, 61, 50, 0.22), 0 4px 12px rgba(23, 17, 13, 0.08)",
        lift: "0 12px 28px rgba(20, 61, 50, 0.18), 0 2px 6px rgba(23, 17, 13, 0.06)",
        inset: "inset 0 2px 4px rgba(255, 255, 255, 0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s ease-out both",
        "fade-in": "fade-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
