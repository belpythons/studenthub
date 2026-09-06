import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
          DEFAULT: "hsl(var(--sidebar))",
          accent: "hsl(var(--sidebar-accent))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
        },
      },
      /*
        Claymorphism tidak punya garis. `border-foreground` dan `border-input`
        tersebar di 73 tempat sebagai garis hitam 2px warisan neubrutalism —
        keduanya di-override di sini sebagai *warna border* saja, terpisah dari
        `text-foreground`, jadi seluruhnya berubah jadi tepi liat lembut tanpa
        satu pun dari 48 berkas itu perlu disunting.
      */
      borderColor: {
        foreground: "hsl(var(--clay-edge))",
        input: "hsl(var(--clay-edge))",
      },
      borderRadius: {
        sm: "calc(var(--radius) * 0.5)",
        md: "calc(var(--radius) * 0.75)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) * 1.4)",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Times New Roman", "Times", "serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      /*
        Claymorphism: satu bayangan jatuh lembut + dua inset — sorot terang di
        tepi atas dan cekungan gelap di tepi bawah. Kombinasi itulah yang
        membuat permukaan terbaca seperti liat yang ditekan, bukan kartu datar.

        Nama kuncinya sengaja dipertahankan dan hanya nilainya yang diganti —
        79 pemakaian shadow-xs / shadow-card / shadow-pop / shadow-nav di
        seluruh aplikasi jadi tidak perlu disentuh sama sekali.
      */
      boxShadow: {
        xs: "0 4px 10px -4px hsl(var(--clay-shadow)), inset 0 2px 3px 0 hsl(var(--clay-light)), inset 0 -3px 5px 0 hsl(var(--clay-dent))",
        card: "0 12px 26px -12px hsl(var(--clay-shadow)), inset 0 3px 5px 0 hsl(var(--clay-light)), inset 0 -5px 9px 0 hsl(var(--clay-dent))",
        pop: "0 22px 46px -16px hsl(var(--clay-shadow)), inset 0 3px 6px 0 hsl(var(--clay-light)), inset 0 -6px 12px 0 hsl(var(--clay-dent))",
        nav: "0 -10px 24px -12px hsl(var(--clay-shadow))",
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
        // Denyut lembut, bukan kedip blok: permukaan liat tidak pernah
        // berpindah nilai secara mendadak.
        "clay-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "clay-pulse": "clay-pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
