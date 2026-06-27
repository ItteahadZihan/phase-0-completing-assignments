import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import type { LaunchpadConfig } from "./config.js";

const publicKeySchema = z.string().refine(
  (value) => {
    try {
      new PublicKey(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: "must be a valid Solana public key" }
);

export const launchRequestSchema = z.object({
  name: z.string().trim(),
  symbol: z.string().trim().toUpperCase(),
  decimals: z.number().int().min(0).max(9).optional(),
  initialSupply: z.string().regex(/^\d+$/, "must be a non-negative integer token amount"),
  creatorPublicKey: publicKeySchema,
  revokeMintAuthority: z.boolean().default(false),
  revokeFreezeAuthority: z.boolean().default(true)
});

export type LaunchRequestInput = z.input<typeof launchRequestSchema>;
export type LaunchRequest = Omit<z.output<typeof launchRequestSchema>, "decimals"> & {
  decimals: number;
};

export function parseLaunchRequest(input: unknown, config: LaunchpadConfig): LaunchRequest {
  const parsed = launchRequestSchema.parse(input);

  if (parsed.name.length < config.minNameLength || parsed.name.length > config.maxNameLength) {
    throw new Error(`name must be ${config.minNameLength}-${config.maxNameLength} characters`);
  }

  if (!parsed.symbol || parsed.symbol.length > config.maxSymbolLength) {
    throw new Error(`symbol must be 1-${config.maxSymbolLength} characters`);
  }

  const initialSupply = BigInt(parsed.initialSupply);
  if (initialSupply < 1n) {
    throw new Error("initialSupply must be greater than zero");
  }

  if (initialSupply > config.maxInitialSupply) {
    throw new Error(`initialSupply exceeds max of ${config.maxInitialSupply.toString()}`);
  }

  return {
    ...parsed,
    decimals: parsed.decimals ?? config.defaultDecimals
  };
}
