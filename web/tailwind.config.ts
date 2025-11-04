import type { Config } from "tailwindcss";

const config = {
  darkMode: false,
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      borderRadius: {
        xl: "1rem",
      },
      boxShadow: {
        card: "0 12px 40px -20px rgba(15, 23, 42, 0.6)",
      },
      fontFamily: {
        sans: "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        mono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace",
      },
    },
  },
} satisfies Config;

export default config;
