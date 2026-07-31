import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// We proxy /api through Vite so that, in local development, the browser
// treats the frontend and backend as the same origin. This keeps the HTTP-only
// auth cookies (`access_token` / `refresh_token`) working without CORS/SameSite
// issues. Point the target at your backend origin.
const BACKEND_ORIGIN =
  process.env.VITE_PROXY_TARGET || "https://backend.smartlearners.ai";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: BACKEND_ORIGIN,
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
