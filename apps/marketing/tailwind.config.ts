import { preset } from "@gradual/tailwind-config/preset";
import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/ui/*.{ts,tsx}"],
  presets: [preset],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        mono: ["CommitMono", ...defaultTheme.fontFamily.mono],
      },
    },
  },
} satisfies Config;
