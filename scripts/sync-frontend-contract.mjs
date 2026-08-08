#!/usr/bin/env node
// Copies the freshly compiled contract from contracts/managed into the frontend so
// Vite can (a) bundle the generated contract JS/TS and (b) serve the ZK artifacts
// (keys/ and zkir/) that the FetchZkConfigProvider downloads at runtime.
//
// Run automatically by `npm run compile`, and again by `npm run frontend:dev` /
// `npm run frontend:build` (predev/prebuild) so the frontend is never stale.
//
// Generated files are gitignored — never commit them (see .gitignore).

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const managed = path.join(root, "contracts", "managed", "private-crowdfunding");
const feContractSrc = path.join(root, "frontend", "src", "contracts");
const feArtifacts = path.join(root, "frontend", "public", "contracts");

const srcJs = path.join(managed, "contract", "index.js");
const srcDts = path.join(managed, "contract", "index.d.ts");

if (!fs.existsSync(srcJs)) {
  console.error(
    `Managed contract not found at ${managed}.\n` +
      "Run `npm run compile` from the repo root first.",
  );
  process.exit(1);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    copyFile(path.join(src, entry), path.join(dest, entry));
  }
}

copyFile(srcJs, path.join(feContractSrc, "index.js"));
copyFile(srcDts, path.join(feContractSrc, "index.d.ts"));
copyDir(path.join(managed, "keys"), path.join(feArtifacts, "keys"));
copyDir(path.join(managed, "zkir"), path.join(feArtifacts, "zkir"));

console.log(
  "Synced contract artifacts → frontend/src/contracts + frontend/public/contracts",
);
