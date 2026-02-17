import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallet } from '@meshsdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  mintCertificateNFT,
  explorerTxUrl,
  getWalletAddress,
  isAuthorizedIssuer,
} from '../utils/cardano';
import { hashFile } from '../utils/hashFile';
import { extractDocumentText, hashDocumentText } from '../utils/ocrDocument';
import { searchInstitutions, ALL_INSTITUTIONS } from '../utils/kenyanInstitutions';
import ConnectWallet from './ConnectWallet';
import ParticleNetwork from './ParticleNetwork';

/* ── Step Indicator ───────────────────────────────────────────── */
function StepBar({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {Array.from({ length: total }, (_, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className={`step-circle ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
              {done ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < total - 1 && <div className={`step-line ${done ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Searchable Institution Dropdown ──────────────────────────── */
function InstitutionSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setResults(searchInstitutions(query));
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (inst) => {
    onChange(inst);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`input cursor-pointer flex items-center justify-between gap-2 ${open ? 'border-[#16a34a] shadow-[0_0_0_4px_rgba(22,163,74,0.08)] bg-white' : ''}`}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent outline-none text-[15px]"
            placeholder="Search institution…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
            }}
          />
        ) : (
          <span className={value ? 'text-[#111]' : 'text-[#ccc]'}>
            {value || 'Select institution…'}
          </span>
        )}
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No institutions found for "{query}"
                <button
                  className="block mx-auto mt-2 text-[#16a34a] font-medium text-xs hover:underline"
                  onClick={() => { onChange(query); setQuery(''); setOpen(false); }}
                >
                  Use "{query}" anyway →
                </button>
              </div>
            ) : (
              results.map((inst, i) => (
                <button key={inst + i}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-[#e8f5e9] transition-colors border-b border-gray-50 last:border-0 ${inst === value ? 'bg-[#e8f5e9] font-semibold text-[#16a34a]' : 'text-[#111]'
                    }`}
                  onClick={() => handleSelect(inst)}
                >
                  {inst}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function IssueCertificate() {
  const { wallet, connected } = useWallet();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Authorization
  const [authChecking, setAuthChecking] = useState(false);
  const [authResult, setAuthResult] = useState(null);

  // Form
  // Form
  const [certType, setCertType] = useState(null); // 'kcse' | 'university'
  const [programLevel, setProgramLevel] = useState(''); // Certificate, Diploma, Undergraduate, Postgraduate, PhD
  const [studentName, setStudentName] = useState('');
  const [course, setCourse] = useState('');
  const [institution, setInstitution] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState('');
  const [textHash, setTextHash] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [ocrError, setOcrError] = useState('');
  const fileInputRef = useRef(null);

  // Check authorization when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      setAuthChecking(true);
      isAuthorizedIssuer(wallet)
        .then(setAuthResult)
        .catch((err) => {
          console.error('[EduCred] Auth check error:', err);
          setAuthResult({ authorized: false, issuer: null, demoMode: false });
        })
        .finally(() => setAuthChecking(false));
    } else {
      setAuthResult(null);
    }
  }, [connected, wallet]);

  const handleFile = useCallback(async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setOcrProgress(null);
    setOcrText('');
    setOcrError('');
    setTextHash('');

    // 1. Hash the raw file (always)
    try {
      const hash = await hashFile(f);
      setFileHash(hash);
    } catch (err) {
      setError('Failed to hash file: ' + err.message);
    }

    // 2. Run OCR for image files
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (imageTypes.includes(f.type)) {
      try {
        setOcrProgress({ status: 'initializing', progress: 0 });
        const text = await extractDocumentText(f, (p) => setOcrProgress(p));
        setOcrText(text);
        if (text.trim()) {
          const tHash = hashDocumentText(text);
          setTextHash(tHash);
        }
        setOcrProgress(null);
      } catch (err) {
        setOcrError('OCR failed: ' + err.message);
        setOcrProgress(null);
      }
    }
  }, []);

  const handleMint = async () => {
    if (!wallet || !connected) { setError('Connect your wallet first'); return; }
    if (!authResult?.authorized) { setError('Your wallet is not authorized to issue credentials'); return; }
    if (!studentName.trim() || !course.trim() || !institution.trim()) {
      setError('Student name, course, and institution are required');
      return;
    }
    if (certType === 'university' && !programLevel) { setError('Select a Program Level'); return; }
    if (!grade) { setError(certType === 'kcse' ? 'Select a Grade' : 'Select Honors / Class'); return; }
    if (!fileHash) { setError('Upload a certificate document'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await mintCertificateNFT(wallet, {
        studentName: studentName.trim(),
        course: course.trim(),
        institution: institution.trim(),
        registrationNumber: registrationNumber.trim(),
        grade: grade.trim(),
        programLevel: programLevel.trim(),
        issuerInstitution: authResult?.issuer?.label || 'Government of Kenya',
        documentHash: fileHash,
        textHash: textHash,
        certType,
      });
      setResult(res);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Minting failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setResult(null); setError('');
    setCertType(null);
    setProgramLevel('');
    setStudentName(''); setCourse(''); setInstitution('');
    setRegistrationNumber(''); setGrade('');
    setFile(null); setFileHash(''); setTextHash('');
    setOcrProgress(null); setOcrText(''); setOcrError('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleNetwork particleCount={60} colors={['#16a34a', '#059669', '#06b6d4', '#6366f1']} />
      <div className="relative z-10 page-enter mx-auto max-w-2xl px-6 py-16">
        <p className="label-text mb-2">Government Issuer Portal</p>
        <h1 className="display-md mb-2">Issue Credential</h1>
        <p className="body-sm mb-8">Mint a tamper-proof academic credential on the Cardano blockchain.</p>

        {/* ── Step 0: Connect + Authorize ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="card-elevated p-8">
              <h2 className="text-lg font-bold mb-4">1. Connect Government Wallet</h2>
              <ConnectWallet />

              {connected && authChecking && (
                <div className="mt-4 flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-[#16a34a] animate-spin" />
                  Checking authorization…
                </div>
              )}

              {connected && authResult && !authChecking && (
                <div className="mt-4">
                  {authResult.authorized ? (
                    <>
                      <div className="gov-badge">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Authorized — {authResult.issuer?.label}
                      </div>
                      {authResult.demoMode && (
                        <div className="demo-banner mt-3">
                          ⚡ Demo Mode — Any wallet accepted for testing purposes
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="unauthorized-card mt-4">
                      <svg className="h-10 w-10 mx-auto mb-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <h3 className="text-lg font-bold text-red-500 mb-2">Unauthorized Wallet</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Only authorized government wallets can issue credentials.
                        Please connect a registered institutional wallet.
                      </p>
                      <p className="text-xs text-gray-400 mt-4">
                        If you are a government official and believe this is an error, contact system administration.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {authResult?.authorized && (
              <button onClick={() => setStep(1)} className="btn-accent w-full">
                Continue to Credential Details
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* ── Step 1: Certificate Type & Details ── */}
        {step === 1 && (
          <div className="space-y-6">
            <StepBar current={1} total={3} />

            {authResult?.demoMode && (
              <div className="demo-banner">
                ⚡ Demo Mode — Any wallet accepted for testing
              </div>
            )}

            {!certType ? (
              /* ── Type Selection ── */
              <div className="card-elevated p-8">
                <h2 className="text-lg font-bold mb-6 text-center">Select Certificate Type</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => { setCertType('kcse'); setGrade(''); setCourse('KCSE / KCPE'); }}
                    className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-[#16a34a] hover:bg-[#f0fdf4] transition-all group"
                  >
                    <svg className="h-10 w-10 mb-3 text-gray-400 group-hover:text-[#16a34a] group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                    <span className="font-bold text-[#111]">KCSE / KCPE</span>
                    <span className="text-xs text-gray-400 mt-1">Primary & Secondary</span>
                  </button>

                  <button
                    onClick={() => { setCertType('university'); setGrade(''); setCourse(''); }}
                    className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-[#16a34a] hover:bg-[#f0fdf4] transition-all group"
                  >
                    <svg className="h-10 w-10 mb-3 text-gray-400 group-hover:text-[#16a34a] group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.499 5.216 50.59 50.59 0 00-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                    </svg>
                    <span className="font-bold text-[#111]">University</span>
                    <span className="text-xs text-gray-400 mt-1">Degree & Diploma</span>
                  </button>
                </div>
                <div className="mt-6 text-center">
                  <button onClick={() => setStep(0)} className="text-sm text-gray-400 hover:text-[#111]">
                    ← Back to Wallet
                  </button>
                </div>
              </div>
            ) : (
              /* ── Details Form ── */
              <>
                <div className="card-elevated p-8 space-y-5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold">Credential Details</h2>
                    <span className="tag tag-neutral bg-gray-100 text-gray-500 font-medium px-3 py-1 rounded-full text-xs">
                      {certType === 'kcse' ? 'KCSE / KCPE' : 'University Credential'}
                    </span>
                  </div>

                  <div>
                    <label className="label">Student Full Name *</label>
                    <input type="text" className="input" placeholder="e.g. John Kamau Mwangi"
                      value={studentName} onChange={(e) => setStudentName(e.target.value)} />
                  </div>

                  {/* ── Details Form ── */}
                  {certType === 'university' && (
                    <div>
                      <label className="label">Program Level *</label>
                      <div className="relative">
                        <select
                          className="input appearance-none bg-white cursor-pointer"
                          value={programLevel}
                          onChange={(e) => setProgramLevel(e.target.value)}
                        >
                          <option value="" disabled>Select Level…</option>
                          <option value="Certificate">Certificate</option>
                          <option value="Diploma">Diploma</option>
                          <option value="Undergraduate">Undergraduate</option>
                          <option value="Postgraduate">Postgraduate</option>
                          <option value="PhD">PhD</option>
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {certType === 'university' && (
                    <div>
                      <label className="label">Course / Program *</label>
                      <input
                        type="text"
                        className="input"
                        placeholder={
                          programLevel === 'Certificate' ? 'e.g. Certificate in Business Management'
                            : programLevel === 'Diploma' ? 'e.g. Diploma in Computer Science'
                              : programLevel === 'Undergraduate' ? 'e.g. Bachelor of Science in Engineering'
                                : programLevel === 'Postgraduate' ? 'e.g. Master of Business Administration'
                                  : programLevel === 'PhD' ? 'e.g. Doctor of Philosophy in Economics'
                                    : 'e.g. Bachelor of Science in Computer Science'
                        }
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="label">Institution *</label>
                    {certType === 'kcse' ? (
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Alliance High School"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                      />
                    ) : (
                      <>
                        <InstitutionSelect value={institution} onChange={setInstitution} />
                        <p className="text-[11px] text-gray-400 mt-1.5">Search or select from 100+ Kenyan institutions</p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">{certType === 'kcse' ? 'Index Number' : 'Registration Number'}</label>
                      <input
                        type="text"
                        className="input"
                        placeholder={certType === 'kcse' ? "e.g. 22502203001" : "e.g. C026-01-0001/2022"}
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">{certType === 'kcse' ? 'Grade' : 'Honors / Class'}</label>
                      <div className="relative">
                        <select
                          className="input appearance-none bg-white cursor-pointer"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                        >
                          <option value="" disabled>Select {certType === 'kcse' ? 'Grade' : 'Class'}…</option>
                          {certType === 'kcse' ? (
                            <>
                              {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'].map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </>
                          ) : (
                            <>
                              <option value="First Class Honours">First Class Honours</option>
                              <option value="Second Class Honours (Upper Division)">Second Class Honours (Upper Division)</option>
                              <option value="Second Class Honours (Lower Division)">Second Class Honours (Lower Division)</option>
                              <option value="Pass">Pass</option>
                            </>
                          )}
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-elevated p-8">
                  <h2 className="text-lg font-bold mb-2">Certificate Document</h2>
                  <p className="body-sm mb-4">Upload the original certificate. A SHA-256 hash will be stored on-chain.</p>

                  <div
                    className={`dropzone ${file ? 'has-file' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile}
                      accept=".pdf,.png,.jpg,.jpeg,.webp" />
                    {file ? (
                      <div>
                        <svg className="mx-auto h-8 w-8 mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-semibold text-sm">{file.name}</p>
                        <p className="text-xs text-gray-400 mt-1 font-mono break-all">{fileHash}</p>
                        {textHash && (
                          <p className="text-xs text-green-600 mt-1 font-mono break-all">OCR Hash: {textHash}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <svg className="mx-auto h-8 w-8 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500">Click to upload certificate</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG — Max 10MB</p>
                      </div>
                    )}
                  </div>

                  {/* OCR Progress */}
                  {ocrProgress && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                        <span className="text-sm font-medium text-blue-700">
                          Scanning document text… {ocrProgress.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${ocrProgress.progress}%` }} />
                      </div>
                      <p className="text-[11px] text-blue-400 mt-2">⏱ OCR may take 5–10 seconds depending on image size</p>
                    </div>
                  )}

                  {/* OCR Error */}
                  {ocrError && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                      ⚠️ {ocrError} — The file hash will still be stored.
                    </div>
                  )}

                  {/* OCR Text Preview */}
                  {ocrText && !ocrProgress && (
                    <div className="mt-4 p-4 bg-[#f8f8f8] border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Extracted Document Text</span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">OCR Complete</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed">
                        {ocrText.slice(0, 500)}{ocrText.length > 500 ? '…' : ''}
                      </div>
                      {textHash && (
                        <p className="text-[11px] text-green-600 mt-2 font-mono break-all">
                          Text Hash: {textHash}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} className="tag-red px-4 py-3 rounded-lg text-sm">
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <button onClick={() => setCertType(null)} className="btn-outline flex-1">Back</button>
                  <button onClick={handleMint} disabled={loading} className="btn-accent flex-1">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Minting…
                      </span>
                    ) : (
                      <>
                        Mint Credential
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Success ── */}
        {step === 2 && result && (
          <div className="space-y-6">
            <StepBar current={3} total={3} />

            <div className="card-elevated p-10 text-center">
              <div className="check-pop mx-auto mb-6">
                <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <h2 className="display-md mb-2">Credential Issued!</h2>
              <p className="body-sm mb-8">
                The credential has been permanently recorded on the Cardano blockchain.
              </p>

              <div className="bg-[#f0f0f0] rounded-xl p-6 text-left space-y-4 mb-6">
                <div>
                  <span className="label-text">Student</span>
                  <p className="text-sm font-bold text-[#111] mt-1">{studentName}</p>
                </div>
                <div>
                  <span className="label-text">Course</span>
                  <p className="text-sm font-bold text-[#111] mt-1">{course}</p>
                </div>
                <div>
                  <span className="label-text">Institution</span>
                  <p className="text-sm font-bold text-[#111] mt-1">{institution}</p>
                </div>
                {registrationNumber && (
                  <div>
                    <span className="label-text">Registration Number</span>
                    <p className="text-sm font-bold text-[#111] mt-1">{registrationNumber}</p>
                  </div>
                )}
                {grade && (
                  <div>
                    <span className="label-text">Grade / Class</span>
                    <p className="text-sm font-bold text-[#111] mt-1">{grade}</p>
                  </div>
                )}
                <div>
                  <span className="label-text">Transaction Hash</span>
                  <p className="text-xs font-mono mt-1 break-all text-[#333]">{result.txHash}</p>
                </div>
                <div>
                  <span className="label-text">Asset Name</span>
                  <p className="text-sm font-bold text-[#111] mt-1">{result.assetName}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a href={explorerTxUrl(result.txHash)} target="_blank" rel="noreferrer" className="btn-outline flex-1">
                  View on Explorer
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
                <button onClick={reset} className="btn-accent flex-1">Issue Another</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
