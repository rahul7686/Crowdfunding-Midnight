/**
 * TransactionReceipt — professional receipt card shown after a successful
 * transaction. A "View Transaction" link is only rendered when an explorer URL
 * is configured via VITE_EXPLORER_URL; we never invent one.
 */

import { toHex } from "@midnight-ntwrk/midnight-js-utils";

import { CheckIcon, ExternalLinkIcon, LockIcon } from "./icons";

export type TxReceiptData = {
  kind: "launch" | "donate" | "close";
  txHash: string;
  blockHeight: number;
  /** Disclosed campaign id, shown for launch/close. */
  campaignId?: bigint;
  /** Blinded donation receipt returned by the donate circuit (never stored). */
  receipt?: Uint8Array;
};

const EXPLORER_URL = (import.meta.env.VITE_EXPLORER_URL as string | undefined)?.trim() ?? "";

const CONTENT: Record<TxReceiptData["kind"], { title: string; sub: string }> = {
  launch: {
    title: "Campaign launched successfully",
    sub: "Your campaign is live and accepting private donations.",
  },
  donate: {
    title: "Private donation submitted",
    sub: "Your identity and exact amount stay private — verified by a zero-knowledge proof.",
  },
  close: {
    title: "Campaign closed",
    sub: "The final aggregate is on-chain; individual donations remain private forever.",
  },
};

export function TransactionReceipt({ receipt }: { receipt: TxReceiptData }) {
  const { kind, txHash, blockHeight } = receipt;
  const content = CONTENT[kind];
  const explorerLink = EXPLORER_URL
    ? `${EXPLORER_URL.replace(/\/+$/, "")}/${encodeURIComponent(txHash)}`
    : null;

  return (
    <div className="tx-receipt">
      <div className="tx-receipt-head">
        <span className="tx-receipt-icon" aria-hidden="true">
          <CheckIcon />
        </span>
        <div className="tx-receipt-title-block">
          <p className="tx-receipt-title">{content.title}</p>
          <p className="tx-receipt-sub">{content.sub}</p>
        </div>
      </div>

      <dl className="tx-receipt-rows">
        {receipt.campaignId !== undefined && (
          <div className="tx-receipt-row">
            <dt>Campaign</dt>
            <dd>#{receipt.campaignId.toString()}</dd>
          </div>
        )}
        <div className="tx-receipt-row">
          <dt>Transaction</dt>
          <dd>
            <code>{txHash}</code>
          </dd>
        </div>
        <div className="tx-receipt-row">
          <dt>Block number</dt>
          <dd>{blockHeight}</dd>
        </div>
        {kind === "donate" && (
          <div className="tx-receipt-row">
            <dt>
              <LockIcon /> Privacy status
            </dt>
            <dd>Private — input proved without being revealed</dd>
          </div>
        )}
        {kind === "donate" && receipt.receipt && (
          <div className="tx-receipt-row">
            <dt>
              <LockIcon /> Donation receipt
            </dt>
            <dd>
              <code>{toHex(receipt.receipt)}</code>
            </dd>
          </div>
        )}
        <div className="tx-receipt-row">
          <dt>Status</dt>
          <dd className="tx-receipt-status">On-chain · block {blockHeight}</dd>
        </div>
      </dl>

      {explorerLink && (
        <div className="tx-receipt-footer">
          <a
            className="btn btn-secondary btn-sm"
            href={explorerLink}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLinkIcon />
            View Transaction
          </a>
        </div>
      )}
    </div>
  );
}
