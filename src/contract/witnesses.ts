/**
 * Private state + witnesses for the Private Crowdfunding contract.
 *
 * PRIVATE STATE (lives only in the DApp's local private-state store, never on
 * the ledger):
 *   - secretKey:       the user's Midnight secret key. Only one-way hashes of it
 *                      ever appear on-chain (owner pseudonym, donation receipts).
 *   - pendingDonation: the amount the user wants to donate next. It is read by
 *                      the donationAmount() witness, proved inside the donate()
 *                      circuit, and DROPPED immediately after the proof is built.
 *
 * IMPORTANT: neither field may ever be logged, rendered, or persisted by the
 * frontend. Witness values are generated at call time and discarded.
 */

import { createHash } from "node:crypto";

import { Ledger } from "../../contracts/managed/private-crowdfunding/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

export type CrowdfundingPrivateState = {
  readonly secretKey: Uint8Array;
  readonly pendingDonation: bigint;
};

/**
 * Derives the campaign secret key deterministically from the wallet seed.
 *
 * The owner pseudonym published by launchCampaign is a one-way hash of this key,
 * and closeCampaign is authorized by matching against it. Because the key is
 * derived from the seed (not a random value stored only in the private-state
 * store), deploy and cli agree on the owner even if the store is wiped.
 */
export const deriveCampaignSecretKey = (seed: string): Uint8Array => {
  const h = createHash("sha256");
  h.update("crowdfunding:dapp-secret-key:");
  h.update(seed);
  return new Uint8Array(h.digest());
};

export const createCrowdfundingPrivateState = (
  secretKey: Uint8Array,
  pendingDonation = 0n,
): CrowdfundingPrivateState => ({
  secretKey,
  pendingDonation,
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, CrowdfundingPrivateState>): [
    CrowdfundingPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  donationAmount: ({
    privateState,
  }: WitnessContext<Ledger, CrowdfundingPrivateState>): [
    CrowdfundingPrivateState,
    bigint,
  ] => [privateState, privateState.pendingDonation],
};
