import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Outfit", "sans-serif"],
        sans: ["Outfit", "sans-serif"],
      },
      /* Typography tokens — mirrors src/design-system/typography.ts */
      fontSize: {
        display: ["24px", { lineHeight: "1", letterSpacing: "0", fontWeight: "500" }],
        heading: ["18px", { lineHeight: "1.1", letterSpacing: "0", fontWeight: "600" }],
        section: ["18px", { lineHeight: "1", letterSpacing: "0", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.2", letterSpacing: "0", fontWeight: "400" }],
        meta: ["10px", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "400" }],
        action: ["14px", { lineHeight: "1", letterSpacing: "0", fontWeight: "500" }],
      },

      /* Spacing tokens — mirrors src/design-system/tokens.ts */
      spacing: {
        100: "4px",
        200: "8px",
        300: "16px",
        400: "24px",
        500: "32px",
      },

      maxWidth: {
        page: "448px",
      },

      /* Motion tokens */
      transitionDuration: {
        fast: "120ms",
        DEFAULT: "220ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.2, 0, 0, 1.2)",
      },


      colors: {
        /* Minby design tokens — see :root in src/index.css */
        butter: {
          100: "hsl(var(--butter-100))",
          200: "hsl(var(--butter-200))",
          300: "hsl(var(--butter-300))",
        },
        breeze: {
          100: "hsl(var(--breeze-100))",
          200: "hsl(var(--breeze-200))",
          300: "hsl(var(--breeze-300))",
        },
        berry: {
          100: "hsl(var(--berry-100))",
          200: "hsl(var(--berry-200))",
          300: "hsl(var(--berry-300))",
        },
        olive: {
          100: "hsl(var(--olive-100))",
          200: "hsl(var(--olive-200))",
          300: "hsl(var(--olive-300))",
        },
        white: "hsl(var(--neutral-white))",
        egg: "hsl(var(--neutral-egg))",
        linen: "hsl(var(--neutral-linen))",
        ink: {
          DEFAULT: "hsl(var(--text-ink))",
          inverse: "hsl(var(--text-inverse))",
          secondary: "hsl(var(--color-text-secondary))",
          muted: "hsl(var(--color-text-muted))",
          faint: "hsl(var(--color-text-faint))",
        },
        activity: "hsl(var(--activity))",

        border: "hsl(var(--border))",

        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "dusty-rose": {
          DEFAULT: "hsl(var(--dusty-rose))",
          bg: "hsl(var(--dusty-rose-bg))",
        },
        salvia: {
          DEFAULT: "hsl(var(--salvia))",
          bg: "hsl(var(--salvia-bg))",
        },
        lavender: {
          DEFAULT: "hsl(var(--lavender))",
          bg: "hsl(var(--lavender-bg))",
        },
        surface: {
          DEFAULT: "hsl(var(--color-surface))",
          card: "hsl(var(--color-surface-card))",
          raised: "hsl(var(--color-surface-raised))",
          rose: "hsl(var(--color-surface-rose))",
          sage: "hsl(var(--color-surface-sage))",
        },
        line: {
          subtle: "hsl(var(--color-border-subtle))",
          lavender: "hsl(var(--color-border-lavender))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        /* Radius tokens — mirrors src/design-system/tokens.ts */
        100: "8px",
        200: "16px",
        300: "28px",
        avatar: "38%",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "breathe": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.4" },
          "50%": { transform: "scale(1.15)", opacity: "0.6" },
        },
        "emoji-wobble": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-6deg)" },
          "75%": { transform: "rotate(6deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.4s ease-out both",
        "breathe": "breathe 3s ease-in-out infinite",
        "emoji-wobble": "emoji-wobble 0.6s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
