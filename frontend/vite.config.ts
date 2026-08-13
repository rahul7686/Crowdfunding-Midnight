import { fileURLToPath, URL } from 'node:url'
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
      // `cross-fetch`'s browser build exports the native `window.fetch` unbound,
      // which breaks when the Midnight SDK calls it through Apollo's HttpLink
      // (`this` is undefined -> Chrome throws a fetch TypeError). Shim it with a
      // `window`-bound fetch so indexer GraphQL queries work in the browser.
      // Absolute path: the dep optimizer resolves aliases relative to the
      // importing module, so a root-relative URL breaks inside node_modules.
      'cross-fetch': fileURLToPath(new URL('./src/vendor/cross-fetch.ts', import.meta.url)),
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
