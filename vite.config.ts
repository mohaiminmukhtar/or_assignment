/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Plotly is lazy-loaded into its own chunk; it is large by nature.
    chunkSizeWarningLimit: 5000,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
