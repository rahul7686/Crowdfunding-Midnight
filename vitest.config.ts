import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    alias: {
      "@midnight-ntwrk/compact-runtime": path.resolve(__dirname, "node_modules/@midnight-ntwrk/compact-runtime/dist/index.js"),
    },
  },
});
