import { motion } from 'framer-motion';

/** Check animado: círculo que se desenha, depois o visto, com confete da marca. */
export function SucessoAnimado() {
  const pecas = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="relative mx-auto grid h-28 w-28 place-items-center">
      {pecas.map((i) => {
        const ang = (i / pecas.length) * Math.PI * 2;
        const dist = 70 + (i % 3) * 14;
        const cores = ['#E30613', '#22C55E', '#F5A524', '#111318'];
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-[2px]"
            style={{ background: cores[i % cores.length] }}
            initial={{ x: -4, y: -4, opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{ x: Math.cos(ang) * dist - 4, y: Math.sin(ang) * dist - 4, opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.6], rotate: 180 + i * 20 }}
            transition={{ duration: 1.1, delay: 0.45, ease: 'easeOut' }}
          />
        );
      })}
      <motion.span className="absolute inset-0 rounded-full bg-success/15" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.25, 1], opacity: [0, 1, 1] }} transition={{ duration: 0.7 }} />
      <svg viewBox="0 0 52 52" className="relative h-20 w-20" aria-hidden>
        <circle cx="26" cy="26" r="24" fill="none" stroke="rgb(var(--success))" strokeWidth="3" pathLength={1} strokeDasharray={1} strokeDashoffset={1} transform="rotate(-90 26 26)" style={{ animation: 'draw 0.6s ease-out forwards' }} />
        <path d="M15 27 l7 7 l15 -16" fill="none" stroke="rgb(var(--success))" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} style={{ animation: 'draw 0.4s ease-out 0.5s forwards' }} />
      </svg>
    </div>
  );
}

