/**
 * Error mapping: turn raw SDK / wallet errors into user-friendly messages.
 *
 * The technical error is always preserved in the console (via console.error)
 * for debugging — only what the user sees is reworded.
 */

export type ErrorContext = "connect" | "launch" | "donate" | "close" | "generic";

const PATTERNS: Array<{ test: RegExp; message: string }> = [
  {
    test: /custom error: 115|invalid proof|proof.*(invalid|rejected|reject)/i,
    message:
      "The network rejected the transaction's proof (custom error 115). This usually means the indexer was behind or out of sync with the chain when the proof was built. Please try again now — the app waits for the indexer to catch up before submitting.",
  },
  {
    test: /custom error: 170|invalid dust|dust spend/i,
    message:
      "Your wallet's DUST proof was rejected (custom error 170). Your 1AM wallet's copy of the Preprod ledger is out of sync. Open the 1AM extension, let it finish syncing, then retry.",
  },
  {
    test: /temporarily banned|banned|transaction.*pool/i,
    message:
      "The network temporarily banned an identical repeated transaction. Wait a minute, then try again — the app now re-checks the indexer before each attempt.",
  },
  {
    test: /campaign already launched|already launched/i,
    message:
      "An active campaign already exists. Please close the current campaign before launching a new one.",
  },
  {
    test: /rejected|declined|cancelled|not approved|user.*cancel/i,
    message: "The action was rejected in your wallet. No changes were made.",
  },
  {
    test: /insufficient|not enough|out of (coins|funds|balance)|low balance/i,
    message: "Your wallet does not have enough tNIGHT to complete this transaction.",
  },
  {
    test: /network|offline|econn|etimedout|timeout|indexer|fetch failed|load failed/i,
    message: "Network error. Please check your connection and try again.",
  },
  {
    test: /proving|proof|circuit|wasm|zk/i,
    message: "Proof generation failed. Please try again.",
  },
  {
    test: /not (yet )?(connected|initialized)|initialization/i,
    message: "The contract is not connected yet. Please wait a moment and try again.",
  },
  {
    test: /owner|only.*campaign/i,
    message: "Only the campaign owner can perform this action.",
  },
  {
    test: /target|exceed|remaining/i,
    message: "This donation would exceed the remaining funding target.",
  },
];

const FALLBACK =
  "Transaction could not be completed. Please check your wallet and try again.";

export const friendlyError = (err: unknown, context: ErrorContext = "generic"): string => {
  const raw = err instanceof Error ? err.message : String(err);
  console.error(`[${context}]`, err);
  for (const { test, message } of PATTERNS) {
    if (test.test(raw)) return message;
  }
  return FALLBACK;
};
