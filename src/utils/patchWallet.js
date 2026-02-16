/**
 * patchWallet.js — Suppress @meshsdk/react internal errors
 *
 * The useWallet() hook from @meshsdk/react internally calls
 * BrowserWallet.getUnusedAddresses() during its load phase.
 * Mesh's address deserialization is broken with some wallets,
 * so we catch those errors to prevent uncaught promise rejections.
 *
 * Our cardano.js bypasses all these methods entirely (using raw CIP-30 + CSL),
 * so this patch only prevents console noise from @meshsdk/react internals.
 */

import { BrowserWallet } from "@meshsdk/core";

const wrap = (name) => {
    const original = BrowserWallet.prototype[name];
    BrowserWallet.prototype[name] = async function (...args) {
        try {
            return await original.apply(this, args);
        } catch {
            // Return safe defaults so @meshsdk/react doesn't crash
            return name === "getChangeAddress" ? "" : [];
        }
    };
};

wrap("getUnusedAddresses");
wrap("getUsedAddresses");
wrap("getChangeAddress");
