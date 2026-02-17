import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Component, Suspense, lazy, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion';


const IssueCertificate = lazy(() => import('./components/IssueCertificate'));
const VerifyCertificate = lazy(() => import('./components/VerifyCertificate'));

/* ── MeshWrapper ──────────────────────────────────────────────── */
function MeshWrapper({ children }) {
  const [Provider, setProvider] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    import('@meshsdk/react')
      .then((m) => setProvider(() => m.MeshProvider))
      .catch(setErr);
  }, []);
  if (err) return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="card p-10 text-center max-w-md">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold">SDK Load Error</h1>
        <p className="mt-2 body-sm">{err.message}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-6">Retry</button>
      </div>
    </div>
  );
  if (!Provider) return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#16a34a] animate-spin" />
        <p className="mt-4 text-sm text-gray-400 font-medium">Loading EduCred…</p>
      </div>
    </div>
  );
  return <Provider>{children}</Provider>;
}

/* ── ErrorBoundary ────────────────────────────────────────────── */
class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, i) { console.error('Error:', e, i); }
  render() {
    if (this.state.hasError) return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="card p-10 text-center max-w-md">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 body-sm">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-6">Reload</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

/* ── Reveal on Scroll (slide up + fade) ───────────────────────── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ── Animated Counter ─────────────────────────────────────────── */
function AnimatedCounter({ value, suffix = '', duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    // Check if value is a number
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      setDisplay(value);
      return;
    }
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    function tick() {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = numericValue * eased;
      if (Number.isInteger(numericValue)) {
        setDisplay(Math.round(current).toString());
      } else {
        setDisplay(current.toFixed(1));
      }
      if (progress < 1) requestAnimationFrame(tick);
    }
    tick();
  }, [inView, value, duration]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ── Tilt Card ────────────────────────────────────────────────── */
function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 30 });

  function handleMouse(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleLeave() { x.set(0); y.set(0); }

  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={className}>
      {children}
    </motion.div>
  );
}



