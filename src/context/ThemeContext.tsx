import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

type Tema = 'dark' | 'light';
const CHAVE_TEMA = 'unigas_tema_v2'; // tema claro é o padrão

interface ThemeCtx {
  tema: Tema;
  /** Alterna o tema. Com `origem` (ponto do clique), a troca acontece num círculo que se expande dali. */
  alternar: (origem?: { x: number; y: number }) => void;
  setTema: (t: Tema) => void;
}

const Ctx = createContext<ThemeCtx>({ tema: 'light', alternar: () => {}, setTema: () => {} });

function inicial(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function aplicarClasse(t: Tema) {
  const el = document.documentElement;
  el.classList.remove('dark', 'light');
  el.classList.add(t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0B0B0D' : '#F5F6F8');
  try {
    localStorage.setItem(CHAVE_TEMA, t);
  } catch {
    /* ignora */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaEstado] = useState<Tema>(inicial);
  useEffect(() => aplicarClasse(tema), [tema]);

  const setTema = useCallback((t: Tema) => {
    aplicarClasse(t);
    setTemaEstado(t);
  }, []);

  const alternar = useCallback(
    (origem?: { x: number; y: number }) => {
      const prox: Tema = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const trocar = () => {
        aplicarClasse(prox);
        flushSync(() => setTemaEstado(prox));
      };
      if (!doc.startViewTransition || reduz) return trocar();
      const x = origem?.x ?? window.innerWidth / 2, y = origem?.y ?? 0;
      const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const raiz = document.documentElement.style;
      raiz.setProperty('--vt-x', `${x}px`);
      raiz.setProperty('--vt-y', `${y}px`);
      raiz.setProperty('--vt-r', `${raio}px`);
      doc.startViewTransition(trocar);
    },
    [],
  );

  return <Ctx.Provider value={{ tema, setTema, alternar }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
