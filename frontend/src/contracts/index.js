import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

export var CampaignStatus;
(function (CampaignStatus) {
  CampaignStatus[CampaignStatus['ACTIVE'] = 0] = 'ACTIVE';
  CampaignStatus[CampaignStatus['CLOSED'] = 1] = 'CLOSED';
})(CampaignStatus || (CampaignStatus = {}));

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_1 = new __compactRuntime.CompactTypeEnum(1, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_3 = __compactRuntime.CompactTypeBoolean;

const _descriptor_4 = __compactRuntime.CompactTypeOpaqueString;

class _Maybe_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_4.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_3.fromValue(value_0),
      value: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_some).concat(_descriptor_4.toValue(value_0.value));
  }
}

const _descriptor_5 = new _Maybe_0();

class _CampaignEntry_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_5.alignment().concat(_descriptor_5.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))));
  }
  fromValue(value_0) {
    return {
      status: _descriptor_1.fromValue(value_0),
      owner: _descriptor_2.fromValue(value_0),
      recipient: _descriptor_2.fromValue(value_0),
      title: _descriptor_5.fromValue(value_0),
      description: _descriptor_5.fromValue(value_0),
      target: _descriptor_0.fromValue(value_0),
      raised: _descriptor_0.fromValue(value_0),
      donationsCount: _descriptor_0.fromValue(value_0),
      sequence: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.status).concat(_descriptor_2.toValue(value_0.owner).concat(_descriptor_2.toValue(value_0.recipient).concat(_descriptor_5.toValue(value_0.title).concat(_descriptor_5.toValue(value_0.description).concat(_descriptor_0.toValue(value_0.target).concat(_descriptor_0.toValue(value_0.raised).concat(_descriptor_0.toValue(value_0.donationsCount).concat(_descriptor_0.toValue(value_0.sequence)))))))));
  }
}

const _descriptor_6 = new _CampaignEntry_0();

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_8 = __compactRuntime.CompactTypeField;

class _ShieldedCoinInfo_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      nonce: _descriptor_2.fromValue(value_0),
      color: _descriptor_2.fromValue(value_0),
      value: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.nonce).concat(_descriptor_2.toValue(value_0.color).concat(_descriptor_0.toValue(value_0.value)));
  }
}

const _descriptor_9 = new _ShieldedCoinInfo_0();

class _ZswapCoinPublicKey_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_10 = new _ZswapCoinPublicKey_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_11 = new _ContractAddress_0();

class _Either_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_10.alignment().concat(_descriptor_11.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_10.fromValue(value_0),
      right: _descriptor_11.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_10.toValue(value_0.left).concat(_descriptor_11.toValue(value_0.right)));
  }
}

const _descriptor_12 = new _Either_0();

const _descriptor_13 = new __compactRuntime.CompactTypeVector(4, _descriptor_2);

const _descriptor_14 = new __compactRuntime.CompactTypeVector(5, _descriptor_2);

const _descriptor_15 = new __compactRuntime.CompactTypeVector(3, _descriptor_2);

class _Either_1 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_16 = new _Either_1();

