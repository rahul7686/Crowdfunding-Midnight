# Project Proposal: Crowdfunding-Midnight

**Platform Name:** Crowdfunding-Midnight  
**Network:** Midnight Network (Preprod)  
**Contract Address:** `6fbcccaf440785c5f10b278cb0051cfd3c59a4f3af8d6e190ef96a68a5070240`  
**Live Demo:** [https://crowdfunding-midnight.vercel.app/](https://crowdfunding-midnight.vercel.app/)  
**Repository:** [https://github.com/rahul7686/Crowdfunding-Midnight](https://github.com/rahul7686/Crowdfunding-Midnight)  
**Author:** rahul7686  

---

## 1. Executive Summary

**Crowdfunding-Midnight** is a privacy-first, zero-knowledge crowdfunding platform built on the **Midnight Network**. It enables individuals and organizations to launch fundraising campaigns and receive contributions from supporters while preserving complete donor anonymity and contribution confidentiality.

By leveraging Midnight's **Compact** smart contract language and zero-knowledge circuit execution, Crowdfunding-Midnight guarantees that donor identities, donation amounts, and individual contribution histories are never published on the public ledger. At the same time, the platform provides public verification for aggregate campaign funding targets and progress.

---

## 2. Problem Statement

Traditional Web2 crowdfunding platforms (e.g., GoFundMe, Kickstarter) suffer from severe privacy vulnerabilities and centralization risks:
- **Forced Identity Disclosure:** Donors are forced to reveal personal identities, credit card details, and funding amounts.
- **Financial Surveillance:** Public blockchains resolve centralization issues but expose all transaction amounts and wallet addresses on public ledgers, allowing third parties to track and profile donors across campaigns.
- **Targeted Harassment:** Donors supporting sensitive social, political, or medical causes risk harassment, financial blacklisting, or identity exposure.

---

## 3. Proposed Solution

**Crowdfunding-Midnight** introduces a zero-knowledge protocol architecture that balances public accountability with total donor privacy:

1. **Private Witness State:**  
   Donation amounts and secret keys exist solely inside encrypted private witness state on the user's browser. They are never transmitted over the network or recorded on-chain.

2. **Zero-Knowledge Proof Generation:**  
   Donors generate a zero-knowledge proof proving that:
   - The donation amount is positive.
   - The total campaign raised amount increases by exactly the donated value without exceeding the funding target.
   - The donor holds a valid Zswap coin of the specified value.

3. **Blinded Hiding + Binding Receipts:**  
   Every donation generates an un-linkable, blinded receipt hash (`receipt = hash(campaignId, sequence, amount, donorKey)`), enabling donors to privately prove their contribution without revealing their identity or linking multiple contributions.

4. **Multi-Campaign Architecture:**  
   A single deployed Compact smart contract efficiently manages multiple independent campaigns identified by unique 32-byte campaign IDs, minimizing on-chain footprint and deployment overhead.

---

## 4. System Architecture & Technical Specifications

```
                                  +---------------------------------------+
                                  |            1AM Wallet                 |
                                  |   (Keys, Proving & Fee Balancing)     |
                                  +-------------------+-------------------+
                                                      |
                                                      v
+------------------------+        +-------------------+-------------------+        +------------------------+
|   React 19 + Vite DApp | <----> |      Midnight JS Contracts SDK    | <----> |  Midnight Preprod Node |
|      (Frontend)        |        |   (Compact Runtime & Witnesses)   |        |   & Public Indexer     |
+------------------------+        +---------------------------------------+        +------------------------+
```

### Key Technical Components:
- **Smart Contract Language:** Compact (`contracts/private-crowdfunding.compact`)
- **Frontend Framework:** React 19 + TypeScript + Vite (`frontend/`)
- **Wallet Extension:** Midnight 1AM Wallet Extension (`window.midnight['1am']`)
- **State Management:** Encrypted IndexedDB private state provider (`@midnight-ntwrk/midnight-js-level-private-state-provider`)
- **Proof Backend:** In-browser zero-knowledge prover via 1AM `getProvingProvider`

---

## 5. Core Platform Features

- 🚀 **1AM Browser Deployment (`/deploy`):**  
  Deploy the Compact smart contract directly through the 1AM browser extension without needing server-side private keys or funded deployer wallets.

- 🔒 **Zero-Knowledge Private Donations:**  
  Donate native tNIGHT tokens privately. Amounts and donor addresses remain strictly confidential.

- 📋 **Campaign Management:**  
  Launch campaigns with customizable funding targets (in whole tNIGHT, 6 decimal places).

- 🔑 **Cryptographic Owner Verification:**  
  Campaign creators authenticate ownership and campaign closure using derived cryptographic owner pseudonyms without disclosing their master private keys.

---

## 6. Project Milestones & Roadmap

- [x] **Milestone 1: Core Smart Contract & Circuit Architecture**  
  Written in Compact, compiled, and thoroughly tested with a 21-test Vitest suite covering multi-campaign state isolation and private state transitions.

- [x] **Milestone 2: 1AM Preprod Integration & Browser Deploy**  
  Full integration with the Midnight 1AM wallet extension on Preprod, featuring browser-based deployment on `/deploy`.

- [x] **Milestone 3: UI/UX & Web3 Design System**  
  Modern dark-mode glassmorphism interface built with Outfit & Inter typography, responsive navigation, and explorer verification.

- [ ] **Milestone 4: Multi-Asset & Refund Circuits**  
  Future release adding support for custom token donations and automatic zero-knowledge refund circuits for unfulfilled funding targets.

---

## 7. Verification & Deployment Information

- **Contract Address:** `6fbcccaf440785c5f10b278cb0051cfd3c59a4f3af8d6e190ef96a68a5070240`
- **Network:** Midnight Preprod
- **Explorer Verification:** [View Contract on Midnight Explorer](https://explorer.midnight.network/contracts/6fbcccaf440785c5f10b278cb0051cfd3c59a4f3af8d6e190ef96a68a5070240)
- **Unit Test Suite:** 21 / 21 tests passing cleanly (`npm test`).
