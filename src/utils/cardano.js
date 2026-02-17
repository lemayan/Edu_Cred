/**
 * cardano.js — EduCred / Kenya Government Credential System
 *
 * Uses @emurgo/cardano-serialization-lib-browser (CSL) directly for ALL
 * CBOR / crypto / transaction-building operations.
 *
 * Mesh SDK is used ONLY for BrowserWallet.enable() (wallet connection UI).
 * All other wallet interaction goes through the raw CIP-30 API.
 *
 * Access Control: Only authorized government wallets can mint credentials.
 */

import { BrowserWallet } from "@meshsdk/core";
import { DEMO_MODE, findAuthorizedIssuer } from "./authorizedWallets";

// ---------------------------------------------------------------------------
// CSL singleton  (lazy-loaded WASM module)
// ---------------------------------------------------------------------------

let _CSL = null;

async function initCSL() {
  if (_CSL) return _CSL;
  const loader = await import("@emurgo/cardano-serialization-lib-browser");
  // Some builds export a default init() that must be called first
  if (typeof loader.default === "function") {
    await loader.default();
  }
  _CSL = loader;
  console.log("[EduCred] CSL initialised successfully");
  return _CSL;
}

// ---------------------------------------------------------------------------
// Hex helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex) {
  if (!hex) return new Uint8Array(0);
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stringToHex(str) {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Raw CIP-30 wallet access
// ---------------------------------------------------------------------------

/**
 * Extract the raw CIP-30 API handle from a Mesh BrowserWallet instance,
 * or fall back to detecting the enabled wallet directly from window.cardano.
 */
async function getRawApi(wallet) {
  // Mesh stores the raw CIP-30 handle on wallet._walletInstance
  if (wallet?._walletInstance) return wallet._walletInstance;

  // Fallback: walk window.cardano to find the first enabled wallet
  if (!window.cardano) return null;
  const names = [
    "nami",
    "eternl",
    "lace",
    "yoroi",
    "typhon",
    "gerowallet",
    "flint",
    "vespr",
  ];
  for (const name of names) {
    try {
      if (window.cardano[name] && (await window.cardano[name].isEnabled())) {
        return await window.cardano[name].enable();
      }
    } catch (_) {
      /* skip */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Authorization — Government Issuer Check
// ---------------------------------------------------------------------------

/**
 * Extract the stake key hash from a wallet.
 * Used to check authorization against the whitelist.
 */
export async function getStakeKeyHash(wallet) {
  const CSL = await initCSL();
  const api = await getRawApi(wallet);
  if (!api) throw new Error("Could not access raw wallet API");

  let rawHex = null;
  try {
    const used = await api.getUsedAddresses();
    if (used?.length) rawHex = used[0];
  } catch (_) { }
  if (!rawHex) rawHex = await api.getChangeAddress();
  if (!rawHex) throw new Error("No address available");

  const addressObj = CSL.Address.from_bytes(hexToBytes(rawHex));
  const baseAddr = CSL.BaseAddress.from_address(addressObj);

  if (baseAddr) {
    const stakeCred = baseAddr.stake_cred();
    const stakeKeyHash = stakeCred?.to_keyhash();
    if (stakeKeyHash) {
      const hex = bytesToHex(stakeKeyHash.to_bytes());
      console.log("[EduCred] Stake key hash:", hex);
      return hex;
    }
  }

  // Fallback: use payment key hash
  const paymentCred = baseAddr?.payment_cred()?.to_keyhash();
  if (paymentCred) {
    const hex = bytesToHex(paymentCred.to_bytes());
    console.log("[EduCred] Payment key hash (fallback for auth):", hex);
    return hex;
  }

  return null;
}

/**
 * Check if the connected wallet is authorized to issue credentials.
 * Returns { authorized: boolean, issuer: { label, stakeKeyHash } | null, demoMode: boolean }
 */
export async function isAuthorizedIssuer(wallet) {
  if (DEMO_MODE) {
    return { authorized: true, issuer: findAuthorizedIssuer('demo'), demoMode: true };
  }

  try {
    const hash = await getStakeKeyHash(wallet);
    if (!hash) return { authorized: false, issuer: null, demoMode: false };

    const issuer = findAuthorizedIssuer(hash);
    return { authorized: !!issuer, issuer, demoMode: false };
  } catch (err) {
    console.error("[EduCred] Authorization check failed:", err);
    return { authorized: false, issuer: null, demoMode: false };
  }
}

// ---------------------------------------------------------------------------
// Blockfrost Config (Preprod ONLY)
// ---------------------------------------------------------------------------

const BLOCKFROST_BASE = "https://cardano-preprod.blockfrost.io/api/v0";
const BLOCKFROST_KEY = import.meta.env.VITE_BLOCKFROST_API_KEY ?? "";
const EXPLORER_BASE = "https://preprod.cardanoscan.io";

export function explorerTxUrl(txHash) {
  return `${EXPLORER_BASE}/transaction/${txHash}`;
}

// ---------------------------------------------------------------------------
// Wallet helpers
// ---------------------------------------------------------------------------

export function getInstalledWallets() {
  return BrowserWallet.getInstalledWallets();
}

export async function enableWallet(walletName) {
  const wallet = await BrowserWallet.enable(walletName);

  // Verify network via raw CIP-30 (avoids Mesh address parsing)
  const api = await getRawApi(wallet);
  if (api) {
    const networkId = await api.getNetworkId();
    if (networkId !== 0) {
      throw new Error(
        "Mainnet wallets are not supported. Please switch your wallet to Preprod Testnet."
      );
    }
  }
  return wallet;
}

/**
 * Get bech32 wallet address via raw CIP-30 + CSL.
 * Completely bypasses Mesh's broken address parsing.
 */
export async function getWalletAddress(wallet) {
  if (!wallet) throw new Error("Wallet not connected");

  const CSL = await initCSL();
  const api = await getRawApi(wallet);
  if (!api) throw new Error("Could not access raw wallet API");

  // Try used addresses first, then change address
  let rawHex = null;
  try {
    const used = await api.getUsedAddresses();
    if (used?.length) rawHex = used[0];
  } catch (_) { }

  if (!rawHex) {
    try {
      rawHex = await api.getChangeAddress();
    } catch (_) { }
  }

  if (!rawHex) {
    try {
      const unused = await api.getUnusedAddresses();
      if (unused?.length) rawHex = unused[0];
    } catch (_) { }
  }

  if (!rawHex) {
    throw new Error(
      "Could not retrieve any address from wallet. Please ensure your wallet is connected, unlocked, and on the correct network (Preprod)."
    );
  }

  console.log("[EduCred] Raw CIP-30 address (hex):", rawHex);

  const addrObj = CSL.Address.from_bytes(hexToBytes(rawHex));
  const bech32 = addrObj.to_bech32();

  console.log("[EduCred] Wallet address (bech32):", bech32);

  if (!bech32.startsWith("addr_test")) {
    throw new Error(
      `Wallet is not on Preprod Testnet (Address: ${bech32.slice(0, 15)}...). Please switch network.`
    );
  }
  return bech32;
}

export async function getNetworkId(wallet) {
  const api = await getRawApi(wallet);
  if (api) return api.getNetworkId();
  return wallet.getNetworkId();
}

export async function assertTestnet(wallet) {
  const id = await getNetworkId(wallet);
  if (id !== 0) {
    throw new Error("Mainnet transactions are disabled. Use Preprod Testnet.");
  }
}

// ---------------------------------------------------------------------------
// Blockfrost helpers
// ---------------------------------------------------------------------------

async function blockfrostGet(endpoint) {
  if (!BLOCKFROST_KEY) {
    throw new Error(
      "Blockfrost API key not configured. Set VITE_BLOCKFROST_API_KEY in your .env file."
    );
  }
  const res = await fetch(`${BLOCKFROST_BASE}${endpoint}`, {
    headers: { project_id: BLOCKFROST_KEY },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Blockfrost error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Hardcoded Preprod protocol parameters (these rarely change and are safe defaults)
const PREPROD_PROTOCOL_DEFAULTS = {
  min_fee_a: 44,
  min_fee_b: 155381,
  pool_deposit: "500000000",
  key_deposit: "2000000",
  coins_per_utxo_size: "4310",
  max_tx_size: 16384,
  max_val_size: "5000",
};

async function fetchProtocolParams() {
  // Try Blockfrost first if key is configured
  if (BLOCKFROST_KEY && BLOCKFROST_KEY !== "your_preprod_api_key_here") {
    try {
      const data = await blockfrostGet("/epochs/latest/parameters");
      if (data) return data;
    } catch (e) {
      console.warn("[EduCred] Blockfrost protocol params fetch failed, using defaults:", e.message);
    }
  } else {
    console.log("[EduCred] No Blockfrost key configured, using default protocol parameters");
  }
  return PREPROD_PROTOCOL_DEFAULTS;
}

// ---------------------------------------------------------------------------
// Minting NFT  — built entirely with CSL
// ---------------------------------------------------------------------------

export async function mintCertificateNFT(wallet, certData) {
  await assertTestnet(wallet);

  const CSL = await initCSL();
  const api = await getRawApi(wallet);
  if (!api) throw new Error("Could not access raw wallet API");

  // ── 1. Get address & key hash ──────────────────────────────────────────
  const rawAddresses = await api.getUsedAddresses();
  let rawHex = rawAddresses?.[0];
  if (!rawHex) rawHex = await api.getChangeAddress();
  if (!rawHex) throw new Error("No address available from wallet");

  const addressBytes = hexToBytes(rawHex);
  const addressObj = CSL.Address.from_bytes(addressBytes);
  const bech32 = addressObj.to_bech32();

  console.log("[EduCred] Minting — address:", bech32);

  if (!bech32.startsWith("addr_test")) {
    throw new Error("Wallet not on Preprod Testnet");
  }

  const baseAddr = CSL.BaseAddress.from_address(addressObj);
  if (!baseAddr) throw new Error("Not a base address — cannot extract key hash");

  const paymentKeyHash = baseAddr.payment_cred().to_keyhash();
  if (!paymentKeyHash) throw new Error("No payment key hash found");

  console.log("[EduCred] Payment key hash:", bytesToHex(paymentKeyHash.to_bytes()));

  // ── 2. Build native script (ScriptPubkey) ──────────────────────────────
  const nativeScript = CSL.NativeScript.new_script_pubkey(
    CSL.ScriptPubkey.new(paymentKeyHash)
  );

  const policyIdHash = nativeScript.hash();
  const policyId = bytesToHex(policyIdHash.to_bytes());
  console.log("[EduCred] Policy ID:", policyId);

  // ── 3. Asset name & metadata ───────────────────────────────────────────
  // Use student name in asset name for easier discovery (truncated to fit 32 bytes with timestamp)
  // Format: Name-Timestamp (e.g. "JohnDoe-1678901234567")
  const cleanName = certData.studentName.replace(/[^a-zA-Z0-9]/g, '');
  const timestamp = Date.now().toString();
  // Asset name limit is 32 bytes. Timestamp is 13 chars + 1 hyphen = 14 chars.
  // We have 18 chars left for the name.
  const maxNameLen = 32 - 14;
  const truncatedName = cleanName.slice(0, maxNameLen);
  const assetLabel = `${truncatedName}-${timestamp}`;

  const assetNameHex = stringToHex(assetLabel);
  const assetNameCSL = CSL.AssetName.new(hexToBytes(assetNameHex));

  const metadata = {
    name: assetLabel,
    description: "Government of Kenya — Verified Academic Credential",
    image: "ipfs://QmPlaceholder",
    mediaType: "image/png",
    studentName: certData.studentName,
    course: certData.course,
    institution: certData.institution || "Not specified",
    registrationNumber: certData.registrationNumber || "Not specified",
    grade: certData.grade || "Not specified",
    programLevel: certData.programLevel || "Not specified",
    issueDate: new Date().toISOString(),
    issuer: bech32,
    issuerType: "Government of Kenya",
    issuerInstitution: certData.issuerInstitution || "Ministry of Education",
    documentHash: certData.documentHash,
    textHash: certData.textHash || "",
    standard: "CIP-25",
    system: "EduCred v2.0 — Kenya National Credential System",
  };

  // ── 4. Fetch protocol parameters ───────────────────────────────────────
  console.log("[EduCred] Fetching protocol parameters...");
  const pp = await fetchProtocolParams();

  const linearFee = CSL.LinearFee.new(
    CSL.BigNum.from_str(pp.min_fee_a.toString()),
    CSL.BigNum.from_str(pp.min_fee_b.toString())
  );

  const txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CSL.BigNum.from_str(pp.pool_deposit))
    .key_deposit(CSL.BigNum.from_str(pp.key_deposit))
    .coins_per_utxo_byte(CSL.BigNum.from_str(pp.coins_per_utxo_size || pp.coins_per_utxo_word || "4310"))
    .max_tx_size(pp.max_tx_size || 16384)
    .max_value_size(parseInt(pp.max_val_size || "5000", 10))
    .build();

  const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

  // ── 5. Add mint ────────────────────────────────────────────────────────
  txBuilder.add_mint_asset(nativeScript, assetNameCSL, CSL.Int.new_i32(1));

  // ── 6. Build CIP-25 metadata (label 721) ───────────────────────────────
  const auxData = CSL.AuxiliaryData.new();
  const generalMetadata = CSL.GeneralTransactionMetadata.new();

  // Build metadata map: { policyId: { assetName: { ...fields } } }
  // CIP-25 requires strings ≤ 64 bytes; longer values become arrays of chunks
  function toMetadatum(value) {
    const str = String(value);
    if (str.length <= 64) {
      return CSL.TransactionMetadatum.new_text(str);
    }
    // Split into 64-char chunks → MetadataList
    const list = CSL.MetadataList.new();
    for (let i = 0; i < str.length; i += 64) {
      list.add(CSL.TransactionMetadatum.new_text(str.slice(i, i + 64)));
    }
    return CSL.TransactionMetadatum.new_list(list);
  }

  const innerMap = CSL.MetadataMap.new();
  for (const [key, value] of Object.entries(metadata)) {
    innerMap.insert(
      CSL.TransactionMetadatum.new_text(key),
      toMetadatum(value)
    );
  }

  const assetMap = CSL.MetadataMap.new();
  assetMap.insert(
    CSL.TransactionMetadatum.new_text(assetLabel),
    CSL.TransactionMetadatum.new_map(innerMap)
  );

  const policyMap = CSL.MetadataMap.new();
  policyMap.insert(
    CSL.TransactionMetadatum.new_text(policyId),
    CSL.TransactionMetadatum.new_map(assetMap)
  );

  generalMetadata.insert(
    CSL.BigNum.from_str("721"),
    CSL.TransactionMetadatum.new_map(policyMap)
  );

  auxData.set_metadata(generalMetadata);
  txBuilder.set_auxiliary_data(auxData);

  // ── 7. Add output — send the minted NFT to ourselves ───────────────────
  const multiAsset = CSL.MultiAsset.new();
  const assets = CSL.Assets.new();
  assets.insert(assetNameCSL, CSL.BigNum.from_str("1"));
  multiAsset.insert(policyIdHash, assets);

  // Minimum ADA for token output (2 ADA is safe)
  const outputValue = CSL.Value.new_with_assets(
    CSL.BigNum.from_str("2000000"),
    multiAsset
  );
  const txOutput = CSL.TransactionOutput.new(addressObj, outputValue);
  txBuilder.add_output(txOutput);

  // ── 8. Add UTxOs as inputs ─────────────────────────────────────────────
  console.log("[EduCred] Fetching UTxOs from wallet...");
  const rawUtxos = await api.getUtxos();
  if (!rawUtxos || rawUtxos.length === 0) {
    throw new Error(
      "No UTxOs found in wallet. Please ensure your wallet has funds (request tADA from the Preprod faucet)."
    );
  }

  const utxos = CSL.TransactionUnspentOutputs.new();
  for (const hex of rawUtxos) {
    try {
      utxos.add(CSL.TransactionUnspentOutput.from_bytes(hexToBytes(hex)));
    } catch (e) {
      console.warn("[EduCred] Skipping unparseable UTxO:", e.message);
    }
  }

  if (utxos.len() === 0) {
    throw new Error("Could not parse any UTxOs from wallet");
  }

  console.log(`[EduCred] Parsed ${utxos.len()} UTxOs`);

  // Coin selection — use LargestFirst strategy
  txBuilder.add_inputs_from(utxos, CSL.CoinSelectionStrategyCIP2.LargestFirstMultiAsset);

  // Change back to our address
  txBuilder.add_change_if_needed(addressObj);

  // ── 9. Build, sign, submit ─────────────────────────────────────────────
  console.log("[EduCred] Building transaction...");

  // build_tx() returns a full Transaction including witnesses from add_mint_asset
  const unsignedTx = txBuilder.build_tx();
  const unsignedTxHex = bytesToHex(unsignedTx.to_bytes());

  console.log("[EduCred] Transaction built, requesting wallet signature...");

  // Sign via CIP-30 (partialSign = true because native script witness is already attached)
  // CIP-30 signTx returns a TransactionWitnessSet (just signatures), not a full transaction
  const walletWitnessHex = await api.signTx(unsignedTxHex, true);

  // Merge wallet's vkey witnesses into the existing witness set
  const existingWitnessSet = unsignedTx.witness_set();
  const walletWitnessSet = CSL.TransactionWitnessSet.from_bytes(hexToBytes(walletWitnessHex));
  const vkeys = walletWitnessSet.vkeys();
  if (vkeys) {
    existingWitnessSet.set_vkeys(vkeys);
  }

  // Reconstruct fully signed transaction
  const signedTx = CSL.Transaction.new(
    unsignedTx.body(),
    existingWitnessSet,
    unsignedTx.auxiliary_data()
  );
  const signedTxHex = bytesToHex(signedTx.to_bytes());

  console.log("[EduCred] Submitting transaction...");
  try {
    const txHash = await api.submitTx(signedTxHex);
    console.log("[EduCred] ✅ Transaction submitted! Hash:", txHash);
    return {
      txHash,
      assetName: assetLabel,
    };
  } catch (submitErr) {
    // Log the full error details from the Cardano node
    console.error("[EduCred] Submit failed — full error:", JSON.stringify(submitErr, null, 2));
    console.error("[EduCred] Error info:", submitErr?.info || submitErr?.message);
    throw new Error(`Transaction rejected by network: ${submitErr?.info || submitErr?.message || submitErr}`);
  }
}

// ---------------------------------------------------------------------------
// Blockfrost Asset Fetching  (no Mesh dependency — kept as-is)
// ---------------------------------------------------------------------------

export async function fetchAssetMetadata(assetId) {
  const data = await blockfrostGet(`/assets/${assetId}`);
  if (!data) return null;
  return data.onchain_metadata ?? data.metadata ?? null;
}

export async function fetchAssetsByPolicy(policyId) {
  const data = await blockfrostGet(`/assets/policy/${policyId}`);
  return data ?? [];
}

export async function fetchAddressAssets(address) {
  const data = await blockfrostGet(`/addresses/${address}`);
  if (!data) return [];
  return (data.amount ?? []).filter((a) => a.unit !== "lovelace");
}

export function hexToString(hex) {
  if (!hex) return '';
  // Skip if not hex
  if (!/^[0-9a-fA-F]+$/.test(hex)) return hex;

  let str = '';
  try {
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
  } catch (e) {
    return hex;
  }
  return str;
}