const _descriptor_17 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.localSecretKey) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named localSecretKey');
    }
    if (typeof(witnesses_0.donationAmount) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named donationAmount');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      publicKey(context, ...args_1) {
        return { result: pureCircuits.publicKey(...args_1), context };
      },
      launchCampaign: (...args_1) => {
        if (args_1.length !== 5) {
          throw new __compactRuntime.CompactError(`launchCampaign: expected 5 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const newTitle_0 = args_1[1];
        const newDescription_0 = args_1[2];
        const newTarget_0 = args_1[3];
        const newRecipient_0 = args_1[4];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('launchCampaign',
                                     'argument 1 (as invoked from Typescript)',
                                     'private-crowdfunding.compact line 86 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(newTarget_0) === 'bigint' && newTarget_0 >= 0n && newTarget_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('launchCampaign',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'private-crowdfunding.compact line 86 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     newTarget_0)
        }
        if (!(newRecipient_0.buffer instanceof ArrayBuffer && newRecipient_0.BYTES_PER_ELEMENT === 1 && newRecipient_0.length === 32)) {
          __compactRuntime.typeError('launchCampaign',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'private-crowdfunding.compact line 86 char 1',
                                     'Bytes<32>',
                                     newRecipient_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_4.toValue(newTitle_0).concat(_descriptor_4.toValue(newDescription_0).concat(_descriptor_0.toValue(newTarget_0).concat(_descriptor_2.toValue(newRecipient_0)))),
            alignment: _descriptor_4.alignment().concat(_descriptor_4.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment())))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._launchCampaign_0(context,
                                                partialProofData,
                                                newTitle_0,
                                                newDescription_0,
                                                newTarget_0,
                                                newRecipient_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      donate: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`donate: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const campaignId_0 = args_1[1];
        const newTotal_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('donate',
                                     'argument 1 (as invoked from Typescript)',
                                     'private-crowdfunding.compact line 118 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(campaignId_0) === 'bigint' && campaignId_0 >= 0n && campaignId_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('donate',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'private-crowdfunding.compact line 118 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     campaignId_0)
        }
        if (!(typeof(newTotal_0) === 'bigint' && newTotal_0 >= 0n && newTotal_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('donate',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'private-crowdfunding.compact line 118 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     newTotal_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(campaignId_0).concat(_descriptor_0.toValue(newTotal_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._donate_0(context,
                                        partialProofData,
                                        campaignId_0,
                                        newTotal_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      closeCampaign: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`closeCampaign: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const campaignId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('closeCampaign',
                                     'argument 1 (as invoked from Typescript)',
                                     'private-crowdfunding.compact line 175 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(campaignId_0) === 'bigint' && campaignId_0 >= 0n && campaignId_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('closeCampaign',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'private-crowdfunding.compact line 175 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     campaignId_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(campaignId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._closeCampaign_0(context,
                                               partialProofData,
                                               campaignId_0);
        partialProofData.output = { value: _descriptor_8.toValue(result_0), alignment: _descriptor_8.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      launchCampaign: this.circuits.launchCampaign,
      donate: this.circuits.donate,
      closeCampaign: this.circuits.closeCampaign
    };
    this.provableCircuits = {
      launchCampaign: this.circuits.launchCampaign,
      donate: this.circuits.donate,
      closeCampaign: this.circuits.closeCampaign
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('launchCampaign', new __compactRuntime.ContractOperation());
    state_0.setOperation('donate', new __compactRuntime.ContractOperation());
    state_0.setOperation('closeCampaign', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newMap(
                                                          new __compactRuntime.StateMap()
                                                        ).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _some_0(value_0) { return { is_some: true, value: value_0 }; }
  _left_0(value_0) {
    return { is_left: true, left: value_0, right: { bytes: new Uint8Array(32) } };
  }
  _nativeToken_0() {
    return new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }
  _persistentHash_0(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_15, value_0);
    return result_0;
  }
  _persistentHash_1(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_13, value_0);
    return result_0;
  }
  _persistentHash_2(value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_14, value_0);
    return result_0;
  }
  _createZswapOutput_0(context, partialProofData, coin_0, recipient_0) {
    const result_0 = __compactRuntime.createZswapOutput(context,
                                                        coin_0,
                                                        recipient_0);
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _localSecretKey_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.localSecretKey(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('localSecretKey',
                                 'return value',
                                 'private-crowdfunding.compact line 72 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _donationAmount_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.donationAmount(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('donationAmount',
                                 'return value',
                                 'private-crowdfunding.compact line 73 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _publicKey_0(sk_0, salt_0) {
    return this._persistentHash_0([new Uint8Array([99, 114, 111, 119, 100, 102, 117, 110, 100, 105, 110, 103, 58, 112, 107, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                   salt_0,
                                   sk_0]);
  }
  _launchCampaign_0(context,
                    partialProofData,
                    newTitle_0,
                    newDescription_0,
                    newTarget_0,
                    newRecipient_0)
  {
    __compactRuntime.assert(newTarget_0 > 0n, 'Target must be greater than zero');
    const id_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                           partialProofData,
                                                                           [
                                                                            { dup: { n: 0 } },
                                                                            { idx: { cached: false,
                                                                                     pushPath: false,
                                                                                     path: [
                                                                                            { tag: 'value',
                                                                                              value: { value: _descriptor_17.toValue(0n),
                                                                                                       alignment: _descriptor_17.alignment() } }] } },
                                                                            'size',
                                                                            { popeq: { cached: true,
                                                                                       result: undefined } }]).value);
    __compactRuntime.assert(!_descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                       partialProofData,
                                                                                       [
                                                                                        { dup: { n: 0 } },
                                                                                        { idx: { cached: false,
                                                                                                 pushPath: false,
                                                                                                 path: [
                                                                                                        { tag: 'value',
                                                                                                          value: { value: _descriptor_17.toValue(0n),
                                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                                        { push: { storage: false,
                                                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                                                        'member',
                                                                                        { popeq: { cached: true,
                                                                                                   result: undefined } }]).value),
                            'Campaign id already in use');
    const tmp_0 = { status: 0,
                    owner:
                      this._publicKey_0(this._localSecretKey_0(context,
                                                               partialProofData),
                                        new Uint8Array([111, 119, 110, 101, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
                    recipient: newRecipient_0,
                    title: this._some_0(newTitle_0),
                    description: this._some_0(newDescription_0),
                    target: newTarget_0,
                    raised: 0n,
                    donationsCount: 0n,
                    sequence: 0n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(0n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(id_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return id_0;
  }
  _donate_0(context, partialProofData, campaignId_0, newTotal_0) {
    const campaignCount_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_17.toValue(0n),
                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                       'size',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value);
    __compactRuntime.assert(campaignCount_0 > campaignId_0,
                            'Campaign does not exist');
    const c_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(0n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(campaignId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(c_0.status === 0, 'Campaign is not active');
    const amount_0 = this._donationAmount_0(context, partialProofData);
    __compactRuntime.assert(amount_0 > 0n,
                            'Donation amount must be greater than zero');
    __compactRuntime.assert(this._equal_0(newTotal_0, c_0.raised + amount_0),
                            'Total mismatch');
    __compactRuntime.assert(newTotal_0 <= c_0.target,
                            'Donation exceeds remaining funding target');
    const coinNonce_0 = this._persistentHash_1([new Uint8Array([99, 114, 111, 119, 100, 102, 117, 110, 100, 105, 110, 103, 58, 100, 111, 110, 97, 116, 105, 111, 110, 58, 99, 111, 105, 110, 58, 0, 0, 0, 0, 0]),
                                                __compactRuntime.convertFieldToBytes(32,
                                                                                     campaignId_0,
                                                                                     'private-crowdfunding.compact line 138 char 5'),
                                                __compactRuntime.convertFieldToBytes(32,
                                                                                     c_0.sequence,
                                                                                     'private-crowdfunding.compact line 139 char 5'),
                                                this._localSecretKey_0(context,
                                                                       partialProofData)]);
    this._createZswapOutput_0(context,
                              partialProofData,
                              { nonce: coinNonce_0,
                                color: this._nativeToken_0(),
                                value: amount_0 },
                              this._left_0({ bytes: c_0.recipient }));
    const receipt_0 = this._persistentHash_2([new Uint8Array([99, 114, 111, 119, 100, 102, 117, 110, 100, 105, 110, 103, 58, 114, 101, 99, 101, 105, 112, 116, 58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
                                              __compactRuntime.convertFieldToBytes(32,
                                                                                   campaignId_0,
                                                                                   'private-crowdfunding.compact line 154 char 5'),
                                              __compactRuntime.convertFieldToBytes(32,
                                                                                   c_0.sequence,
                                                                                   'private-crowdfunding.compact line 155 char 5'),
                                              __compactRuntime.convertFieldToBytes(32,
                                                                                   amount_0,
                                                                                   'private-crowdfunding.compact line 156 char 5'),
                                              this._localSecretKey_0(context,
                                                                     partialProofData)]);
    const tmp_0 = { status: c_0.status,
                    owner: c_0.owner,
                    recipient: c_0.recipient,
                    title: c_0.title,
                    description: c_0.description,
                    target: c_0.target,
                    raised: newTotal_0,
                    donationsCount:
                      ((t1) => {
                        if (t1 > 340282366920938463463374607431768211455n) {
                          throw new __compactRuntime.CompactError('private-crowdfunding.compact line 167 char 21: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                        }
                        return t1;
                      })(c_0.donationsCount + 1n),
                    sequence:
                      ((t1) => {
                        if (t1 > 340282366920938463463374607431768211455n) {
                          throw new __compactRuntime.CompactError('private-crowdfunding.compact line 168 char 15: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                        }
                        return t1;
                      })(c_0.sequence + 1n) };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(0n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(campaignId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return receipt_0;
  }
  _closeCampaign_0(context, partialProofData, campaignId_0) {
    const campaignCount_0 = _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_17.toValue(0n),
                                                                                                                  alignment: _descriptor_17.alignment() } }] } },
                                                                                       'size',
                                                                                       { popeq: { cached: true,
                                                                                                  result: undefined } }]).value);
    __compactRuntime.assert(campaignCount_0 > campaignId_0,
                            'Campaign does not exist');
    const c_0 = _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                          partialProofData,
                                                                          [
                                                                           { dup: { n: 0 } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_17.toValue(0n),
                                                                                                      alignment: _descriptor_17.alignment() } }] } },
                                                                           { idx: { cached: false,
                                                                                    pushPath: false,
                                                                                    path: [
                                                                                           { tag: 'value',
                                                                                             value: { value: _descriptor_0.toValue(campaignId_0),
                                                                                                      alignment: _descriptor_0.alignment() } }] } },
                                                                           { popeq: { cached: false,
                                                                                      result: undefined } }]).value);
    __compactRuntime.assert(c_0.status === 0, 'Campaign is not active');
    __compactRuntime.assert(this._equal_1(c_0.owner,
                                          this._publicKey_0(this._localSecretKey_0(context,
                                                                                   partialProofData),
                                                            new Uint8Array([111, 119, 110, 101, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))),
                            'Only the campaign owner can close the campaign');
    const finalRaised_0 = c_0.raised;
    const tmp_0 = { status: 1,
                    owner: c_0.owner,
                    recipient: c_0.recipient,
                    title: c_0.title,
                    description: c_0.description,
                    target: c_0.target,
                    raised: c_0.raised,
                    donationsCount: c_0.donationsCount,
                    sequence: c_0.sequence };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { idx: { cached: false,
                                                pushPath: true,
                                                path: [
                                                       { tag: 'value',
                                                         value: { value: _descriptor_17.toValue(0n),
                                                                  alignment: _descriptor_17.alignment() } }] } },
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(campaignId_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_6.toValue(tmp_0),
                                                                                              alignment: _descriptor_6.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } },
                                       { ins: { cached: true, n: 1 } }]);
    return finalRaised_0;
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (!x0.every((x, i) => y0[i] === x)) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    campaigns: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(0n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                                                                 alignment: _descriptor_7.alignment() }).encode() } },
                                                                          'eq',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_7.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(0n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          'size',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('member',
                                     'argument 1',
                                     'private-crowdfunding.compact line 70 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     key_0)
        }
        return _descriptor_3.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(0n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { push: { storage: false,
                                                                                    value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                                                 alignment: _descriptor_0.alignment() }).encode() } },
                                                                          'member',
                                                                          { popeq: { cached: true,
                                                                                     result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('lookup',
                                     'argument 1',
                                     'private-crowdfunding.compact line 70 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     key_0)
        }
        return _descriptor_6.fromValue(__compactRuntime.queryLedgerState(context,
                                                                         partialProofData,
                                                                         [
                                                                          { dup: { n: 0 } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_17.toValue(0n),
                                                                                                     alignment: _descriptor_17.alignment() } }] } },
                                                                          { idx: { cached: false,
                                                                                   pushPath: false,
                                                                                   path: [
                                                                                          { tag: 'value',
                                                                                            value: { value: _descriptor_0.toValue(key_0),
                                                                                                     alignment: _descriptor_0.alignment() } }] } },
                                                                          { popeq: { cached: false,
                                                                                     result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[0];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_6.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  localSecretKey: (...args) => undefined, donationAmount: (...args) => undefined
});
export const pureCircuits = {
  publicKey: (...args_0) => {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`publicKey: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const sk_0 = args_0[0];
    const salt_0 = args_0[1];
    if (!(sk_0.buffer instanceof ArrayBuffer && sk_0.BYTES_PER_ELEMENT === 1 && sk_0.length === 32)) {
      __compactRuntime.typeError('publicKey',
                                 'argument 1',
                                 'private-crowdfunding.compact line 76 char 1',
                                 'Bytes<32>',
                                 sk_0)
    }
    if (!(salt_0.buffer instanceof ArrayBuffer && salt_0.BYTES_PER_ELEMENT === 1 && salt_0.length === 32)) {
      __compactRuntime.typeError('publicKey',
                                 'argument 2',
                                 'private-crowdfunding.compact line 76 char 1',
                                 'Bytes<32>',
                                 salt_0)
    }
    return _dummyContract._publicKey_0(sk_0, salt_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
