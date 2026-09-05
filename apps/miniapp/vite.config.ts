import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // One .env at the repo root, same file the API reads — matches this monorepo's
  // existing convention rather than a second, miniapp-local env file.
  envDir: "../..",
});
