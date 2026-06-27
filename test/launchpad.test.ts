import { describe, expect, it, vi } from "vitest";
import { Keypair, PublicKey, SystemProgram, Transaction, type Connection } from "@solana/web3.js";
import { MINT_SIZE } from "@solana/spl-token";
import type { LaunchpadConfig } from "../src/config.js";
import { quoteCreationFee } from "../src/fees.js";
import { prepareLaunchTransaction, scaleTokenAmount } from "../src/solana/launchTransaction.js";
import { parseLaunchRequest } from "../src/validation.js";

function testConfig(overrides: Partial<LaunchpadConfig> = {}): LaunchpadConfig {
  return {
    cluster: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    platformFeeLamports: 10_000_000n,
    feeVault: Keypair.generate().publicKey,
    defaultDecimals: 6,
    maxInitialSupply: 1_000_000n,
    minNameLength: 3,
    maxNameLength: 32,
    maxSymbolLength: 10,
    ...overrides
  };
}

function fakeConnection(): Connection {
  return {
    getMinimumBalanceForRentExemption: vi.fn(async (space: number) => {
      if (space === MINT_SIZE) {
        return 1_461_600;
      }

      return 2_039_280;
    }),
    getLatestBlockhash: vi.fn(async () => ({
      blockhash: "11111111111111111111111111111111",
      lastValidBlockHeight: 1
    }))
  } as unknown as Connection;
}

describe("quoteCreationFee", () => {
  it("includes platform fee, rent, and estimated signatures", () => {
    const quote = quoteCreationFee(testConfig(), {
      mintRentLamports: 1_000n,
      associatedTokenAccountRentLamports: 2_000n
    });

    expect(quote.platformFeeLamports).toBe("10000000");
    expect(quote.estimatedNetworkFeeLamports).toBe("10000");
    expect(quote.estimatedTotalLamports).toBe("10013000");
  });
});

describe("parseLaunchRequest", () => {
  it("normalizes symbol and applies default decimals", () => {
    const creator = Keypair.generate().publicKey.toBase58();
    const parsed = parseLaunchRequest(
      {
        name: "Example Coin",
        symbol: "egc",
        initialSupply: "1000000",
        creatorPublicKey: creator
      },
      testConfig()
    );

    expect(parsed.symbol).toBe("EGC");
    expect(parsed.decimals).toBe(6);
    expect(parsed.revokeFreezeAuthority).toBe(true);
  });

  it("rejects oversized supplies", () => {
    const creator = Keypair.generate().publicKey.toBase58();

    expect(() =>
      parseLaunchRequest(
        {
          name: "Example Coin",
          symbol: "EGC",
          initialSupply: "1000001",
          creatorPublicKey: creator
        },
        testConfig()
      )
    ).toThrow("initialSupply exceeds max");
  });
});

describe("scaleTokenAmount", () => {
  it("scales whole-token supply into base units", () => {
    expect(scaleTokenAmount("42", 6)).toBe(42_000_000n);
  });

  it("guards against SPL u64 overflow", () => {
    expect(() => scaleTokenAmount("18446744073709551616", 0)).toThrow(
      "too large for an SPL token mint"
    );
  });
});

describe("prepareLaunchTransaction", () => {
  it("serializes a partially signed launch transaction", async () => {
    const creator = Keypair.generate().publicKey;
    const config = testConfig({ feeVault: new PublicKey("11111111111111111111111111111111") });
    const launchRequest = parseLaunchRequest(
      {
        name: "Example Coin",
        symbol: "EGC",
        initialSupply: "1000",
        creatorPublicKey: creator.toBase58(),
        revokeMintAuthority: true
      },
      config
    );

    const result = await prepareLaunchTransaction(fakeConnection(), config, launchRequest);
    const transaction = Transaction.from(Buffer.from(result.transactionBase64, "base64"));

    expect(result.requiredWalletSigner).toBe(creator.toBase58());
    expect(transaction.feePayer?.toBase58()).toBe(creator.toBase58());
    expect(transaction.instructions[0].programId.equals(SystemProgram.programId)).toBe(true);
    expect(transaction.instructions[0].keys[1].pubkey.toBase58()).toBe(config.feeVault.toBase58());
    expect(transaction.signatures.some((signature) => signature.signature !== null)).toBe(true);
  });
});
