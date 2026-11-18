/**
 * Primitivas de animação (Framer Motion) usadas em todo o portal.
 * Todas respeitam "reduzir movimento" do sistema via <MotionConfig reducedMotion="user">.
 */
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

export const EASE = [0.2, 0.8, 0.2, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const stagger = (passo = 0.07, atraso = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: passo, delayChildren: atraso } },
});

/** Revela o conteúdo quando ele entra na tela (rolagem). */
export function Reveal({ children, atraso = 0, className, y = 22, ...p }: { children: ReactNode; atraso?: number; className?: string; y?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: EASE, delay: atraso }}
      {...p}
    >
      {children}
    </motion.div>
  );
}

/** Container que anima os filhos <Item> em sequência. */
export function Stagger({ children, className, passo = 0.07, atraso = 0, ...p }: { children: ReactNode; className?: string; passo?: number; atraso?: number } & HTMLMotionProps<'div'>) {
  return (
    <motion.div className={className} variants={stagger(passo, atraso)} initial="hidden" animate="show" {...p}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className, ...p }: { children: ReactNode; className?: string } & HTMLMotionProps<'div'>) {
  return (
    <motion.div className={className} variants={fadeUp} {...p}>
      {children}
    </motion.div>
  );
}
