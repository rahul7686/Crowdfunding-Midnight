import { CrowdfundingSimulator, pad } from "./private-crowdfunding-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";
import { CampaignStatus } from "../contracts/managed/private-crowdfunding/contract/index.js";
import { createCrowdfundingPrivateState, deriveCampaignSecretKey } from "../src/contract/witnesses.js";

setNetworkId("undeployed");

const NIGHT = 1_000_000n; // 1 NIGHT = 10^6 STAR (6 decimal places)
const TARGET = 1000n * NIGHT;
// Zswap coin values are bounded to a non-negative 64-bit integer
// (~1.84e13 tNIGHT at 6 decimals), so single-donation coins are effectively
// uncapped for realistic campaign sizes. Ledger aggregates (raised/target)
// remain Uint<128>.
const MAX_DONATION = 10n * NIGHT;
// Fake 32-byte Zswap coin public keys used as donation recipients.
const RECIPIENT = pad(32, "test-recipient");
const RECIPIENT_ALPHA = pad(32, "recipient-alpha");
const RECIPIENT_BETA = pad(32, "recipient-beta");
const NATIVE_COLOR = new Uint8Array(32);

describe("Private Crowdfunding smart contract", () => {
  it("derives a stable 32-byte campaign secret key from the wallet seed", () => {
    const seed = "0a".repeat(32); // 32 bytes of hex seed
    const key1 = deriveCampaignSecretKey(seed);
    const key2 = deriveCampaignSecretKey(seed);
    expect(key1).toHaveLength(32);
    // Deterministic: deploy + cli (same seed) agree on the owner key.
    expect(key2).toEqual(key1);
    // Different seeds produce different keys.
    expect(deriveCampaignSecretKey("bb".repeat(32))).not.toEqual(key1);
    // The derived key is not trivially the seed itself.
    expect(Buffer.from(key1).toString("hex")).not.toEqual(seed);
  });

  it("generates an empty (no campaigns) initial ledger deterministically", () => {
    const key = randomBytes(32);
    const sim0 = new CrowdfundingSimulator(key);
    const sim1 = new CrowdfundingSimulator(key);
    // The ledger object itself embeds live map-access methods (isEmpty/size/…),
    // so compare the observable campaign data instead of object identity.
    expect(sim0.listCampaigns()).toEqual(sim1.listCampaigns());

    const l = sim0.getLedger();
    expect(l.campaigns.isEmpty()).toEqual(true);
    expect(sim0.listCampaigns()).toEqual([]);
  });

  it("launches a campaign, returns its id, and discloses the owner pseudonym", () => {
    const key = randomBytes(32);
    const sim = new CrowdfundingSimulator(key);
    const id = sim.launchCampaign("Community Solar", "Rooftop solar for 40 households", TARGET, RECIPIENT);

    // The campaign id is the disclosed circuit result.
    expect(id).toEqual(0n);

    const c = sim.getCampaign(id);
    expect(c.status).toEqual(CampaignStatus.ACTIVE);
    expect(c.title.value).toEqual("Community Solar");
    expect(c.description.value).toEqual("Rooftop solar for 40 households");
    expect(c.target).toEqual(TARGET);
    expect(c.raised).toEqual(0n);
    expect(c.donationsCount).toEqual(0n);
    expect(c.sequence).toEqual(0n);

    // The owner field is a one-way hash of the secret key — it authorizes
    // closing the campaign but never reveals the key itself.
    const pseudonym = sim.ownerPseudonym(key);
    expect(c.owner).toEqual(pseudonym);
    expect(Buffer.from(c.owner).toString("hex")).not.toEqual(
      Buffer.from(key).toString("hex"),
    );

    // Donations are paid to the launch wallet's coin public key.
    expect(c.recipient).toEqual(RECIPIENT);
  });

  it("lets anyone donate to a campaign: aggregate + count update, private state untouched", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const before = sim.getPrivateState();
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);

    sim.donate(id, 10n * NIGHT);

    const c = sim.getCampaign(id);
    expect(c.raised).toEqual(10n * NIGHT);
    expect(c.donationsCount).toEqual(1n);
    expect(c.sequence).toEqual(1n);
    // The witness never mutates private state; only the (dropped) pending amount changed.
    expect(sim.getPrivateState().secretKey).toEqual(before.secretKey);
  });

  it("supports MULTIPLE SIMULTANEOUS campaigns with isolated ledgers", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id1 = sim.launchCampaign("Alpha", "Solar project", 500n * NIGHT, RECIPIENT_ALPHA);
    const id2 = sim.launchCampaign("Beta", "Water well", 300n * NIGHT, RECIPIENT_BETA);
    const id3 = sim.launchCampaign("Gamma", "Library fund", 1000n * NIGHT, RECIPIENT);

    expect([id1, id2, id3]).toEqual([0n, 1n, 2n]);
    // All three coexist in one ledger.
    expect(sim.listCampaigns().map(([id]) => id)).toEqual([0n, 1n, 2n]);

    // Donations land in the selected campaign only.
    sim.donate(id2, 10n * NIGHT);
    sim.donate(id2, 5n * NIGHT);
    sim.donate(id1, 3n * NIGHT);

    const [a, b, g] = [
      sim.getCampaign(id1),
      sim.getCampaign(id2),
      sim.getCampaign(id3),
    ];
    expect(a.raised).toEqual(3n * NIGHT);
    expect(b.raised).toEqual(15n * NIGHT);
    expect(g.raised).toEqual(0n);
    expect(a.donationsCount).toEqual(1n);
    expect(b.donationsCount).toEqual(2n);
    expect(g.donationsCount).toEqual(0n);

    // Each campaign discloses its own owner.
    expect(a.owner).toEqual(sim.ownerPseudonym(sim.getPrivateState().secretKey));
  });

  it("PRIVACY: the per-donation amount is never exposed as a ledger field or output", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    const amount = 7n * NIGHT;

    const receipt = sim.donate(id, amount);
    const c = sim.getCampaign(id);

    // 1. Across the campaign's public bigint fields, the amount appears ONLY as
    //    the aggregate `raised` — never as count, sequence, or target.
    expect(c.raised).toEqual(amount); // aggregate only
    expect(c.donationsCount).not.toEqual(amount);
    expect(c.sequence).not.toEqual(amount);
    expect(c.target).not.toEqual(amount);

    // 2. The disclosed receipt is a 32-byte blinding hash, not a plaintext
    //    encoding of the amount and not the donor's secret key.
    expect(receipt).toHaveLength(32);
    expect(receipt).not.toEqual(pad(32, amount.toString()));
    expect(receipt).not.toEqual(sim.getPrivateState().secretKey);

    // 3. No field of the ledger carries the amount (receipts are not stored —
    //    only returned to the donor as their proof of donation).
    expect(sim.getLedger() as unknown as Record<string, unknown>).not.toHaveProperty("receipt");
  });

  it("PRIVACY: receipts are unlinkable across donations by the same donor", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    const secretKey = sim.getPrivateState().secretKey;

    const receipt1 = sim.donate(id, 5n * NIGHT);
    const receipt2 = sim.donate(id, 7n * NIGHT);

    // Different sequence salt per donation ⇒ same donor cannot be linked.
    expect(receipt1).not.toEqual(receipt2);
    // Neither receipt leaks the secret key nor a plaintext amount.
    expect(receipt1).not.toEqual(secretKey);
    expect(receipt2).not.toEqual(secretKey);
    expect(receipt1).not.toEqual(pad(32, (5n * NIGHT).toString()));
    expect(receipt2).not.toEqual(pad(32, (7n * NIGHT).toString()));
  });

  it("PRIVACY: the private-state factory carries a secret key that never surfaces publicly", () => {
    const key = randomBytes(32);
    const ps = createCrowdfundingPrivateState(key);
    expect(ps.secretKey).toEqual(key);
    expect(ps.pendingDonation).toEqual(0n);

    // Simulate a full lifecycle; the secret key must never appear in the ledger.
    const sim = new CrowdfundingSimulator(key);
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    sim.donate(id, 7n * NIGHT);
    sim.closeCampaign(id);
    const serialized = JSON.stringify(
      Object.fromEntries(
        Object.entries(sim.getLedger() as unknown as Record<string, unknown>).map(([k, v]) => [
          k,
          typeof v === "bigint" ? v.toString() : v instanceof Uint8Array ? Buffer.from(v).toString("hex") : v,
        ]),
      ),
    );
    expect(serialized).not.toContain(Buffer.from(key).toString("hex"));
  });

  it("rejects a zero or negative donation (circuit constraint)", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    expect(() => sim.donate(id, 0n)).toThrow(
      "failed assert: Donation amount must be greater than zero",
    );
    // Negative amounts are rejected by the type system before the circuit runs.
    expect(() => sim.donate(id, -5n)).toThrow("type error: donate argument");
  });

  it("rejects a donation that would overfund the campaign (circuit constraint)", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", 100n, RECIPIENT);
    sim.donate(id, 60n);
    expect(() => sim.donate(id, 50n)).toThrow(
      "failed assert: Donation exceeds remaining funding target",
    );
  });

  it("rejects a donation to a campaign that has not been launched", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    expect(() => sim.donate(0n, 10n)).toThrow(
      "failed assert: Campaign does not exist",
    );
  });

  it("lets only the owner of a campaign close it and discloses the final aggregate", () => {
    const ownerKey = randomBytes(32);
    const sim = new CrowdfundingSimulator(ownerKey);
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    sim.donate(id, 8n * NIGHT);

    // A different user cannot close it.
    sim.switchUser(randomBytes(32));
    expect(() => sim.closeCampaign(id)).toThrow(
      "failed assert: Only the campaign owner can close the campaign",
    );

    // The owner can, and the final aggregate is disclosed as the circuit result.
    sim.switchUser(ownerKey);
    const finalRaised = sim.closeCampaign(id);
    expect(finalRaised).toEqual(8n * NIGHT);
    expect(sim.getCampaign(id).status).toEqual(CampaignStatus.CLOSED);
  });

  it("rejects donations after the campaign is closed", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    sim.donate(id, 10n);
    sim.closeCampaign(id);
    expect(() => sim.donate(id, 5n)).toThrow("failed assert: Campaign is not active");
  });

  it("aggregates donations from many distinct donors without leaking amounts", () => {
    const ownerKey = randomBytes(32);
    const sim = new CrowdfundingSimulator(ownerKey);
    const id = sim.launchCampaign("Community Solar", "Rooftop solar for 40 households", TARGET, RECIPIENT);

    const amounts = [1n, 5n, 12n, 3n, 17n, 7n, 9n, 2n, 11n, 4n].map(
      (n) => n * NIGHT,
    );
    const donors = Array.from({ length: amounts.length }, () => randomBytes(32));

    amounts.forEach((amount, i) => {
      sim.switchUser(donors[i]!);
      sim.donate(id, amount);
    });

    const c = sim.getCampaign(id);
    const total = amounts.reduce((a, b) => a + b, 0n);
    expect(c.raised).toEqual(total);
    expect(c.donationsCount).toEqual(BigInt(amounts.length));
    expect(c.sequence).toEqual(BigInt(amounts.length));

    // No individual amount appears outside the aggregate — even in aggregate form
    // the ledger must not expose which donor gave what.
    for (const amount of amounts) {
      expect(c.donationsCount).not.toEqual(amount);
      expect(c.sequence).not.toEqual(amount);
      expect(c.target).not.toEqual(amount);
    }

    // The disclosed owner is the campaign launcher, never any donor.
    expect(c.owner).toEqual(sim.ownerPseudonym(ownerKey));
    for (const donor of donors) {
      expect(c.owner).not.toEqual(sim.ownerPseudonym(donor));
    }
  });

  it("keeps each campaign's owner fixed to its launching key across donor switches", () => {
    const ownerKey = randomBytes(32);
    const sim = new CrowdfundingSimulator(ownerKey);
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);

    // A dozen other users donate...
    for (let i = 0; i < 12; i++) {
      sim.switchUser(randomBytes(32));
      sim.donate(id, BigInt(i + 1) * NIGHT);
    }

    // ...yet the disclosed owner is still derived from the original key.
    expect(sim.getCampaign(id).owner).toEqual(sim.ownerPseudonym(ownerKey));

    // And only that key can close.
    sim.switchUser(randomBytes(32));
    expect(() => sim.closeCampaign(id)).toThrow(
      "failed assert: Only the campaign owner can close the campaign",
    );
    sim.switchUser(ownerKey);
    expect(sim.closeCampaign(id)).toEqual(78n * NIGHT); // 1+2+...+12
    expect(sim.getCampaign(id).status).toEqual(CampaignStatus.CLOSED);
  });

  it("leaves earlier campaigns intact when new ones launch after a close", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const first = sim.launchCampaign("First", "Round 1", TARGET, RECIPIENT);
    sim.donate(first, 10n * NIGHT);
    sim.closeCampaign(first);

    // A brand-new campaign is a SEPARATE ledger entry, not a reset of the old one.
    const second = sim.launchCampaign("Second", "Round 2", 2000n * NIGHT, RECIPIENT);
    expect(second).not.toEqual(first);
    const c2 = sim.getCampaign(second);
    expect(c2.status).toEqual(CampaignStatus.ACTIVE);
    expect(c2.title.value).toEqual("Second");
    expect(c2.description.value).toEqual("Round 2");
    expect(c2.target).toEqual(2000n * NIGHT);
    expect(c2.raised).toEqual(0n);
    expect(c2.donationsCount).toEqual(0n);

    // The closed campaign is untouched.
    const c1 = sim.getCampaign(first);
    expect(c1.status).toEqual(CampaignStatus.CLOSED);
    expect(c1.raised).toEqual(10n * NIGHT);
    expect(c1.donationsCount).toEqual(1n);
  });

  it("handles a long mixed lifecycle across many independent campaigns", () => {
    const ownerKey = randomBytes(32);
    const sim = new CrowdfundingSimulator(ownerKey);

    for (let round = 1; round <= 3; round++) {
      const id = sim.launchCampaign(`Round ${round}`, "Multi-round", 100_000n * NIGHT, RECIPIENT);
      expect(sim.getCampaign(id).raised).toEqual(0n);

      let raised = 0n;
      for (let d = 0; d < 5; d++) {
        const amount = BigInt(d + 1) * NIGHT;
        sim.switchUser(randomBytes(32));
        sim.donate(id, amount);
        raised += amount;
      }
      expect(sim.getCampaign(id).raised).toEqual(raised);
      sim.switchUser(ownerKey); // close is owner-only
      expect(sim.closeCampaign(id)).toEqual(raised);
    }

    // All three campaigns coexist, each closed with its own aggregate.
    const campaigns = sim.listCampaigns();
    expect(campaigns.map(([id]) => id)).toEqual([0n, 1n, 2n]);
    for (const [, c] of campaigns) {
      expect(c.status).toEqual(CampaignStatus.CLOSED);
      expect(c.raised).toBeGreaterThan(0n);
    }
  });

  it("mints a native NIGHT Zswap output of exactly the donated amount to the campaign recipient", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);

    sim.donate(id, 10n * NIGHT);
    let output = sim.getLastZswapOutput();
    expect(output.value).toEqual(10n * NIGHT);
    expect(output.color).toEqual(NATIVE_COLOR); // native NIGHT token
    expect(output.nonce).toHaveLength(32);
    expect(output.recipientBytes).toEqual(RECIPIENT);

    sim.donate(id, 7n * NIGHT);
    output = sim.getLastZswapOutput();
    expect(output.value).toEqual(7n * NIGHT);
    expect(output.color).toEqual(NATIVE_COLOR);
    expect(output.recipientBytes).toEqual(RECIPIENT);
  });

  it("pays each campaign to its own recipient, regardless of who donates", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id1 = sim.launchCampaign("Alpha", "A", TARGET, RECIPIENT_ALPHA);
    const id2 = sim.launchCampaign("Beta", "B", TARGET, RECIPIENT_BETA);

    // The coin always lands on the campaign's recipient, never on the donor.
    sim.switchUser(randomBytes(32));
    sim.donate(id1, 10n * NIGHT);
    expect(sim.getLastZswapOutput().recipientBytes).toEqual(RECIPIENT_ALPHA);
    expect(sim.getLastZswapOutput().value).toEqual(10n * NIGHT);

    sim.switchUser(randomBytes(32));
    sim.donate(id2, 8n * NIGHT);
    expect(sim.getLastZswapOutput().recipientBytes).toEqual(RECIPIENT_BETA);
    expect(sim.getLastZswapOutput().value).toEqual(8n * NIGHT);

    sim.switchUser(randomBytes(32));
    sim.donate(id1, 5n * NIGHT);
    expect(sim.getLastZswapOutput().recipientBytes).toEqual(RECIPIENT_ALPHA);
    expect(sim.getLastZswapOutput().value).toEqual(5n * NIGHT);

    // The ledger stores each campaign's own recipient.
    expect(sim.getCampaign(id1).recipient).toEqual(RECIPIENT_ALPHA);
    expect(sim.getCampaign(id2).recipient).toEqual(RECIPIENT_BETA);
  });

  it("produces a fresh coin nonce per donation, so coins can never be replayed", () => {
    const sim = new CrowdfundingSimulator(randomBytes(32));
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);

    sim.donate(id, 1n);
    const nonce1 = sim.getLastZswapOutput().nonce;
    sim.donate(id, 2n);
    const nonce2 = sim.getLastZswapOutput().nonce;

    expect(nonce1).toHaveLength(32);
    expect(nonce2).toHaveLength(32);
    expect(nonce1).not.toEqual(nonce2);
  });

  it("closeCampaign pays out nothing and keeps the recipient on the closed entry", () => {
    const ownerKey = randomBytes(32);
    const sim = new CrowdfundingSimulator(ownerKey);
    const id = sim.launchCampaign("A", "B", TARGET, RECIPIENT);
    sim.donate(id, 9n * NIGHT);
    const beforeClose = sim.getZswapOutputs().length;
    sim.closeCampaign(id);

    // Closing only flips the status — no new coin is minted.
    expect(sim.getZswapOutputs().length).toEqual(beforeClose);

    const c = sim.getCampaign(id);
    expect(c.status).toEqual(CampaignStatus.CLOSED);
    expect(c.raised).toEqual(9n * NIGHT);
    expect(c.recipient).toEqual(RECIPIENT);
  });
});
