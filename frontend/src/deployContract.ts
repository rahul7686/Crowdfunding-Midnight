import { sampleSigningKey } from "@midnight-ntwrk/compact-runtime";
import {
  createUnprovenDeployTx,
  submitTxAsync,
} from "@midnight-ntwrk/midnight-js-contracts";

import { CompiledCrowdfundingContract } from "./contract";
import { PRIVATE_STATE_ID, type ConnectedSession } from "./providers";
import { createCrowdfundingPrivateState } from "./witnesses";

/**
 * Deploys a new instance of the Crowdfunding-Midnight contract directly
 * from the browser using the 1AM wallet extension.
 *
 * Follows the 1AM Preprod deployment flow from the reference implementation
 * (tusharpamnani/midnight-skills-counter-dapp):
 *   1. Creates an unproven deploy transaction with CompiledCrowdfundingContract
 *   2. Proves + balances the transaction via 1AM wallet extension
 *   3. Submits the deploy transaction to the Midnight network
 *   4. Initializes local private state & signing key for the contract address
 */
export async function deployContract(session: ConnectedSession): Promise<string> {
  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  const initialPrivateState = createCrowdfundingPrivateState(secretKey);
  const signingKey = sampleSigningKey();

  const deployTxData = await (createUnprovenDeployTx as any)(
    {
      zkConfigProvider: session.providers.zkConfigProvider,
      walletProvider: session.providers.walletProvider,
    },
    {
      compiledContract: CompiledCrowdfundingContract,
      args: [],
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState,
      signingKey,
    },
  );

  const contractAddress = deployTxData.public.contractAddress;

  // Submit deploy transaction through the wallet's proving & network relayer
  await (submitTxAsync as any)(session.providers, {
    unprovenTx: deployTxData.private.unprovenTx,
  });

  // Register contract address & initial private state in private state provider
  await session.providers.privateStateProvider.setContractAddress(contractAddress);
  await session.providers.privateStateProvider.set(
    PRIVATE_STATE_ID,
    deployTxData.private.initialPrivateState,
  );
  await session.providers.privateStateProvider.setSigningKey(
    contractAddress,
    deployTxData.private.signingKey,
  );

  return contractAddress;
}