/* ── Marquee ──────────────────────────────────────────────────── */
function TechMarquee() {
  const items = ['Cardano', 'CIP-25', 'SHA-256', 'NFT', 'CIP-30', 'Blockfrost', 'React', 'CSL', 'CBOR', 'Preprod'];
  return (
    <div className="overflow-hidden py-5 border-y border-gray-100 bg-white">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
        className="flex gap-12 whitespace-nowrap"
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-[12px] font-semibold tracking-widest uppercase text-gray-300">
            {item}
            <span className="mx-6 text-gray-200">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Navbar ────────────────────────────────────────────────────── */
function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/verify', label: 'Verify' },
    { to: '/issue', label: 'Issue' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)]' : 'bg-transparent'
      }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div whileHover={{ rotate: 12, scale: 1.1 }} transition={{ type: 'spring', stiffness: 400 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#16a34a] text-[10px] font-bold text-white tracking-wider">
            EC
          </motion.div>
          <div className="leading-tight">
            <span className="text-base font-bold tracking-tight text-[#111]">EduCred</span>
            <span className="text-[10px] text-gray-400 font-medium tracking-wide block">by Lemayan Leleina</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to}
                className={`text-[13px] font-medium tracking-wide transition-colors relative ${active ? 'text-[#111]' : 'text-[#999] hover:text-[#555]'
                  }`}>
                {label.toUpperCase()}
                {active && (
                  <motion.div layoutId="navIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#16a34a] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center">
          <span className="tag tag-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a] animate-pulse" />
            Preprod Testnet
          </span>
        </div>

        <button className="md:hidden p-2 text-gray-500" onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            }
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100 md:hidden bg-white">
            <div className="px-6 py-4 space-y-1">
              {navLinks.map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                  className={`block py-3 text-sm font-medium ${location.pathname === to ? 'text-[#111]' : 'text-gray-400'}`}>
                  {label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

/* ── HOME ─────────────────────────────────────────────────────── */

/* RotatingTypewriter — continuously cycles through phrases with type + erase */
const ROTATING_PHRASES = [
  { text: 'reimagined.', color: '#16a34a' },
  { text: 'verified instantly.', color: '#6366f1' },
  { text: 'tamper-proof.', color: '#06b6d4' },
  { text: 'built by NomadxCoder.', color: '#f59e0b' },
  { text: 'powered by Cardano.', color: '#8b5cf6' },
  { text: 'borderless.', color: '#ec4899' },
];

function RotatingTypewriter({ phrases = ROTATING_PHRASES, typeSpeed = 50, eraseSpeed = 30, pauseAfterType = 2000, pauseAfterErase = 400 }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let timeout;

    if (!isErasing) {
      // Typing
      if (displayed.length < current.text.length) {
        timeout = setTimeout(() => {
          setDisplayed(current.text.slice(0, displayed.length + 1));
        }, typeSpeed + Math.random() * 30); // slight randomness for human feel
      } else {
        // Finished typing — pause then start erasing
        timeout = setTimeout(() => setIsErasing(true), pauseAfterType);
      }
    } else {
      // Erasing
      if (displayed.length > 0) {
        timeout = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, eraseSpeed);
      } else {
        // Finished erasing — move to next phrase
        timeout = setTimeout(() => {
          setPhraseIdx((phraseIdx + 1) % phrases.length);
          setIsErasing(false);
        }, pauseAfterErase);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayed, isErasing, phraseIdx, phrases, typeSpeed, eraseSpeed, pauseAfterType, pauseAfterErase]);

  const currentColor = phrases[phraseIdx].color;

  return (
    <span>
      <span style={{ color: currentColor, transition: 'color 0.3s' }}>{displayed}</span>
      <span
        className="inline-block w-[3px] ml-0.5 align-middle"
        style={{
          height: '0.85em',
          background: currentColor,
          animation: 'blink 0.8s step-end infinite',
          transition: 'background 0.3s',
        }}
      />
    </span>
  );
}

/* ── CardanoBadge — simple refined look ──── */
function CardanoBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="inline-block mb-8"
    >
      <div className="cardano-badge-pill">
        <span className="cardano-badge-ada">₳</span>
        <span className="cardano-badge-label">Built on Cardano Blockchain</span>
        <span className="cardano-badge-dot" />
      </div>
    </motion.div>
  );
}

import ConfettiField from './components/ConfettiField';

/* ── Home ─────────────────────────────────────────────────────── */
function Home() {
  return (
    <div className="overflow-hidden">

      {/* ── HERO ── */}
      <section className="relative flex items-center justify-center" style={{ minHeight: '92vh', paddingTop: '40px', paddingBottom: '60px' }}>
        <ConfettiField particleCount={250} />

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <CardanoBadge />

          <motion.h1 initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="display-lg">
            Academic credentials,
            <br />
            <RotatingTypewriter />
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mx-auto mt-8 max-w-2xl text-lg text-gray-500 leading-relaxed">
            EduCred transforms how educational certificates are issued and verified.
            Tamper-proof credentials stored as NFTs on the Cardano blockchain —
            eliminating forgery, removing middlemen, and enabling instant verification worldwide.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/issue" className="btn-accent">
              Issue Credential
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link to="/verify" className="btn-outline">
              Verify a Certificate
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Tech marquee strip */}
      <TechMarquee />

      {/* ── WHAT IS EDUCRED ── */}
      <section className="relative py-28 px-6">
        <div className="relative z-10 mx-auto max-w-4xl">
          <Reveal><p className="label-text mb-4">What is EduCred?</p></Reveal>
          <Reveal delay={0.1}>
            <h2 className="display-lg mb-8">
              A blockchain-powered system
              <br />
              <span className="text-gray-300">for educational credentials.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mb-6">
              Traditional paper certificates can be forged, lost, or damaged. Verifying them means
              days of emails and phone calls to university registrar offices. Employers can't easily
              trust what they can't easily verify.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">
              EduCred solves this by minting each certificate as an <strong className="text-[#111]">NFT on the Cardano blockchain</strong>.
              A SHA-256 hash of the original document is permanently stored on-chain alongside metadata
              like the student's name, course, and institution. Anyone can verify a credential
              in seconds — <strong className="text-[#111]">no calls, no emails, no waiting</strong>.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="label-text text-center mb-6">How it works</p>
            <h2 className="display-lg text-center mb-20">Two roles. One system.</h2>
          </Reveal>

          {[
            {
              num: '01',
              title: 'Government Issues Credentials',
              desc: 'Authorized officials connect their government wallet, fill in student details, upload the certificate, and mint a tamper-proof NFT on the Cardano blockchain.',
              detail: 'Only whitelisted wallets can access the issuer portal. Each credential includes student name, course, institution, registration number, grade, and a SHA-256 document hash.',
              icon: <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
            },
            {
              num: '02',
              title: 'Anyone Verifies Instantly',
              desc: 'Employers, universities, or any member of the public can verify a certificate in seconds. No wallet required. No registration. No fees.',
              detail: 'Enter the asset ID, policy ID, or upload the original document to check its hash against the blockchain record.',
              icon: <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
            },
            {
              num: '03',
              title: 'Trust is Permanent',
              desc: 'Once issued, a credential exists permanently on the blockchain. It cannot be altered, deleted, or forged.',
              detail: 'Even if the issuing institution closes, the credential remains verifiable forever. This is decentralized, immutable record-keeping.',
              icon: <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>,
            },
          ].map((step, i) => (
            <Reveal key={step.num} delay={0.15 * i}>
              <TiltCard className={`flex flex-col md:flex-row gap-8 md:gap-12 items-start p-8 md:p-12 rounded-2xl transition-shadow ${i < 2 ? 'mb-6' : ''
                } bg-[#fafafa] hover:shadow-lg`}>
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-6xl font-bold tracking-tight text-accent mb-3"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {step.num}
                  </span>
                  <div className="h-12 w-12 rounded-xl bg-[#e8f5e9] flex items-center justify-center text-[#16a34a]">
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-[#111] mb-3">{step.title}</h3>
                  <p className="text-base text-gray-500 leading-relaxed mb-3">{step.desc}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.detail}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TRUST NUMBERS — animated counters ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-5xl">
          <Reveal>
            <p className="label-text text-center mb-6">By the numbers</p>
            <h2 className="display-lg text-center mb-16">
              Built for trust.
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 'CIP-25', label: 'NFT Standard', numeric: false },
              { value: '0.2', label: 'ADA Per Credential', suffix: '₳', numeric: true },
              { value: 'SHA-256', label: 'Document Hash', numeric: false },
              { value: '100', label: 'Institutions', suffix: '+', numeric: true },
            ].map((s, i) => (
              <Reveal key={s.label} delay={0.1 * i}>
                <div className="text-center p-8 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300">
                  <p className="stat-number" style={{ color: '#16a34a' }}>
                    {s.numeric ? (
                      <AnimatedCounter value={s.value} suffix={s.suffix || ''} duration={2} />
                    ) : (
                      s.value
                    )}
                  </p>
                  <p className="stat-label mt-3">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — tilt cards ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <ConfettiField particleCount={120} />
        <div className="relative z-10 mx-auto max-w-5xl">
          <Reveal>
            <p className="label-text text-center mb-6">Under the Hood</p>
            <h2 className="display-lg text-center mb-6">
              Everything you need.
              <br />
              <span className="text-gray-300">Nothing you don't.</span>
            </h2>
            <p className="text-center text-gray-500 max-w-xl mx-auto mb-16">
              EduCred runs entirely in your browser. No backend servers, no databases.
              Your data stays with you.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: '🛡️', title: 'Tamper-Proof Records', desc: 'Document hashes stored permanently on Cardano. Any modification is instantly detectable.' },
              { icon: '🔐', title: 'Access Controlled', desc: 'Only authorized government wallets can issue. The public verifies freely — no wallet needed.' },
              { icon: '⚡', title: 'Instant Verification', desc: 'Verify a credential in seconds — by asset ID, policy ID, or document upload.' },
              { icon: '🌍', title: 'Globally Recognized', desc: 'Blockchain credentials work across borders. No apostille required for international verification.' },
              { icon: '💰', title: 'Minimal Cost', desc: 'Each credential costs ~0.2 ADA. Affordable at national scale for millions of students.' },
              { icon: '🧊', title: 'Fully Decentralized', desc: 'No centralized servers. Everything runs in-browser and interacts directly with Cardano.' },
            ].map((f, i) => (
              <Reveal key={f.title} delay={0.08 * i}>
                <TiltCard className="card p-8 h-full cursor-default">
                  <motion.span
                    className="text-3xl mb-5 block"
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    {f.icon}
                  </motion.span>
                  <h3 className="text-lg font-bold text-[#111] mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="rule-dots"><span /><span /><span /></div>

      {/* ── STAKEHOLDERS ── */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="label-text text-center mb-6">Who it's for</p>
            <h2 className="display-lg text-center mb-16">Built for every stakeholder.</h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { emoji: '🏛️', title: 'Government & Ministries', desc: 'Issue verifiable credentials at national scale. Protect the integrity of the education system and reduce credential fraud.' },
              { emoji: '📋', title: 'Examination Bodies', desc: 'Digitize exam results and certifications as blockchain credentials. Eliminate manual verification that takes weeks.' },
              { emoji: '🎓', title: 'Students & Graduates', desc: 'Receive permanent, portable digital credentials. Share verifiable qualifications with any employer worldwide.' },
              { emoji: '💼', title: 'Employers & HR Teams', desc: 'Verify qualifications in seconds. Eliminate the risk of fraudulent certificates. Free, instant, 24/7.' },
            ].map((uc, i) => (
              <Reveal key={uc.title} delay={0.1 * i}>
                <TiltCard className="card p-8 h-full cursor-default">
                  <motion.span className="text-3xl mb-4 block"
                    whileHover={{ scale: 1.2 }} transition={{ type: 'spring', stiffness: 400 }}>
                    {uc.emoji}
                  </motion.span>
                  <h3 className="text-lg font-bold text-[#111] mb-2">{uc.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{uc.desc}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-28 px-6 bg-[#fafafa]">
        <div className="mx-auto max-w-4xl">
          <Reveal><p className="label-text mb-4">Architecture</p></Reveal>
          <Reveal delay={0.1}><h2 className="display-lg mb-12">How it's built.</h2></Reveal>
          <div className="space-y-0">
            {[
              { label: 'Frontend', value: 'React 18 + Vite', detail: 'Client-side SPA — no backend servers required' },
              { label: 'Blockchain', value: 'Cardano (Preprod → Mainnet)', detail: 'Native tokens (NFTs), CIP-25 metadata standard' },
              { label: 'Access Control', value: 'Stake Key Hash Whitelist', detail: 'Only registered government wallet hashes can mint' },
              { label: 'Serialization', value: 'CSL (Cardano Serialization Lib)', detail: 'Direct CBOR transaction building — zero server dependency' },
              { label: 'API', value: 'Blockfrost', detail: 'Read-only blockchain queries for UTXOs and asset metadata' },
              { label: 'Wallet', value: 'CIP-30 Compatible', detail: 'Lace, Eternl, Nami, Flint, Typhon — any CIP-30 wallet' },
              { label: 'Hashing', value: 'SHA-256 (Web Crypto API)', detail: 'Document hashing runs entirely in-browser' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={0.05 * i}>
                <motion.div whileHover={{ x: 8 }} transition={{ type: 'spring', stiffness: 400 }}
                  className="flex flex-col md:flex-row md:items-start gap-2 md:gap-8 py-5 border-b border-gray-100 cursor-default">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 md:w-32 shrink-0 pt-1">{item.label}</span>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-[#111]">{item.value}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{item.detail}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <ConfettiField particleCount={140} />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="display-lg mb-6">
              Ready to issue your first
              <br />
              blockchain credential?
            </h2>
            <p className="text-lg text-gray-500 mb-12 max-w-lg mx-auto">
              It takes less than a minute. Connect your wallet, fill in the details, and mint.
              Your credential will be permanently recorded on the Cardano blockchain.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link to="/issue" className="btn-accent">
                  Get Started
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link to="/verify" className="btn-outline">
                  Verify a Certificate
                </Link>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* ── Spinner ──────────────────────────────────────────────────── */
function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-40">
      <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-[#16a34a] animate-spin" />
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ErrorBoundary>
      <MeshWrapper>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen flex flex-col bg-[#fafafa]">
            <Navbar />
            <main className="flex-1" style={{ paddingTop: '64px' }}>
              <Suspense fallback={<PageSpinner />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/issue" element={<IssueCertificate />} />
                  <Route path="/verify" element={<VerifyCertificate />} />
                </Routes>
              </Suspense>
            </main>

            <footer className="border-t border-gray-100 py-8 mt-auto bg-white">
              <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#16a34a] text-[7px] font-bold text-white">
                    EC
                  </div>
                  <span className="text-xs text-gray-400">
                    © {new Date().getFullYear()} EduCred · Created by Lemayan Leleina
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Cardano Preprod
                  </span>
                  <span>·</span>
                  <span>Powered by Cardano</span>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </MeshWrapper>
    </ErrorBoundary>
  );
}
