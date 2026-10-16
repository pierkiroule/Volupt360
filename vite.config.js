import commonsSearch from "./api/commons-search.js";
import commonsMedia from "./api/commons-media.js";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "commons-relay",
      configureServer(server) {
        server.middlewares.use("/api/commons-search", commonsSearch);
        server.middlewares.use("/api/commons-media", commonsMedia);
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"], react: ["react", "react-dom"] },
      },
    },
  },
});
