import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchAssetMetadata,
  fetchAssetsByPolicy,
  hexToString,
} from '../utils/cardano';
import { hashFile } from '../utils/hashFile';
import { AUTHORIZED_ISSUERS, DEMO_MODE } from '../utils/authorizedWallets';

/* ── Pill Tabs ────────────────────────────────────────────────── */
function MethodTabs({ selected, onChange }) {
  const methods = [
    { id: 'asset', label: 'Asset ID' },
    { id: 'policy', label: 'Policy ID' },
    { id: 'hash', label: 'File Hash' },
  ];
  return (
    <div className="flex gap-1 p-1 bg-[#f0f0f0] rounded-full w-fit mx-auto mb-8">
      {methods.map((m) => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all ${selected === m.id
            ? 'bg-white text-[#111] shadow-sm'
            : 'text-[#888] hover:text-[#555]'
            }`}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ── Gov Badge ────────────────────────────────────────────────── */
function GovVerifiedBadge() {
  const isGov = DEMO_MODE || AUTHORIZED_ISSUERS.some((i) => i.stakeKeyHash !== 'PLACEHOLDER');
  return isGov ? (
    <div className="gov-badge mt-4">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
      Government Verified Credential
    </div>
  ) : null;
}

/* ── Metadata Fields ──────────────────────────────────────────── */
const META_FIELDS = [
  { key: 'name', label: 'Asset Name' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'course', label: 'Course / Program' },
  { key: 'institution', label: 'Institution' },
  { key: 'registrationNumber', label: 'Registration Number' },
  { key: 'grade', label: 'Grade / Class' },
  { key: 'issueDate', label: 'Issue Date' },
  { key: 'issuerType', label: 'Issuer Type' },
  { key: 'issuerInstitution', label: 'Issuing Body' },
  { key: 'issuer', label: 'Issuer Address' },
  { key: 'documentHash', label: 'Document Hash' },
  { key: 'standard', label: 'Standard' },
  { key: 'system', label: 'System' },
  { key: 'description', label: 'Description' },
];

/* ── Single Result Card ───────────────────────────────────────── */
function ResultCard({ meta, compact = false }) {
  if (!meta) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={compact ? 'card p-6' : 'card-elevated p-8 mt-6'}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8f5e9]">
          <svg className="h-4 w-4 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-[#111]">
            {meta.studentName || meta.name || 'Credential'}
          </h3>
          <p className="text-xs text-gray-400">
            {meta.course || meta.description || 'Verified on Cardano'}
          </p>
        </div>
      </div>

      <GovVerifiedBadge />

      <div className="mt-4 space-y-2">
        {META_FIELDS.map(({ key, label }) => {
          const value = meta[key];
          if (!value || value === 'Not specified') return null;
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-1.5 border-b border-gray-50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:w-36 shrink-0">{label}</span>
              <span className={`text-sm text-[#111] ${key === 'issuer' || key === 'documentHash' ? 'font-mono text-xs break-all text-gray-500' : 'font-medium'}`}>
                {String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Policy Results List ──────────────────────────────────────── */
function PolicyResultsList({ assets, onSelect, selectedAsset, selectedMeta, loadingAsset, policyId }) {
  const [filter, setFilter] = useState('');

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (!filter) return true;
      const term = filter.toLowerCase();

      // Check full asset ID
      if (asset.asset.toLowerCase().includes(term)) return true;

      // Check decoded asset name (remove policyId prefix first)
      const assetNameHex = asset.asset.replace(policyId, '');
      const decodedName = hexToString(assetNameHex);
      if (decodedName.toLowerCase().includes(term)) return true;

      return false;
    });
  }, [assets, filter, policyId]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="mt-6 space-y-4">
      {/* Summary header */}
      <div className="card-elevated p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f5e9]">
              <svg className="h-5 w-5 text-[#16a34a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111]">
                {assets.length} Credential{assets.length !== 1 ? 's' : ''} Found
              </h3>
              <p className="text-xs text-gray-400">
                All credentials minted under this policy ID
              </p>
            </div>
          </div>
        </div>

        {/* Filter Input */}
        <div className="mt-4">
          <input
            type="text"
            className="input text-sm w-full"
            placeholder="Filter credentials by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <GovVerifiedBadge />
      </div>

      {/* Credential list */}
      <div className="space-y-2">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No credentials match "{filter}"
          </div>
        ) : (
          filteredAssets.map((asset, i) => {
            const isSelected = selectedAsset === asset.asset;
            const assetNameHex = asset.asset.replace(policyId, '');
            const decodedName = hexToString(assetNameHex);
            // If decoding yields weird characters or is empty, fallback to truncated hex
            const displayName = (decodedName && /^[\w\s\-\.]+$/.test(decodedName))
              ? decodedName
              : `${asset.asset.slice(0, 10)}...${asset.asset.slice(-6)}`;

            return (
              <motion.div key={asset.asset}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * Math.min(i, 20) }}>
                <button
                  onClick={() => onSelect(asset.asset)}
                  className={`w-full text-left rounded-xl border-2 transition-all p-4 ${isSelected
                      ? 'border-[#16a34a] bg-[#f0faf3]'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-bold text-[#16a34a] shrink-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        {/* Show Decoded Name if available */}
                        <p className="text-sm font-semibold text-[#111] truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate font-mono">
                          {asset.asset}
                        </p>
                      </div>
                    </div>
                    <svg className={`h-4 w-4 shrink-0 transition-transform text-gray-400 ${isSelected ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail card */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        {loadingAsset ? (
                          <div className="card p-6 flex items-center justify-center gap-3 text-sm text-gray-400">
                            <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-[#16a34a] animate-spin" />
                            Loading credential details…
                          </div>
                        ) : selectedMeta ? (
                          <ResultCard meta={selectedMeta} compact />
                        ) : (
                          <div className="card p-6 text-center text-sm text-gray-400">
                            Could not load metadata for this credential.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function VerifyCertificate() {
  const [method, setMethod] = useState('asset');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Single asset result
  const [singleResult, setSingleResult] = useState(null);

  // Policy results (list of all assets)
  const [policyAssets, setPolicyAssets] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  // File hash
  const [hashMatch, setHashMatch] = useState(null);
  const fileInputRef = useRef(null);

  const resetResults = () => {
    setSingleResult(null);
    setPolicyAssets(null);
    setSelectedAsset(null);
    setSelectedMeta(null);
    setHashMatch(null);
    setError('');
  };

  const handleSearch = async () => {
    if (!query.trim() && method !== 'hash') { setError('Enter a value to search'); return; }
    setLoading(true);
    resetResults();

    try {
      if (method === 'asset') {
        const meta = await fetchAssetMetadata(query.trim());
        if (meta) {
          setSingleResult(meta);
        } else {
          setError('No credential found for this asset ID. Check the ID and try again.');
        }
      } else if (method === 'policy') {
        const assets = await fetchAssetsByPolicy(query.trim());
        if (assets && assets.length > 0) {
          setPolicyAssets(assets);
          // Auto-select and load the first asset
          await handleSelectAsset(assets[0].asset);
        } else {
          setError('No credentials found under this policy ID.');
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAsset = async (assetId) => {
    if (selectedAsset === assetId) {
      // Toggle off
      setSelectedAsset(null);
      setSelectedMeta(null);
      return;
    }
    setSelectedAsset(assetId);
    setSelectedMeta(null);
    setLoadingAsset(true);
    try {
      const meta = await fetchAssetMetadata(assetId);
      setSelectedMeta(meta);
    } catch {
      setSelectedMeta(null);
    } finally {
      setLoadingAsset(false);
    }
  };

  const handleFileVerify = useCallback(async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    resetResults();

    try {
      const hash = await hashFile(f);
      setQuery(hash);
      setHashMatch({ fileName: f.name, hash, status: 'computed' });
    } catch (err) {
      setError('Failed to hash file: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="page-enter mx-auto max-w-2xl px-6 py-16">
      <p className="label-text mb-2">Public Verification</p>
      <h1 className="display-md mb-2">Verify Credential</h1>
      <p className="body-sm mb-8">
        Verify any government-issued credential.
        <strong> No wallet or registration required.</strong>
      </p>

      <MethodTabs selected={method} onChange={(m) => { setMethod(m); resetResults(); setQuery(''); }} />

      <div className="card-elevated p-8">
        {method === 'hash' ? (
          <>
            <h2 className="text-lg font-bold mb-2">Verify by Document</h2>
            <p className="body-sm mb-4">
              Upload the original certificate file to compute its SHA-256 hash.
              Compare the result against the credential's on-chain document hash.
            </p>
            <div className={`dropzone ${hashMatch ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileVerify}
                accept=".pdf,.png,.jpg,.jpeg,.webp" />
              {hashMatch ? (
                <div>
                  <svg className="mx-auto h-8 w-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-semibold text-sm">{hashMatch.fileName}</p>
                  <p className="text-xs text-gray-400 mt-2 font-mono break-all">{hashMatch.hash}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    Compare this hash against the credential's on-chain <code>documentHash</code> field.
                  </p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-8 w-8 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">Upload document to verify</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-2">
              {method === 'asset' ? 'Verify by Asset ID' : 'Verify by Policy ID'}
            </h2>
            <p className="body-sm mb-4">
              {method === 'asset'
                ? 'Enter the unique asset identifier to look up the credential on-chain.'
                : 'Enter the policy ID to find all credentials issued under that policy.'
              }
            </p>
            <input type="text" className="input font-mono text-sm" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={method === 'asset' ? 'Enter asset ID (hex)…' : 'Enter policy ID (hex)…'}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />

            <button onClick={handleSearch} disabled={loading} className="btn-accent w-full mt-4">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Searching…
                </span>
              ) : (
                <>
                  Verify
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </>
              )}
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 bg-[#fde8e8] border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single asset result */}
      {singleResult && <ResultCard meta={singleResult} />}

      {/* Policy results — show ALL credentials */}
      {policyAssets && (
        <PolicyResultsList
          assets={policyAssets}
          onSelect={handleSelectAsset}
          selectedAsset={selectedAsset}
          selectedMeta={selectedMeta}
          loadingAsset={loadingAsset}
          policyId={query}
        />
      )}
    </div>
  );
}
