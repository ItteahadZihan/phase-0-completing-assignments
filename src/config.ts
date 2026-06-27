import { clusterApiUrl, PublicKey } from "@solana/web3.js";

export type ClusterName = "devnet" | "testnet" | "mainnet-beta";

export interface LaunchpadConfig {
  cluster: ClusterName;
  rpcUrl: string;
  platformFeeLamports: bigint;
  feeVault: PublicKey;
  defaultDecimals: number;
  maxInitialSupply: bigint;
  minNameLength: number;
  maxNameLength: number;
  maxSymbolLength: number;
}

const DEFAULT_FEE_VAULT = "11111111111111111111111111111111";
const LAMPORTS_PER_SOL_BIGINT = 1_000_000_000n;

function readBigIntEnv(name: string, fallback: bigint): bigint {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error(`${name} must be an integer lamport amount`);
  }
}

function readCluster(): ClusterName {
  const value = process.env.SOLANA_CLUSTER ?? "devnet";
  if (value === "devnet" || value === "testnet" || value === "mainnet-beta") {
    return value;
  }

  throw new Error("SOLANA_CLUSTER must be devnet, testnet, or mainnet-beta");
}

export function loadConfig(): LaunchpadConfig {
  const cluster = readCluster();
  const feeVault = new PublicKey(process.env.FEE_VAULT_PUBLIC_KEY ?? DEFAULT_FEE_VAULT);

  return {
    cluster,
    rpcUrl: process.env.SOLANA_RPC_URL ?? clusterApiUrl(cluster),
    platformFeeLamports: readBigIntEnv("PLATFORM_FEE_LAMPORTS", LAMPORTS_PER_SOL_BIGINT / 100n),
    feeVault,
    defaultDecimals: Number(process.env.DEFAULT_TOKEN_DECIMALS ?? "6"),
    maxInitialSupply: readBigIntEnv("MAX_INITIAL_SUPPLY", 1_000_000_000_000_000n),
    minNameLength: 3,
    maxNameLength: 32,
    maxSymbolLength: 10
  };
}
