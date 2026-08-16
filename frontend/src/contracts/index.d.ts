import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum CampaignStatus { ACTIVE = 0, CLOSED = 1 }

export type CampaignEntry = { status: CampaignStatus;
                              owner: Uint8Array;
                              recipient: Uint8Array;
                              title: { is_some: boolean, value: string };
                              description: { is_some: boolean, value: string };
                              target: bigint;
                              raised: bigint;
                              donationsCount: bigint;
                              sequence: bigint
                            };

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  donationAmount(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  launchCampaign(context: __compactRuntime.CircuitContext<PS>,
                 newTitle_0: string,
                 newDescription_0: string,
                 newTarget_0: bigint,
                 newRecipient_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  donate(context: __compactRuntime.CircuitContext<PS>,
         campaignId_0: bigint,
         newTotal_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeCampaign(context: __compactRuntime.CircuitContext<PS>,
                campaignId_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
}

export type ProvableCircuits<PS> = {
  launchCampaign(context: __compactRuntime.CircuitContext<PS>,
                 newTitle_0: string,
                 newDescription_0: string,
                 newTarget_0: bigint,
                 newRecipient_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  donate(context: __compactRuntime.CircuitContext<PS>,
         campaignId_0: bigint,
         newTotal_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeCampaign(context: __compactRuntime.CircuitContext<PS>,
                campaignId_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array, salt_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  publicKey(context: __compactRuntime.CircuitContext<PS>,
            sk_0: Uint8Array,
            salt_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  launchCampaign(context: __compactRuntime.CircuitContext<PS>,
                 newTitle_0: string,
                 newDescription_0: string,
                 newTarget_0: bigint,
                 newRecipient_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  donate(context: __compactRuntime.CircuitContext<PS>,
         campaignId_0: bigint,
         newTotal_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  closeCampaign(context: __compactRuntime.CircuitContext<PS>,
                campaignId_0: bigint): __compactRuntime.CircuitResults<PS, bigint>;
}

export type Ledger = {
  campaigns: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): CampaignEntry;
    [Symbol.iterator](): Iterator<[bigint, CampaignEntry]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
