import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tipo = 'sucesso' | 'erro' | 'info';
interface Toast { id: number; tipo: Tipo; titulo: string; descricao?: string }

const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});
export const useToast = () => useContext(Ctx);

const ICONES = {
  sucesso: { icon: CheckCircle2, cls: 'text-success bg-success/10', barra: 'bg-success' },
  erro: { icon: AlertTriangle, cls: 'text-danger bg-danger/10', barra: 'bg-danger' },
  info: { icon: Info, cls: 'text-info bg-info/10', barra: 'bg-info' },
};
const DURACAO = 4500;

/** Notificações de confirmação (canto inferior direito), com entrada/saída animadas. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const remover = useCallback((id: number) => setLista((l) => l.filter((t) => t.id !== id)), []);
  const mostrar = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Date.now() + Math.random();
      setLista((l) => [...l.slice(-3), { ...t, id }]);
      setTimeout(() => remover(id), DURACAO);
    },
    [remover],
  );
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        <AnimatePresence initial={false}>
          {lista.map((t) => {
            const I = ICONES[t.tipo];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="pointer-events-auto relative overflow-hidden rounded-2xl border border-line bg-card p-4 pr-10 shadow-pop"
                role="status"
              >
                <div className="flex gap-3">
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', I.cls)}>
                    <I.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold">{t.titulo}</p>
                    {t.descricao && <p className="mt-0.5 text-[13px] text-muted">{t.descricao}</p>}
                  </div>
                </div>
                <button onClick={() => remover(t.id)} className="absolute right-3 top-3 rounded-full p-1 text-muted transition-colors hover:bg-elevated hover:text-fg" aria-label="Fechar">
                  <X className="h-3.5 w-3.5" />
                </button>
                <motion.span
                  className={cn('absolute bottom-0 left-0 h-[3px]', I.barra)}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: DURACAO / 1000, ease: 'linear' }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
