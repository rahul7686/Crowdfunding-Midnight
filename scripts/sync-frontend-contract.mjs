#!/usr/bin/env node
// Copies the freshly compiled contract from contracts/managed into the frontend so
// Vite can (a) bundle the generated contract JS/TS and (b) serve the ZK artifacts
// (keys/ and zkir/) that the FetchZkConfigProvider downloads at runtime.
//
// Run automatically by `npm run compile`, and again by `npm run frontend:dev` /
// `npm run frontend:build` (predev/prebuild) so the frontend is never stale.
//
// When contracts/managed is absent (e.g. on Vercel, where the Compact toolchain
// is not installed), the script falls back to the frontend artifacts that are
// committed to Git instead of failing the build.

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
  // No freshly compiled contract (e.g. a Vercel build, which never has the
  // Compact toolchain). The frontend artifacts committed to Git are already in
  // place, so there is nothing to sync — just confirm they exist and continue.
  const feJs = path.join(feContractSrc, "index.js");
  const feKeys = path.join(feArtifacts, "keys");
  if (fs.existsSync(feJs) && fs.existsSync(feKeys)) {
    console.log(
      "Managed contract not found; using committed frontend artifacts " +
        "(frontend/src/contracts + frontend/public/contracts).",
    );
    process.exit(0);
  }
  console.error(
    `Managed contract not found at ${managed} and no committed frontend ` +
      "artifacts exist under frontend/src/contracts / frontend/public/contracts.\n" +
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
