# Custom Solana Launchpad Starter

This repository contains an MVP API for an independent Solana token launchpad.
It is designed to let you set your own transparent creation fee and prepare SPL
token launch transactions for creator wallets.

This project does not bypass pump.fun or any other third-party platform fees.
If you want lower creation costs, deploy and operate your own launchpad with its
own fee policy, token flow, disclosures, and compliance review.

## What is included

- TypeScript Express API
- Environment-driven Solana cluster, RPC, fee vault, and fee amount
- Launch request validation
- Creation fee quotes that include platform fee, rent estimates, and estimated
  signature cost
- Transaction preparation for:
  - platform fee transfer
  - mint account creation
  - SPL mint initialization
  - creator associated token account creation
  - initial supply minting
  - optional mint authority revocation
- Unit tests for fee math, validation, SPL amount scaling, and serialized
  transaction contents

## What is not included yet

- Bonding curve or AMM market making
- Metadata upload to IPFS/Arweave
- Wallet adapter frontend
- Mainnet deployment hardening
- Audited on-chain program logic
- Legal, tax, KYC/AML, market-abuse, or consumer-protection controls

## Setup

```bash
npm install
cp .env.example .env
npm test
npm run dev
```

## Configuration

Create `.env` from `.env.example` and set:

| Variable | Purpose |
| --- | --- |
| `SOLANA_CLUSTER` | `devnet`, `testnet`, or `mainnet-beta` |
| `SOLANA_RPC_URL` | Optional custom RPC URL |
| `FEE_VAULT_PUBLIC_KEY` | Wallet that receives your platform creation fee |
| `PLATFORM_FEE_LAMPORTS` | Your creation fee in lamports |
| `DEFAULT_TOKEN_DECIMALS` | Default SPL mint decimals |
| `MAX_INITIAL_SUPPLY` | Max whole-token initial supply allowed by the API |
| `CORS_ORIGIN` | Optional browser origin allowlist |
| `PORT` | API port, defaults to `3000` |

The default fee is `0.01 SOL` on devnet. Set the fee vault before using any
public cluster.

## API

### `GET /health`

Returns API status and configured cluster.

### `GET /api/config`

Returns public launchpad settings such as cluster, fee vault, and fee amount.

### `POST /api/quote`

Validates a launch request and returns a cost estimate.

```json
{
  "name": "Example Coin",
  "symbol": "EGC",
  "initialSupply": "1000000",
  "creatorPublicKey": "CreatorWalletPublicKey",
  "decimals": 6,
  "revokeMintAuthority": true,
  "revokeFreezeAuthority": true
}
```

### `POST /api/launches/prepare`

Returns a base64 serialized transaction. The backend generates and signs only
the new mint account. The creator wallet must still review, sign, and submit the
transaction.

Response fields include:

- `mintPublicKey`
- `creatorAssociatedTokenAccount`
- `transactionBase64`
- `quote`
- `requiredWalletSigner`

## Wallet integration outline

A browser client can:

1. Collect token name, symbol, supply, and authority options.
2. Call `/api/quote` and show all fees to the creator.
3. Call `/api/launches/prepare`.
4. Deserialize `transactionBase64` with `Transaction.from(...)`.
5. Ask the connected wallet to sign and send the transaction.
6. Confirm the signature on the configured cluster.

The creator wallet is the fee payer and mint authority signer. The server does
not need custody of creator funds or creator private keys.

## Operational notes

- Start on devnet and verify every transaction in a block explorer.
- Use a dedicated fee vault with accounting and withdrawal controls.
- Keep fees, authority settings, and risks visible in the UI before signing.
- Do not market this as a way to evade another platform's fees.
- Get legal and security review before mainnet launch.

## Development

```bash
npm test
npm run build
```
