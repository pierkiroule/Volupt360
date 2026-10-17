import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "echo-mood-music-catalog",
      resolveId(id) {
        if (id === "virtual:echo-music") return "\0echo-music";
      },
      load(id) {
        if (id !== "\0echo-music") return;
        let tracks = [];
        try {
          tracks = readdirSync(new URL("./public/ambiances/", import.meta.url))
            .filter((file) => /\.mp3$/i.test(file))
            .sort()
            .map((file) => "ambiances/" + encodeURIComponent(file));
        } catch {}
        return `export default ${JSON.stringify(tracks)}`;
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
