import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchAssetMetadata,
  fetchAssetsByPolicy,
  hexToString,
} from '../utils/cardano';
import { hashFile } from '../utils/hashFile';
import { extractDocumentText, hashDocumentText } from '../utils/ocrDocument';
import { AUTHORIZED_ISSUERS, DEMO_MODE } from '../utils/authorizedWallets';
import ParticleNetwork from './ParticleNetwork';

/* ── Pill Tabs ────────────────────────────────────────────────── */
function MethodTabs({ selected, onChange }) {
  const methods = [
    { id: 'asset', label: 'Asset ID' },
    { id: 'policy', label: 'Policy ID' },
    { id: 'hash', label: 'File Hash' },
    { id: 'scan', label: '📷 Doc Scan' },
  ];
  return (
    <div className="flex gap-1 p-1 bg-[#f0f0f0] rounded-full w-fit mx-auto mb-8">
      {methods.map((m) => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={`px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all ${selected === m.id
            ? 'bg-[#16a34a] text-white shadow-md'
            : 'text-[#333] hover:text-black hover:bg-black/5'
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
  { key: 'textHash', label: 'OCR Text Hash' },
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

  // Document scan (OCR)
  const [ocrProgress, setOcrProgress] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrTextHash, setOcrTextHash] = useState('');
  const [ocrError, setOcrError] = useState('');
  const [scanAssetId, setScanAssetId] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const scanFileRef = useRef(null);

  // Derive the active credential metadata (from single result or selected policy asset)
  const activeMeta = singleResult || selectedMeta;

  const resetResults = () => {
    setSingleResult(null);
    setPolicyAssets(null);
    setSelectedAsset(null);
    setSelectedMeta(null);
    setHashMatch(null);
    setError('');
    setOcrProgress(null);
    setOcrText('');
    setOcrTextHash('');
    setOcrError('');
    setScanAssetId('');
    setScanResult(null);
    setScanLoading(false);
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

  // ── Document Scan: OCR upload ──────────────────────────────────
  const handleScanUpload = useCallback(async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setOcrProgress({ status: 'initializing', progress: 0 });
    setOcrText('');
    setOcrTextHash('');
    setOcrError('');
    setScanResult(null);

    try {
      const text = await extractDocumentText(f, (p) => setOcrProgress(p));
      setOcrText(text);
      if (text.trim()) {
        const tHash = hashDocumentText(text);
        setOcrTextHash(tHash);
      }
      setOcrProgress(null);
    } catch (err) {
      setOcrError(err.message);
      setOcrProgress(null);
    }
  }, []);

  // ── Document Scan: compare against on-chain ───────────────────
  const handleScanVerify = async () => {
    if (!scanAssetId.trim()) { setError('Enter an asset ID to compare against'); return; }
    if (!ocrTextHash) { setError('Upload and scan a document first'); return; }
    setScanLoading(true);
    setError('');
    setScanResult(null);

    try {
      const meta = await fetchAssetMetadata(scanAssetId.trim());
      if (!meta) {
        setError('No credential found for this asset ID.');
        setScanLoading(false);
        return;
      }
      setScanResult({
        meta,
        match: meta.textHash === ocrTextHash,
        onChainHash: meta.textHash || '',
        scannedHash: ocrTextHash,
      });
    } catch (err) {
      setError(err.message || 'Lookup failed');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleNetwork particleCount={60} colors={['#3b82f6', '#8b5cf6', '#06b6d4', '#6366f1']} />
      <div className="relative z-10 page-enter mx-auto max-w-2xl px-6 py-16">
        <p className="label-text mb-2">Public Verification</p>
        <h1 className="display-md mb-2">Verify Credential</h1>
        <p className="body-sm mb-8">
          Verify any government-issued credential.
          <strong> No wallet or registration required.</strong>
        </p>

        <MethodTabs selected={method} onChange={(m) => { setMethod(m); resetResults(); setQuery(''); }} />

        <div className="card-elevated p-8">
          {method === 'scan' ? (
            <>
              <h2 className="text-lg font-bold mb-2 text-[#111]">Verify by Document Scan</h2>
              <p className="body-sm mb-4">
                Upload a photo or scan of a paper certificate. OCR will extract the text and match it against the on-chain record.
              </p>
              <div className="bg-[#fff3e0] border-2 border-[#f57c00] rounded-lg px-4 py-3 text-sm text-[#4e2a00] mb-4">
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 shrink-0 mt-0.5 text-[#e65100]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <div>
                    <p className="font-bold text-[#bf360c]">⏱ Processing Time</p>
                    <p className="text-xs mt-0.5 text-[#4e2a00]">OCR scanning may take 5–10 seconds. For best results, use a clear, well-lit photo of the certificate.</p>
                  </div>
                </div>
              </div>

              {/* Upload area */}
              <div className={`dropzone ${ocrText ? 'has-file' : ''}`}
                onClick={() => scanFileRef.current?.click()}>
                <input ref={scanFileRef} type="file" className="hidden" onChange={handleScanUpload}
                  accept=".png,.jpg,.jpeg,.webp" />
                {ocrText && !ocrProgress ? (
                  <div>
                    <svg className="mx-auto h-8 w-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-semibold text-sm">Document Scanned Successfully</p>
                    <p className="text-xs text-green-600 mt-1 font-mono break-all">Text Hash: {ocrTextHash}</p>
                  </div>
                ) : ocrProgress ? (
                  <div>
                    <div className="h-5 w-5 mx-auto mb-2 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-blue-600">Scanning document text… {ocrProgress.progress}%</p>
                    <div className="w-48 mx-auto mt-2 bg-blue-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${ocrProgress.progress}%` }} />
                    </div>
                    <p className="text-[11px] text-blue-400 mt-2">⏱ This may take a few seconds…</p>
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto h-8 w-8 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-500">Upload photo of certificate</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — take a clear photo</p>
                  </div>
                )}
              </div>

              {/* OCR Error */}
              {ocrError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  ⚠️ {ocrError}
                </div>
              )}

              {/* Extracted text preview */}
              {ocrText && !ocrProgress && (
                <div className="mt-4 p-4 bg-[#f8f8f8] border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Extracted Text</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">OCR Complete</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                    {ocrText.slice(0, 500)}{ocrText.length > 500 ? '…' : ''}
                  </div>
                </div>
              )}

              {/* Asset ID lookup */}
              {ocrTextHash && (
                <div className="mt-4 space-y-3">
                  <label className="text-sm font-semibold text-[#111]">Enter Asset ID to compare</label>
                  <input type="text" className="input font-mono text-sm" value={scanAssetId}
                    onChange={(e) => setScanAssetId(e.target.value)}
                    placeholder="Enter asset ID (hex)…"
                    onKeyDown={(e) => e.key === 'Enter' && handleScanVerify()} />
                  <button onClick={handleScanVerify} disabled={scanLoading} className="btn-accent w-full">
                    {scanLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Verifying…
                      </span>
                    ) : (
                      <>
                        Verify Document
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Scan Verification Result */}
              {scanResult && (
                <div className={`mt-4 p-4 rounded-xl border-2 ${scanResult.match
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
                  }`}>
                  <div className="flex items-start gap-3">
                    {scanResult.match ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 shrink-0">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 shrink-0">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className={`font-bold text-base ${scanResult.match ? 'text-green-700' : 'text-red-700'}`}>
                        {scanResult.match ? '✅ Document Verified!' : '❌ Document Not Recognized'}
                      </h3>
                      <p className={`text-sm mt-1 ${scanResult.match ? 'text-green-600' : 'text-red-600'}`}>
                        {scanResult.match
                          ? 'The scanned text matches the on-chain credential record. This document is authentic.'
                          : scanResult.onChainHash
                            ? 'The scanned text does NOT match the on-chain record. This document may be altered or fraudulent.'
                            : 'This credential was issued before OCR scanning was available. Use the File Hash tab instead.'}
                      </p>
                      {scanResult.onChainHash && (
                        <div className="mt-3 space-y-1">
                          <p className="text-[11px] text-gray-500 font-mono">On-chain: {scanResult.onChainHash.slice(0, 16)}…</p>
                          <p className="text-[11px] text-gray-500 font-mono">Scanned: {scanResult.scannedHash.slice(0, 16)}…</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Show credential details if found */}
              {scanResult?.meta && <ResultCard meta={scanResult.meta} />}
            </>
          ) : method === 'hash' ? (
            <>
              <h2 className="text-lg font-bold mb-2 text-[#111]">Verify by Document</h2>
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

                    {/* Automatic Comparison */}
                    {activeMeta ? (
                      <div className={`mt-4 p-3 rounded-lg border ${activeMeta.documentHash === hashMatch.hash
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                        <div className="flex gap-2">
                          {activeMeta.documentHash === hashMatch.hash ? (
                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          )}
                          <div>
                            <p className="font-bold text-sm">
                              {activeMeta.documentHash === hashMatch.hash ? 'Match Verified' : 'Hash Mismatch'}
                            </p>
                            <p className="text-xs mt-1">
                              {activeMeta.documentHash === hashMatch.hash
                                ? 'This file matches the on-chain credential record.'
                                : `Does not match the currently loaded credential (Hash: ${activeMeta.documentHash?.slice(0, 8)}...).`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-3">
                        Compare this hash against the credential's on-chain <code>documentHash</code> field.
                        <br />
                        <span className="italic text-gray-400">(Tip: Find a credential in the other tabs first to compare automatically)</span>
                      </p>
                    )}
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
              <h2 className="text-lg font-bold mb-2 text-[#111]">
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
    </div>
  );
}
