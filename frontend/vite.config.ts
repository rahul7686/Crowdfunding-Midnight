import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // This project lives on a Windows drive (WSL /mnt/c); inotify does not
      // reliably fire there, so Vite kept serving stale transforms after file
      // edits. Polling makes edits visible without restarts.
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      // `level` -> `abstract-level` uses Node's EventEmitter/Buffer at module
      // scope (`class AbstractLevel extends EventEmitter`). The browser has no
      // Node builtins, so map them to their npm polyfills.
      events: 'events',
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    exclude: [
      // These packages contain wasm-bindgen bundler output with `#self`
      // self-referential imports. Pre-bundling them renames exports and
      // breaks the synchronous wasm initialization (__wbindgen_start), so
      // they must be served un-optimized through the transform pipeline.
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/onchain-runtime-v3',
    ],
  },
})
