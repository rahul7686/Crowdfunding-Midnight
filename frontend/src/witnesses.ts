/**
 * PRIVATE state + witnesses for the Private Crowdfunding contract (browser build).
 *
 * PRIVATE STATE (lives only in the encrypted local private-state store, never on
 * the ledger, never sent to the network):
 *   - secretKey:       the campaign key generated once in this browser. Only
 *                      one-way hashes of it ever appear on-chain (the owner
 *                      pseudonym disclosed by launchCampaign, and the blinded
 *                      donation receipts).
 *   - pendingDonation: the amount the user wants to donate next. It is read by
 *                      the donationAmount() witness, proved inside the donate()
 *                      circuit, and DROPPED to 0 immediately after the proof is
 *                      built. It is never rendered, logged, or persisted beyond
 *                      that instant.
 *
 * IMPORTANT: neither field may ever be logged, rendered, or persisted by the
 * UI. Witness values are read at call time, used to build a zero-knowledge
 * proof, and then discarded.
 */

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger } from "./contracts/index.js";

export type CrowdfundingPrivateState = {
  readonly secretKey: Uint8Array;
  readonly pendingDonation: bigint;
};

export const createCrowdfundingPrivateState = (
  secretKey: Uint8Array,
  pendingDonation = 0n,
): CrowdfundingPrivateState => ({ secretKey, pendingDonation });

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
