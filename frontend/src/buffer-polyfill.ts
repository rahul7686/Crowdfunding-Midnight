import { Buffer } from 'buffer';

// Some @midnight-ntwrk packages (compact-runtime, platform-js,
// wallet-sdk-address-format) reference the Node.js global `Buffer` directly
// without importing it. The browser has no such global, so transactions fail
// with "ReferenceError: Buffer is not defined" when the ledger runs. The
// `buffer` npm polyfill is already aliased in vite.config.ts; this module
// re-exposes it as the global `Buffer` the SDK expects.
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
