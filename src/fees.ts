import type { LaunchpadConfig } from "./config.js";

export interface CreationFeeQuote {
  platformFeeLamports: string;
  estimatedMintRentLamports: string;
  estimatedAtaRentLamports: string;
  estimatedNetworkFeeLamports: string;
  estimatedTotalLamports: string;
}

export interface QuoteInput {
  mintRentLamports: bigint;
  associatedTokenAccountRentLamports: bigint;
}

const DEFAULT_SIGNATURE_COUNT = 2n;
const LAMPORTS_PER_SIGNATURE = 5_000n;

export function quoteCreationFee(config: LaunchpadConfig, input: QuoteInput): CreationFeeQuote {
  const estimatedNetworkFeeLamports = DEFAULT_SIGNATURE_COUNT * LAMPORTS_PER_SIGNATURE;
  const estimatedTotalLamports =
    config.platformFeeLamports +
    input.mintRentLamports +
    input.associatedTokenAccountRentLamports +
    estimatedNetworkFeeLamports;

  return {
    platformFeeLamports: config.platformFeeLamports.toString(),
    estimatedMintRentLamports: input.mintRentLamports.toString(),
    estimatedAtaRentLamports: input.associatedTokenAccountRentLamports.toString(),
    estimatedNetworkFeeLamports: estimatedNetworkFeeLamports.toString(),
    estimatedTotalLamports: estimatedTotalLamports.toString()
  };
}
