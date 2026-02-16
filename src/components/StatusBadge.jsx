import { motion, AnimatePresence } from 'framer-motion';

/**
 * StatusBadge — stunning VALID / INVALID verification result with animations.
 */
export default function StatusBadge({ valid, metadata }) {
  if (valid === null || valid === undefined) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className={`relative mt-6 overflow-hidden rounded-2xl border-2 p-8 text-center ${
          valid
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}
      >
        {/* Background glow */}
        <div className={`absolute inset-0 ${
          valid
            ? 'bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent'
            : 'bg-gradient-to-b from-red-500/10 via-transparent to-transparent'
        }`} />

        {/* Animated icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className={`relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
            valid ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}
        >
          {valid && (
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
          )}
          {valid ? (
            <motion.svg
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="h-10 w-10 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              />
            </motion.svg>
          ) : (
            <svg className="h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`relative text-2xl font-bold ${valid ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {valid ? 'VALID CERTIFICATE' : 'INVALID CERTIFICATE'}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`relative mt-2 text-sm ${valid ? 'text-emerald-300/70' : 'text-red-300/70'}`}
        >
          {valid
            ? 'The document hash matches the on-chain record.'
            : 'The document hash does NOT match the on-chain record.'}
        </motion.p>

        {/* Metadata details */}
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative mx-auto mt-6 max-w-md space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-left text-sm"
          >
            {metadata.studentName && <Row label="Student" value={metadata.studentName} />}
            {metadata.course && <Row label="Course" value={metadata.course} />}
            {metadata.issuer && <Row label="Issuer" value={truncate(metadata.issuer, 20)} />}
            {metadata.issueDate && <Row label="Issue Date" value={metadata.issueDate} />}
            {metadata.documentHash && (
              <Row label="Document Hash" value={truncate(metadata.documentHash, 24)} mono />
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/[0.02] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <span className={`text-white ${mono ? 'font-mono text-xs' : 'text-sm'} break-all text-right`}>
        {value}
      </span>
    </div>
  );
}

function truncate(str, maxLen = 20) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen / 2)}...${str.slice(-maxLen / 2)}`;
}
