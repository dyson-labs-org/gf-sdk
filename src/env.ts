import { config as loadEnvFile } from "dotenv";
import fs from "node:fs";

const KNOWN_NETWORKS = new Set(["testnet", "mainnet"]);

export type Network = "testnet" | "mainnet";

function envFilenames(network?: Network) {
  const files: string[] = [];

  if (network) {
    files.push(`.env.${network}.local`, `.env.${network}`);
  }

  files.push(`.env.local`, `.env`);

  return files;
}

export function loadNetworkEnv(input?: string) {
  const network = normalizeNetwork(input ?? process.env.NETWORK);
  const files = envFilenames(network);
  let loaded = false;

  for (const file of files) {
    if (fs.existsSync(file)) {
      loadEnvFile({ path: file });
      loaded = true;
    }
  }

  if (!loaded) {
    throw new Error(
      network
        ? `Could not find environment file for ${network}. Create .env.${network} or run npm run configure-env.`
        : "No environment files found. Create a .env file or run npm run configure-env."
    );
  }

  if (network) {
    process.env.NETWORK = network;
  }

  return network;
}

function normalizeNetwork(value?: string) {
  if (!value) {
    return undefined;
  }

  const lower = value.toLowerCase();

  if (KNOWN_NETWORKS.has(lower)) {
    return lower as Network;
  }

  return undefined;
}
