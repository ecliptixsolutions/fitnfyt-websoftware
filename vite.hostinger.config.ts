import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: "hostinger",
  plugins: [tailwindcss(), tsConfigPaths(), react()],
  publicDir: "public",
  build: {
    outDir: "../hostinger-dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("react") ||
            id.includes("scheduler") ||
            id.includes("use-sync-external-store")
          )
            return "vendor-react";
          if (id.includes("@tanstack")) return "vendor-router";
          if (id.includes("lucide-react")) return "vendor-icons";
        },
      },
    },
  },
});
