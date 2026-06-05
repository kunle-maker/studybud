import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "robots.txt", "icons/*.svg"],
      manifest: {
        name: "StudyBud — AI Study Assistant",
        short_name: "StudyBud",
        description: "AI-powered study assistant: summaries, flashcards, quizzes, OCR, teacher chat & more.",
        theme_color: "#0066f5",
        background_color: "#f5f6fa",
        display: "standalone",
        orientation: "portrait-primary",
        categories: ["education", "productivity"],
        icons: [
          { src: "icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "icons/maskable-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
  },
});
