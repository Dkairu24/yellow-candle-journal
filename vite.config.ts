import { defineConfig } from "vite";

// base "./" keeps asset links relative, so the same build works on Vercel (site root)
// and on GitHub Pages (a /yellow-candle-journal/ sub-path).
export default defineConfig({
  base: "./",
  build: { outDir: "dist", sourcemap: false },
});
