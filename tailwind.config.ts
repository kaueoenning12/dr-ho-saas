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
      colors: {
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
        // Brand colors for gradients and custom components
        cyan: {
          DEFAULT: "hsl(193 75% 61%)",
          50: "hsl(193 75% 95%)",
          100: "hsl(193 75% 90%)",
          200: "hsl(193 75% 80%)",
          300: "hsl(193 75% 70%)",
          400: "hsl(193 75% 61%)",
          500: "hsl(193 75% 55%)",
          600: "hsl(193 75% 45%)",
          700: "hsl(193 75% 35%)",
          800: "hsl(193 75% 25%)",
          900: "hsl(193 75% 15%)",
        },
        aqua: {
          DEFAULT: "hsl(166 77% 69%)",
          50: "hsl(166 77% 95%)",
          100: "hsl(166 77% 90%)",
          200: "hsl(166 77% 80%)",
          300: "hsl(166 77% 75%)",
          400: "hsl(166 77% 69%)",
          500: "hsl(166 77% 60%)",
          600: "hsl(166 77% 50%)",
          700: "hsl(166 77% 40%)",
          800: "hsl(166 77% 30%)",
          900: "hsl(166 77% 20%)",
        },
        navy: {
          DEFAULT: "hsl(229 82% 16%)",
          50: "hsl(229 82% 95%)",
          100: "hsl(229 82% 90%)",
          200: "hsl(229 82% 80%)",
          300: "hsl(229 82% 60%)",
          400: "hsl(229 82% 40%)",
          500: "hsl(229 82% 25%)",
          600: "hsl(229 82% 16%)",
          700: "hsl(229 82% 12%)",
          800: "hsl(229 82% 8%)",
          900: "hsl(229 82% 4%)",
        },
        blue: {
          DEFAULT: "hsl(217 91% 60%)",
          50: "hsl(217 91% 95%)",
          100: "hsl(217 91% 90%)",
          200: "hsl(217 91% 80%)",
          300: "hsl(217 91% 70%)",
          400: "hsl(217 91% 60%)",
          500: "hsl(217 91% 50%)",
          600: "hsl(217 91% 45%)",
          700: "hsl(217 91% 35%)",
          800: "hsl(217 91% 25%)",
          900: "hsl(217 91% 15%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "bounce-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.3)",
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.05)",
          },
          "70%": {
            transform: "scale(0.9)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-5px)",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 5px hsl(193 75% 61% / 0.3)",
          },
          "50%": {
            boxShadow: "0 0 20px hsl(193 75% 61% / 0.6), 0 0 30px hsl(193 75% 61% / 0.4)",
          },
        },
        "fade-out": {
          "0%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "bounce-in": "bounce-in 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
