// Orchestrator for `npm run setup`: brings up the local services this network
// needs, compiles the contract, then deploys. Pass --network preview|preprod
// to target a public network instead of the local devnet.
import { spawnSync } from "node:child_process";
import { resolveNetwork, setActiveNetwork, parseNetworkFlag } from "./network";

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.status !== 0) {
    process.stderr.write(`\nCommand failed: ${cmd} ${args.join(" ")}\n`);
    process.exit(r.status ?? 1);
  }
}

async function main(): Promise<void> {
  const argv = process.argv;
  const flag = parseNetworkFlag(argv);
  if (flag) setActiveNetwork(flag);
  const { network, config } = resolveNetwork({ argv });

  process.stdout.write(`\n→ Setting up Crowdfunding-Midnight on network: ${network}\n\n`);

  // 1. Bring up only the services this network needs.
  run("docker", ["compose", "up", "-d", "--wait", ...config.composeServices]);

  // 2. Compile the contract (network-agnostic).
  run("npm", ["run", "compile"]);

  process.stdout.write("\n✔ Setup complete! Compile & ZK assets synced.\n");
  process.stdout.write("→ Open the browser app at http://localhost:5173/deploy to deploy your contract via 1AM extension.\n\n");
}

main().catch((e) => {
  process.stderr.write(`\nSetup failed: ${(e as Error).message}\n`);
  process.exit(1);
});
