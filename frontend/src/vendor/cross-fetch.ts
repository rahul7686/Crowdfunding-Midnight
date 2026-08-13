/**
 * Browser shim for `cross-fetch`.
 *
 * `cross-fetch`'s browser build (`dist/browser-ponyfill.js`) ends with
 * `exports = ctx.fetch`, i.e. it re-exports the native `window.fetch` as a
 * bare, unbound reference. WebIDL-bound APIs like `fetch` throw a TypeError
 * ("Failed to execute 'fetch' on 'Window': Illegal invocation", surfaced as
 * "Failed to fetch") when invoked without `window` as `this` — which is exactly
 * what the Midnight SDK's Apollo HttpLink does
 * (`@midnight-ntwrk/midnight-js-indexer-public-data-provider` constructs
 * `new HttpLink({ fetch, uri })` from this import).
 *
 * Vite aliases `cross-fetch` to this file in the browser bundle, so every
 * `fetch` call is bound to `window`. Node never loads this file (the SDK's node
 * path uses `cross-fetch`'s node-ponyfill), so `window` is always defined here.
 */

const boundFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => window.fetch(input, init);

export default boundFetch;

export { boundFetch as fetch };

export const Headers = window.Headers;
export const Request = window.Request;
export const Response = window.Response;
