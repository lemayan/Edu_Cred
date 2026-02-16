/**
 * authorizedWallets.js — Government Issuer Whitelist
 *
 * Controls which wallets are allowed to issue (mint) credentials.
 * In production, DEMO_MODE should be false and real government
 * wallet stake-key-hashes should be listed.
 *
 * We match on the STAKE KEY HASH (credential part of the reward address),
 * not the full address — this way a government wallet is authorized
 * regardless of which UTXO/change address it happens to be using.
 */

// ── Demo Mode ────────────────────────────────────────────────────
// When true, any connected wallet can issue credentials.
// Set to false in production and populate AUTHORIZED_ISSUERS below.
export const DEMO_MODE = true;

// ── Authorized Government Issuers ────────────────────────────────
// Each entry: { label, stakeKeyHash }
//   - label: display name shown in the UI
//   - stakeKeyHash: hex-encoded Ed25519 key hash of the stake credential
//
// To find your wallet's stake key hash:
//   1. Connect your wallet
//   2. Open browser console
//   3. Look for "[EduCred] Stake key hash: <hex>" log
//
export const AUTHORIZED_ISSUERS = [
    {
        label: 'Ministry of Education — Kenya',
        stakeKeyHash: 'PLACEHOLDER_MOE_STAKE_KEY_HASH',
    },
    {
        label: 'Kenya National Examinations Council (KNEC)',
        stakeKeyHash: 'PLACEHOLDER_KNEC_STAKE_KEY_HASH',
    },
    {
        label: 'Technical and Vocational Education (TVET)',
        stakeKeyHash: 'PLACEHOLDER_TVET_STAKE_KEY_HASH',
    },
];

/**
 * Check if a stake key hash is in the authorized list.
 * Returns the issuer object { label, stakeKeyHash } or null.
 */
export function findAuthorizedIssuer(stakeKeyHash) {
    if (DEMO_MODE) return { label: 'Demo Issuer (Any Wallet)', stakeKeyHash };
    return AUTHORIZED_ISSUERS.find((i) => i.stakeKeyHash === stakeKeyHash) || null;
}
