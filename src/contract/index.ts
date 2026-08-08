/**
 * Bundles the compiled Private Crowdfunding contract with its witnesses,
 * exposing a single `CompiledContract` for deploy / join / call flows.
 */

import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "../../contracts/managed/private-crowdfunding/contract/index.js";
export * from "./witnesses";

import * as CompiledPrivateCrowdfundingContract from "../../contracts/managed/private-crowdfunding/contract/index.js";
import * as Witnesses from "./witnesses";

export const CompiledPrivateCrowdfundingContractContract = CompiledContract.make<
  CompiledPrivateCrowdfundingContract.Contract<Witnesses.CrowdfundingPrivateState>
>(
  "PrivateCrowdfunding",
  CompiledPrivateCrowdfundingContract.Contract<Witnesses.CrowdfundingPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets(
    "../../contracts/managed/private-crowdfunding",
  ),
);
