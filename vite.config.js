import birdCatalog from "./api/bird-catalog.js";
import birdRecording from "./api/bird-recording.js";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "inaturalist-relay",
      configureServer(server) {
        server.middlewares.use("/api/bird-catalog", birdCatalog);
        server.middlewares.use("/api/bird-recording", birdRecording);
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
