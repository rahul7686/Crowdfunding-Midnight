/**
 * Headless simulator for the Private Crowdfunding contract — the same circuit
 * runtime the proof backend uses, without needing Docker or a network. This is
 * the primary testbed for circuit logic and state transitions.
 *
 * Supports MULTIPLE simultaneous campaigns: every circuit is addressed by a
 * campaign id, exactly like the real dApp.
 */

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type CampaignEntry,
  type Ledger,
  ledger,
  pureCircuits,
} from "../contracts/managed/private-crowdfunding/contract/index.js";
import { type CrowdfundingPrivateState, witnesses } from "../src/contract/witnesses.js";

/**
 * Mirrors Compact's builtin `pad(n, s)`: UTF-8 bytes of `s` left-aligned in a
 * zero-filled n-byte array (the compiler inlines this exact constant).
 */
export function pad(n: number, s: string): Uint8Array {
  const out = new Uint8Array(n);
  const bytes = new TextEncoder().encode(s);
  if (bytes.length > n) throw new Error("pad: string longer than target size");
  out.set(bytes, 0);
  return out;
}

export class CrowdfundingSimulator {
  readonly contract: Contract<CrowdfundingPrivateState>;
  circuitContext: CircuitContext<CrowdfundingPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<CrowdfundingPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext(
        { secretKey, pendingDonation: 0n },
        "0".repeat(64),
      ),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /** Switch to a different secret key, e.g. to simulate another donor/owner. */
  public switchUser(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
      pendingDonation: 0n,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): CrowdfundingPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  /** All campaigns as id -> entry pairs, ordered by id. */
  public listCampaigns(): Array<[bigint, CampaignEntry]> {
    const out: Array<[bigint, CampaignEntry]> = [];
    for (const [id, entry] of this.getLedger().campaigns) {
      out.push([id, entry]);
    }
    out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return out;
  }

  /** The campaign with the given id (throws if it does not exist). */
  public getCampaign(id: bigint): CampaignEntry {
    return this.getLedger().campaigns.lookup(id);
  }

  /**
   * Launch a campaign payable to the given Zswap coin public key (raw bytes).
   * Returns the new campaign id disclosed by the circuit.
   */
  public launchCampaign(
    title: string,
    description: string,
    target: bigint,
    recipient: Uint8Array,
  ): bigint {
    const result = this.contract.impureCircuits.launchCampaign(
      this.circuitContext,
      title,
      description,
      target,
      recipient,
    );
    this.circuitContext = result.context;
    return result.result;
  }

  /**
   * Donate `amount` to the campaign `campaignId`. The amount is loaded into the
   * private witness (`pendingDonation`), used to build the proof, then dropped —
   * exactly as the real dApp behaves. Returns the blinded receipt disclosed by
   * the circuit.
   */
  public donate(campaignId: bigint, amount: bigint): Uint8Array {
    // The pure-ledger lookup() throws on a missing key, so only read the current
    // aggregate when the campaign actually exists. When it does not, we let the
    // circuit run with a placeholder newTotal: its own "Campaign does not exist"
    // assert fires before any lookup, so the authoritative error comes from the
    // contract rather than from this helper.
    const campaigns = this.getLedger().campaigns;
    const raised = campaigns.member(campaignId)
      ? campaigns.lookup(campaignId).raised
      : 0n;
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      pendingDonation: amount,
    };
    const result = this.contract.impureCircuits.donate(
      this.circuitContext,
      campaignId,
      raised + amount,
    );
    this.circuitContext = result.context;
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      pendingDonation: 0n,
    };
    return result.result;
  }

  /** Owner-only. Returns the disclosed final aggregate (raised). */
  public closeCampaign(campaignId: bigint): bigint {
    const result = this.contract.impureCircuits.closeCampaign(this.circuitContext, campaignId);
    this.circuitContext = result.context;
    return result.result;
  }

  /** The pseudonym the contract discloses for a given secret key. */
  public ownerPseudonym(secretKey: Uint8Array): Uint8Array {
    return pureCircuits.publicKey(secretKey, pad(32, "owner"));
  }

  /**
   * The native NIGHT coins the circuit has produced so far across all calls,
   * addressed to their recipients. The color of a native NIGHT coin is 32 zero
   * bytes.
   */
  public getZswapOutputs(): Array<{
    nonce: Uint8Array;
    color: Uint8Array;
    value: bigint;
    recipientBytes: Uint8Array;
  }> {
    return this.circuitContext.currentZswapLocalState.outputs.map((output) => ({
      nonce: output.coinInfo.nonce,
      color: output.coinInfo.color,
      value: output.coinInfo.value,
      recipientBytes: (
        output.recipient.left as unknown as { bytes: Uint8Array }
      ).bytes,
    }));
  }

  /** The most recent coin produced by the last circuit call (throws if none). */
  public getLastZswapOutput(): {
    nonce: Uint8Array;
    color: Uint8Array;
    value: bigint;
    recipientBytes: Uint8Array;
  } {
    const outputs = this.getZswapOutputs();
    const last = outputs[outputs.length - 1];
    if (!last) throw new Error("no Zswap outputs produced");
    return last;
  }
}
