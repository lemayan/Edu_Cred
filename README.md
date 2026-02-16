# EduCred — Decentralized Certificate Verification on Cardano

EduCred is a fully client-side, decentralized certificate issuance and verification platform built on Cardano's preprod testnet. Issuers mint NFTs containing SHA-256 document hashes; verifiers compare any uploaded file against the on-chain record — no backend, no middleman.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 (Vite) |
| Blockchain SDK | Mesh SDK (`@meshsdk/core` + `@meshsdk/react`) |
| Hashing | crypto-js (SHA-256) |
| Styling | Tailwind CSS 3 |
| Network | Cardano **Preprod Testnet** |
| Metadata API | Blockfrost |

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx           # Top navigation with route links
│   ├── ConnectWallet.jsx    # Mesh CardanoWallet + connection status
│   ├── IssueCertificate.jsx # Form → hash → mint NFT
│   ├── VerifyCertificate.jsx# Verify by asset ID or policy ID
│   └── StatusBadge.jsx      # Green VALID / Red INVALID badge
├── utils/
│   ├── hashFile.js          # SHA-256 hashing utility (FileReader + crypto-js)
│   └── cardano.js           # All blockchain helpers (wallet, mint, fetch metadata)
├── App.jsx                  # Routes + MeshProvider
├── main.jsx                 # React entry point
└── index.css                # Tailwind directives + custom styles
```

---

## Prerequisites

1. **Node.js** ≥ 18
2. **A Cardano browser wallet** — install one of:
   - [Nami](https://namiwallet.io)
   - [Eternl](https://eternl.io)
   - [Lace](https://www.lace.io)
3. **Testnet ADA** — get free tADA from the [Cardano Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
4. **Blockfrost API key** (free) — sign up at [blockfrost.io](https://blockfrost.io) and create a **Preprod** project

---

## Installation

```bash
# 1. Clone / navigate to project
cd Edu_Cred

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and paste your Blockfrost preprod project ID
```

### `.env` file

```env
VITE_BLOCKFROST_API_KEY=preprodXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_NETWORK=preprod
```

---

## Running

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

Open **http://localhost:5173** in a browser with your Cardano wallet extension installed.

---

## How to Configure Testnet

1. Open your wallet (Nami / Eternl / Lace).
2. Switch the wallet to **Preprod Testnet** in settings / network selector.
3. Copy your testnet address.
4. Go to [Cardano Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/), paste your address, and request test ADA.
5. Wait ~20 seconds for the transaction to confirm.
6. You're ready to mint!

---

## Policy ID

When you mint a certificate with EduCred, a **ForgeScript** is generated from your wallet address. This creates a **unique policy ID** tied to your wallet.

- Every NFT you mint will share the same policy ID (as long as you use the same address).
- You can use this policy ID in the "Lookup by Policy ID" tab on the verification page to list all certificates you've issued.
- The policy ID can be found on Cardanoscan after your first mint: go to the transaction → click on the minted token → the policy ID is shown.

### Example Flow to Get Your Policy ID

1. Mint your first certificate.
2. Click "View on Cardanoscan" link shown after minting.
3. On the Cardanoscan transaction page, find the **Minted Tokens** section.
4. Click on the token — the policy ID is the first part of the **fingerprint** (before the dot).

---

## Full Test Flow (Step by Step)

### A. Issue a Certificate

1. Open http://localhost:5173/issue
2. Click **Connect Wallet** — select your Nami / Eternl / Lace wallet.
3. Fill in:
   - **Student Name**: `Alice Johnson`
   - **Course**: `Blockchain Fundamentals 101`
4. Upload a certificate file (any PDF or image).
5. Click **Mint Certificate NFT**.
6. Approve the transaction in your wallet popup.
7. Wait for confirmation — you'll see:
   - ✅ Transaction hash
   - ✅ Asset name
   - ✅ Link to Cardanoscan

### B. Verify a Certificate (by Asset ID)

1. From the mint success screen, copy the **asset ID** (you can find it on Cardanoscan by clicking into the minted token — the full asset ID is `policyId` + hex-encoded `assetName`).
2. Go to http://localhost:5173/verify
3. Choose **"Verify by Asset ID"** tab.
4. Paste the asset ID.
5. (Optional) Upload the **same** certificate file used during minting.
6. Click **Fetch & Verify**.
7. Result:
   - **Same file** → 🟢 **VALID CERTIFICATE**
   - **Different file** → 🔴 **INVALID CERTIFICATE**

### C. Verify by Policy ID

1. Go to http://localhost:5173/verify
2. Choose **"Lookup by Policy ID"** tab.
3. Paste your policy ID.
4. Click **Fetch Assets** — all certificates minted under that policy appear.
5. Click any asset ID to jump to the verification tab and check it.

---

## How Verification Logic Works

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│  User        │       │  Browser     │       │  Cardano     │
│  uploads     │──────▸│  SHA-256     │       │  Blockchain  │
│  file        │       │  hash        │       │              │
└─────────────┘       └──────┬───────┘       └──────┬───────┘
                             │                       │
                             │   ┌───────────────┐   │
                             └──▸│  Compare       │◂──┘
                                 │  localHash vs  │  Fetch on-chain
                                 │  onChainHash   │  metadata via
                                 └───────┬───────┘  Blockfrost
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                        localHash ===          localHash !==
                        onChainHash            onChainHash
                              │                     │
                        🟢 VALID              🔴 INVALID
```

1. **Upload**: The verifier uploads the certificate file (PDF/image) in the browser.
2. **Local Hash**: The file is hashed using SHA-256 via `crypto-js` — entirely client-side, nothing is uploaded anywhere.
3. **Fetch On-Chain**: The NFT asset's CIP-25 metadata is fetched from the Cardano blockchain via Blockfrost API.
4. **Compare**: The local SHA-256 hash is compared to the `documentHash` field stored in the NFT metadata.
5. **Result**: If they match → **VALID**. If they differ → **INVALID**.

### Security Properties

- **Tamper-proof**: Once minted, the on-chain hash cannot be altered.
- **Privacy-preserving**: The original document is never uploaded — only compared locally.
- **Decentralized**: No server to hack or go offline; the blockchain is the source of truth.
- **Verifiable by anyone**: Anyone with the asset ID and the original file can verify.

---

## Advanced Features

- **Fetch assets by Policy ID**: List all certificates issued under a specific policy.
- **Ownership verification**: By connecting a wallet, the app displays which certificates are held.
- **Transaction explorer links**: Every minted certificate links directly to [Preprod Cardanoscan](https://preprod.cardanoscan.io).

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Wallet not showing | Make sure extension is installed and enabled for the page |
| "Insufficient funds" | Get testnet ADA from the [Cardano Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/) |
| "Blockfrost API key not configured" | Add your key to `.env` and restart the dev server |
| Asset not found on verify | Wait 1-2 minutes after minting for the blockchain to propagate |
| Build errors with WASM | Ensure Node.js ≥ 18 and run `npm install` again |

---

## License

MIT
