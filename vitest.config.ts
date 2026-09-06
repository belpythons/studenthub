import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Modul murni yang dipakai bersama aplikasi dan Edge Function.
      "@shared": path.resolve(__dirname, "supabase/functions/_shared"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "supabase/functions/_shared/**/*.test.ts"],
  },
});
