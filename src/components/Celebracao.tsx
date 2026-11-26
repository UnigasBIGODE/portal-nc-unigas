import { motion } from 'framer-motion';

/** Check animado e discreto: o círculo se desenha e depois o visto. */
export function SucessoAnimado() {
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      <motion.span className="absolute inset-0 rounded-full bg-success/15" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.6, 1.08, 1], opacity: [0, 1, 1] }} transition={{ duration: 0.6 }} />
      <svg viewBox="0 0 52 52" className="relative h-20 w-20" aria-hidden>
        <circle cx="26" cy="26" r="24" fill="none" stroke="rgb(var(--success))" strokeWidth="3" pathLength={1} strokeDasharray={1} strokeDashoffset={1} transform="rotate(-90 26 26)" style={{ animation: 'draw 0.6s ease-out forwards' }} />
        <path d="M15 27 l7 7 l15 -16" fill="none" stroke="rgb(var(--success))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} style={{ animation: 'draw 0.4s ease-out 0.5s forwards' }} />
      </svg>
    </div>
  );
}

