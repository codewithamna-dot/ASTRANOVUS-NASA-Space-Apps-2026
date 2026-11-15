import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The FastAPI service is the single scientific backend. In dev, "/api/*" is proxied to it
// (override with VITE_DEV_API_TARGET). In production set VITE_API_URL to the deployed API origin.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = env.VITE_DEV_API_TARGET || "http://localhost:8000";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: { "/api": { target, changeOrigin: true, rewrite: (p: string) => p.replace(/^\/api/, "") } },
    },
    build: {
      chunkSizeWarningLimit: 1500,
    },
    test: { environment: "node", include: ["src/**/*.test.ts"] },
  };
});
