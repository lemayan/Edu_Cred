import { useWallet } from '@meshsdk/react';
import { BrowserWallet } from '@meshsdk/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export default function ConnectWallet() {
  const { connected, name, connect, disconnect } = useWallet();
  const [wallets, setWallets] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    Object.keys(localStorage).forEach((key) => {
      if (key.toLowerCase().includes('wallet')) localStorage.removeItem(key);
    });
    disconnect && disconnect();
  }, []);

  useEffect(() => {
    async function detect() {
      try {
        const installed = await BrowserWallet.getInstalledWallets();
        setWallets(installed);
      } catch {
        const fb = [];
        if (window.cardano) {
          for (const n of ['nami', 'eternl', 'lace', 'flint', 'typhon', 'gerowallet', 'yoroi']) {
            if (window.cardano[n]) fb.push({ name: n, icon: window.cardano[n].icon ?? null, version: window.cardano[n].apiVersion ?? null });
          }
        }
        setWallets(fb);
      }
    }
    detect();
  }, []);

  useEffect(() => {
    const fn = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleConnect = async (walletName) => {
    try {
      setConnecting(true);
      setShowDropdown(false);
      disconnect && disconnect();
      await connect(walletName.toLowerCase());
    } catch (err) {
      console.error('Wallet connection failed:', err);
      try { if (window.cardano?.[walletName.toLowerCase()]) await window.cardano[walletName.toLowerCase()].enable(); } catch { }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f0f0]">
          <svg className="h-5 w-5 text-[#111]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#111]">Connect Wallet</h2>
          <p className="text-xs text-[#999]">Link your Cardano wallet to continue</p>
        </div>
      </div>

      {!connected ? (
        <div className="relative" ref={wrapRef}>
          <motion.button
            onClick={() => setShowDropdown((o) => !o)}
            disabled={connecting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary w-full py-3.5 disabled:opacity-40"
          >
            {connecting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-white animate-spin" />
                Connecting…
              </>
            ) : (
              'Connect Wallet'
            )}
          </motion.button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden rounded-xl bg-white border border-gray-100 shadow-xl"
              >
                {wallets.length === 0 ? (
                  <div className="p-5 text-center">
                    <p className="text-sm font-semibold text-[#111]">No wallets detected</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Install{' '}
                      <a href="https://www.lace.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Lace</a>,{' '}
                      <a href="https://eternl.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Eternl</a>, or{' '}
                      <a href="https://namiwallet.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Nami</a>
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Select wallet
                    </p>
                    {wallets.map((w) => (
                      <button
                        key={w.name}
                        onClick={() => handleConnect(w.name)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#f5f5f5]"
                      >
                        {w.icon ? (
                          <img src={w.icon} alt={w.name} className="h-8 w-8 rounded-lg" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0f0f0] text-xs font-bold text-[#111]">
                            {w.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-semibold capitalize text-[#111]">{w.name}</p>
                          {w.version && <p className="text-[11px] text-gray-400">v{w.version}</p>}
                        </div>
                        <svg className="h-4 w-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'var(--green-light)' }}>
            <span className="h-2.5 w-2.5 rounded-full bg-[#00c853]" />
            <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>Connected</span>
            {name && (
              <span className="ml-auto text-xs bg-white/80 px-2.5 py-1 rounded-md capitalize font-medium text-[#111]">{name}</span>
            )}
          </div>
          <button onClick={() => disconnect()} className="btn-outline w-full text-sm py-2.5">
            Disconnect
          </button>
        </div>
      )}
    </motion.div>
  );
}
