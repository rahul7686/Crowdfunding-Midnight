/**
 * Bundles the compiled Private Crowdfunding contract with its witnesses for the
 * browser. The generated implementation (frontend/src/contracts/index.js) is
 * copied here from contracts/managed by scripts/sync-frontend-contract.mjs.
 */

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

import * as Implementation from "./contracts/index.js";
import { type CrowdfundingPrivateState, witnesses } from "./witnesses";

export const CompiledCrowdfundingContract = CompiledContract.make<
  Implementation.Contract<CrowdfundingPrivateState>
>("PrivateCrowdfunding", Implementation.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
);

export {
  CampaignStatus,
  ledger,
} from "./contracts/index.js";
export type { CampaignEntry, Ledger } from "./contracts/index.js";
