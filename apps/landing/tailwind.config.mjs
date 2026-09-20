/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // Mismos hex que `apps/desktop/renderer/src/index.css` (paleta light/dark oficial de
        // StockNegozia) + un azul de acento propio para la landing, que la app de escritorio no
        // necesita pero el sitio de marketing sí (CTAs, links, glow del hero).
        ink: {
          950: "#0f172a",
          900: "#111827",
          800: "#1e293b",
          600: "#475569",
          400: "#94a3b8",
          200: "#e2e8f0",
          100: "#f1f5f9",
          50: "#f8fafc",
        },
        brand: {
          600: "#2563eb",
          500: "#3b82f6",
          400: "#60a5fa",
          300: "#93c5fd",
        },
        success: "#16a34a",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(60% 50% at 50% 0%, rgba(59,130,246,0.25) 0%, rgba(15,23,42,0) 70%)",
      },
    },
  },
  plugins: [],
};
