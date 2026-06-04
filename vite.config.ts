import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const port = Number(process.env.PORT) || 10000;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port,
    host: "0.0.0.0",
  },
  preview: {
    port,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});