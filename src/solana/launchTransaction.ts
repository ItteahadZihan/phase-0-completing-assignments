import {
  AccountLayout,
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";
import type { LaunchpadConfig } from "../config.js";
import { quoteCreationFee, type CreationFeeQuote } from "../fees.js";
import type { LaunchRequest } from "../validation.js";

export interface RentEstimates {
  mintRentLamports: bigint;
  associatedTokenAccountRentLamports: bigint;
}

export interface PreparedLaunchTransaction {
  cluster: string;
  mintPublicKey: string;
  creatorAssociatedTokenAccount: string;
  transactionBase64: string;
  quote: CreationFeeQuote;
  requiredWalletSigner: string;
}

const U64_MAX = (1n << 64n) - 1n;

export async function getRentEstimates(connection: Connection): Promise<RentEstimates> {
  const [mintRentLamports, associatedTokenAccountRentLamports] = await Promise.all([
    getMinimumBalanceForRentExemptMint(connection),
    getMinimumBalanceForRentExemptAccount(connection)
  ]);

  return {
    mintRentLamports: BigInt(mintRentLamports),
    associatedTokenAccountRentLamports: BigInt(associatedTokenAccountRentLamports)
  };
}

export function scaleTokenAmount(wholeTokenAmount: string, decimals: number): bigint {
  const amount = BigInt(wholeTokenAmount);
  const scaledAmount = amount * 10n ** BigInt(decimals);

  if (scaledAmount > U64_MAX) {
    throw new Error("initialSupply is too large for an SPL token mint");
  }

  return scaledAmount;
}

function lamportsToSafeNumber(lamports: bigint, fieldName: string): number {
  if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${fieldName} is too large to safely encode`);
  }

  return Number(lamports);
}

export async function prepareLaunchTransaction(
  connection: Connection,
  config: LaunchpadConfig,
  request: LaunchRequest
): Promise<PreparedLaunchTransaction> {
  const creator = new PublicKey(request.creatorPublicKey);
  const mint = Keypair.generate();
  const rent = await getRentEstimates(connection);
  const latestBlockhash = await connection.getLatestBlockhash();
  const creatorAssociatedTokenAccount = getAssociatedTokenAddressSync(
    mint.publicKey,
    creator,
    false,
    TOKEN_PROGRAM_ID
  );
  const initialSupplyBaseUnits = scaleTokenAmount(request.initialSupply, request.decimals);

  const transaction = new Transaction({
    feePayer: creator,
    recentBlockhash: latestBlockhash.blockhash
  });

  if (config.platformFeeLamports > 0n) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: creator,
        toPubkey: config.feeVault,
        lamports: lamportsToSafeNumber(config.platformFeeLamports, "platformFeeLamports")
      })
    );
  }

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: creator,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: lamportsToSafeNumber(rent.mintRentLamports, "mintRentLamports"),
      programId: TOKEN_PROGRAM_ID
    }),
    createInitializeMint2Instruction(
      mint.publicKey,
      request.decimals,
      creator,
      request.revokeFreezeAuthority ? null : creator,
      TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      creator,
      creatorAssociatedTokenAccount,
      creator,
      mint.publicKey,
      TOKEN_PROGRAM_ID
    ),
    createMintToCheckedInstruction(
      mint.publicKey,
      creatorAssociatedTokenAccount,
      creator,
      initialSupplyBaseUnits,
      request.decimals,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  if (request.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mint.publicKey,
        creator,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_PROGRAM_ID
      )
    );
  }

  transaction.partialSign(mint);

  return {
    cluster: config.cluster,
    mintPublicKey: mint.publicKey.toBase58(),
    creatorAssociatedTokenAccount: creatorAssociatedTokenAccount.toBase58(),
    transactionBase64: transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
    quote: quoteCreationFee(config, rent),
    requiredWalletSigner: creator.toBase58()
  };
}

export const splTokenAccountSize = AccountLayout.span;
